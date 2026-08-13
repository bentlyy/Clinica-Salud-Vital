import { pool } from './db.js';
import { logger } from '../utils/logger.js';
import { toError } from '../utils/errors.js';

interface JobData {
  type: string;
  data: Record<string, unknown>;
  attempts?: number;
}

type JobHandler = (job: JobData) => Promise<void>;

const POLL_INTERVAL_MS = 2000;
const BACKOFF_DELAYS = [30_000, 120_000, 480_000];

class QueueService {
  private handlers = new Map<string, JobHandler>();
  private processorTimer: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  registerWorker(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async addJob(type: string, data: Record<string, unknown>): Promise<void> {
    const handler = this.handlers.get(type);
    if (!handler) {
      logger.warn(`QueueService: No handler registered for type "${type}"`);
      return;
    }

    await pool.query(
      `INSERT INTO jobs (type, data, status, next_retry_at)
       VALUES ($1, $2, 'pending', NOW())`,
      [type, JSON.stringify(data)],
    );
  }

  startProcessor(): void {
    if (this.processorTimer) return;
    this.processorTimer = setInterval(() => {
      if (!this.processing) this.poll();
    }, POLL_INTERVAL_MS);
    if (this.processorTimer.unref) this.processorTimer.unref();
    this.poll();
    logger.info('Queue processor started');
  }

  stopProcessor(): void {
    if (this.processorTimer) {
      clearInterval(this.processorTimer);
      this.processorTimer = null;
    }
  }

  async poll(): Promise<void> {
    this.processing = true;
    try {
      const { rows } = await pool.query(
        `UPDATE jobs
         SET    status = 'processing',
                started_at = NOW(),
                attempts = attempts + 1
         WHERE  id = (
           SELECT id FROM jobs
           WHERE  status = 'pending'
             AND  next_retry_at <= NOW()
           ORDER  BY next_retry_at ASC
           LIMIT  1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id, type, data, attempts`,
      );

      for (const row of rows) {
        this.processRow(row).catch((err) => {
          logger.error(`QueueService: Unexpected error processing job #${row.id}`, { error: toError(err).message });
        });
      }
    } catch (err) {
      logger.error('QueueService: poll query failed', { error: toError(err).message });
    } finally {
      this.processing = false;
    }
  }

  private async processRow(row: { id: number; type: string; data: Record<string, unknown>; attempts: number }): Promise<void> {
    const handler = this.handlers.get(row.type);
    if (!handler) {
      await pool.query(
        `UPDATE jobs SET status = 'dead', last_error = $1, completed_at = NOW() WHERE id = $2`,
        [`No handler registered for type "${row.type}"`, row.id],
      );
      return;
    }

    try {
      await handler({ type: row.type, data: row.data });
      await pool.query(
        `UPDATE jobs SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [row.id],
      );
    } catch (err) {
      const errorMsg = toError(err).message || String(err);
      const attempts = row.attempts;

      if (attempts >= 3) {
        await pool.query(
          `UPDATE jobs SET status = 'dead', last_error = $1, completed_at = NOW() WHERE id = $2`,
          [errorMsg, row.id],
        );
        logger.error(`Job #${row.id} "${row.type}" moved to dead after ${attempts} attempts`, { error: errorMsg });
      } else {
        const delayMs = BACKOFF_DELAYS[attempts - 1] ?? BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
        await pool.query(
          `UPDATE jobs
           SET    status = 'pending',
                  last_error = $1,
                  next_retry_at = NOW() + ($2 || ' ms')::INTERVAL
           WHERE  id = $3`,
          [errorMsg, String(delayMs), row.id],
        );
        logger.warn(`Job #${row.id} "${row.type}" failed (attempt ${attempts}/3), retry in ${delayMs / 1000}s`, { error: errorMsg });
      }
    }
  }
}

export const queueService = new QueueService();

export async function enqueueJob(type: string, data: Record<string, unknown>): Promise<void> {
  await queueService.addJob(type, data);
}

export function registerWorker(type: string, handler: JobHandler): void {
  queueService.registerWorker(type, handler);
}

export function registerWorkers(): void {
  const { registerWebhookWorker } = require('../modules/webhooks/webhooks.service.js') as typeof import('../modules/webhooks/webhooks.service.js');
  registerWebhookWorker();

  registerWorker('email:send', async (job) => {
    const { type: emailType, to, subject, html, tenantId } = job.data as Record<string, any>;

    const { sendEmail } = await import('./email.service.js');
    const result = await sendEmail({ to, subject, html, tenantId });

    if (!result.sent) {
      logger.error(`Email worker failed for "${emailType}"`, { to, error: result.error });
      throw new Error(result.error || 'Email send failed');
    }

    logger.info(`Email sent: ${emailType} -> ${to}`);
  });
}

export function startQueueProcessor(): void {
  queueService.startProcessor();
}

export function stopQueueProcessor(): void {
  queueService.stopProcessor();
}
