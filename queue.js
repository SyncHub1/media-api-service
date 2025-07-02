import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

// Redis connection events
redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redisClient.on('close', () => {
  console.log('🔌 Redis connection closed');
});

// Create queues
const mediaProcessingQueue = new Queue('media-processing', {
  connection: redisClient
});

const imageProcessingQueue = new Queue('image-processing', {
  connection: redisClient
});

// Add job to media processing queue
export const addToQueue = async (queueName, data) => {
  try {
    let queue;
    
    switch (queueName) {
      case 'media-processing':
        queue = mediaProcessingQueue;
        break;
      case 'image-processing':
        queue = imageProcessingQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const job = await queue.add(queueName, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    });

    console.log(`📤 Added job to ${queueName}: ${job.id}`);
    return job;
  } catch (error) {
    console.error(`❌ Error adding job to ${queueName}:`, error);
    throw error;
  }
};

// Get job status
export const getJobStatus = async (queueName, jobId) => {
  try {
    let queue;
    
    switch (queueName) {
      case 'media-processing':
        queue = mediaProcessingQueue;
        break;
      case 'image-processing':
        queue = imageProcessingQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      data: job.data,
      failedReason: job.failedReason,
      timestamp: job.timestamp
    };
  } catch (error) {
    console.error(`❌ Error getting job status:`, error);
    throw error;
  }
};

// Clean up queues
export const cleanupQueues = async () => {
  try {
    await mediaProcessingQueue.close();
    await imageProcessingQueue.close();
    await redisClient.disconnect();
    console.log('🧹 Queues cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up queues:', error);
    throw error;
  }
};

export { redisClient };

export default {
  addToQueue,
  getJobStatus,
  cleanupQueues,
  mediaProcessingQueue,
  imageProcessingQueue,
  redisClient
}; 