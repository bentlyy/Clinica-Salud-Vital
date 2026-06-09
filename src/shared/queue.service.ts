import { logger } from '../utils/logger.js';

interface JobData {
  type: string;
  data: Record<string, unknown>;
  attempts?: number;
}

type JobHandler = (job: JobData) => Promise<void>;

interface QueueConfig {
  redisUrl?: string;
  useRedis: boolean;
}

let config: QueueConfig = {
  useRedis: false,
};

// In-memory queue for development / when Redis is unavailable
class MemoryQueue {
  private handlers: Map<string, JobHandler> = new Map();
  private pending: JobData[] = [];

  register(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async add(type: string, data: Record<string, unknown>, _options?: { attempts?: number; backoff?: { type: string; delay: number } }): Promise<void> {
    const handler = this.handlers.get(type);
    if (!handler) {
      logger.warn(`MemoryQueue: No handler registered for type "${type}"`);
      return;
    }

    // Execute asynchronously but track failures
    handler({ type, data }).catch((err) => {
      logger.error(`MemoryQueue: Job "${type}" failed:`, err);
    });
  }

  async processPending(): Promise<void> {
    const jobs = [...this.pending];
    this.pending = [];
    for (const job of jobs) {
      const handler = this.handlers.get(job.type);
      if (handler) {
        try {
          await handler(job);
        } catch (err) {
          logger.error(`MemoryQueue: Pending job "${job.type}" failed:`, err);
        }
      }
    }
  }

  getPendingCount(): number {
    return this.pending.length;
  }
}

class QueueService {
  private memoryQueue: MemoryQueue;
  private redisAvailable: boolean = false;
  private bullQueues: Map<string, any> = new Map();
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.memoryQueue = new MemoryQueue();
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        try {
          const Redis = (await import('ioredis')).default;
          const connection = new Redis(redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times) => {
              if (times > 3) return null; // give up after 3 retries
              return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
          });

          await connection.connect();
          this.redisAvailable = true;
          logger.info('QueueService: Redis connected');
        } catch (err) {
          logger.warn('QueueService: Redis not available, using memory queue', err);
          this.redisAvailable = false;
        }
      } else {
        logger.info('QueueService: REDIS_URL not set, using memory queue');
      }
    })();

    return this.initPromise;
  }

  async addJob(type: string, data: Record<string, unknown>, options?: { attempts?: number; backoff?: { type: string; delay: number } }): Promise<void> {
    if (this.redisAvailable) {
      try {
        const { Queue: BullQueue } = await import('bullmq');
        let queue = this.bullQueues.get('default');
        if (!queue) {
          const Redis = (await import('ioredis')).default;
          queue = new BullQueue('default', {
            connection: new Redis(process.env.REDIS_URL as string, {
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            }),
          });
          this.bullQueues.set('default', queue);
        }
        await queue.add(type, data, {
          attempts: options?.attempts || 3,
          backoff: options?.backoff || { type: 'exponential', delay: 2000 },
        });
        return;
      } catch (err) {
        logger.warn('QueueService: BullMQ add failed, falling back to memory', err);
      }
    }

    // Fallback to memory queue
    await this.memoryQueue.add(type, data, options);
  }

  registerWorker(type: string, handler: JobHandler): void {
    this.memoryQueue.register(type, handler);

    if (this.redisAvailable) {
      this.startBullWorker(type, handler);
    }
  }

  private async startBullWorker(type: string, handler: JobHandler): Promise<void> {
    try {
      const { Worker: BullWorker } = await import('bullmq');
      const Redis = (await import('ioredis')).default;
      const worker = new BullWorker(
        'default',
        async (job: any) => {
          if (job.name === type) {
            await handler({ type: job.name, data: job.data, attempts: job.attemptsMade });
          }
        },
        {
          connection: new Redis(process.env.REDIS_URL as string, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          }),
          concurrency: 5,
        }
      );

      worker.on('failed', (job: any, err: Error) => {
        logger.error(`BullWorker: Job "${type}" failed after ${job?.attemptsMade} attempts:`, err);
      });

      worker.on('completed', (job: any) => {
        logger.info(`BullWorker: Job "${type}" completed (id: ${job?.id})`);
      });
    } catch (err) {
      logger.warn(`QueueService: BullMQ worker for "${type}" not started`, err);
    }
  }

  destroy(): void {
    for (const queue of this.bullQueues.values()) {
      queue.close().catch(() => {});
    }
    this.bullQueues.clear();
  }
}

export const queueService = new QueueService();

export async function enqueueJob(type: string, data: Record<string, unknown>, options?: { attempts?: number; backoff?: { type: string; delay: number } }): Promise<void> {
  await queueService.initialize();
  await queueService.addJob(type, data, options);
}

export function registerWorker(type: string, handler: JobHandler): void {
  queueService.registerWorker(type, handler);
}

// Register email worker
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

// Register ML training worker
registerWorker('ml:train', async (job) => {
  const { tenantId } = job.data as Record<string, any>;
  logger.info(`ML training worker started for tenant: ${tenantId}`);

  try {
    const { trainAllModels } = await import('../modules/ml/ml.training.js');
    const results = await trainAllModels(tenantId);
    logger.info(`ML training worker completed for tenant: ${tenantId}`, results);
  } catch (err) {
    logger.error(`ML training worker failed for tenant: ${tenantId}`, { error: (err as Error).message });
    throw err;
  }
});
