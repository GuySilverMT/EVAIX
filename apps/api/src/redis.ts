import fs from 'fs';

// FAIL-SAFE REDIS CLIENT
// This wrapper ensures that if the 'redis' package is missing or misconfigured, 
// the rest of the application (like model sync) doesn't crash.

let createClient: any = null;

try {
  // Try to load redis
  const redisPkg = await import('redis');
  createClient = redisPkg.createClient;
} catch (e) {
  console.warn('[Redis] ⚠️ Failed to load redis package. Model sync and other services will use mock mode.');
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Mock Client if redis is missing
const mockRedis = {
  on: () => ({}),
  connect: async () => console.log('[Redis] (Mock) Connected'),
  get: async () => null,
  set: async () => 'OK',
  isOpen: true,
  close: async () => ({})
};

export const redis: any = createClient ? createClient({ url: redisUrl }) : mockRedis;

if (createClient) {
  redis.on('error', (err: unknown) => console.error('Redis Client Error', err));
  redis.connect().catch((err: any) => {
    console.warn('[Redis] ⚠️ Connection failed. Swapping to mock mode.', err.message);
    Object.assign(redis, mockRedis);
  });
}

const redisClient: any = null;
export async function getRedisClient(): Promise<any> {
  return redis;
}