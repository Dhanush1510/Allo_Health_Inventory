import { randomUUID } from 'crypto';
import { getRedis } from '@/lib/redis';

const LOCK_TTL_SEC = 15;
const LOCK_WAIT_MS = 4000;
const LOCK_RETRY_MS = 50;

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export async function withStockLock<T>(
  productId: string,
  warehouseId: string,
  fn: () => Promise<T>
): Promise<T> {
  const redis = getRedis();
  const lockKey = `lock:stock:${productId}:${warehouseId}`;

  if (!redis) {
    return fn();
  }

  const token = randomUUID();
  const deadline = Date.now() + LOCK_WAIT_MS;

  while (Date.now() < deadline) {
    const acquired = await redis.set(lockKey, token, { nx: true, ex: LOCK_TTL_SEC });
    if (acquired) {
      try {
        return await fn();
      } finally {
        await redis.eval(RELEASE_SCRIPT, [lockKey], [token]);
      }
    }
    await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
  }

  throw new Error('STOCK_LOCK_TIMEOUT');
}
