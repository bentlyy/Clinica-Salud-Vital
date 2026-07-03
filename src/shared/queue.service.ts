import { logger } from '../utils/logger.js';

interface JobData {
  type: string;
  data: Record<string, unknown>;
  attempts?: number;
}

type JobHandler = (job: JobData) => Promise<void>;

class MemoryQueue {
  private handlers: Map<string, JobHandler> = new Map();

  register(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async add(type: string, data: Record<string, unknown>): Promise<void> {
    const handler = this.handlers.get(type);
    if (!handler) {
      logger.warn(`MemoryQueue: No handler registered for type "${type}"`);
      return;
    }
    setImmediate(async () => {
      try {
        await handler({ type, data });
      } catch (err) {
        logger.error(`MemoryQueue: Job "${type}" failed:`, err);
      }
    });
  }
}

class QueueService {
  private memoryQueue: MemoryQueue;

  constructor() {
    this.memoryQueue = new MemoryQueue();
  }

  async addJob(type: string, data: Record<string, unknown>): Promise<void> {
    await this.memoryQueue.add(type, data);
  }

  registerWorker(type: string, handler: JobHandler): void {
    this.memoryQueue.register(type, handler);
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
