import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRedis } from '@/lib/redis';

const REDIS_TTL_SEC = 60 * 60 * 24;

type IdempotencyRecord = {
  status: 'PENDING' | 'SUCCESS';
  responseCode?: number;
  responseBody?: string;
};

export type IdempotencyHandle = {
  replay: (body: unknown, status: number) => NextResponse;
  save: (status: number, body: unknown) => Promise<void>;
  clear: () => Promise<void>;
};

export async function beginIdempotency(
  scope: string,
  key: string | null
): Promise<{ proceed: true; handle: IdempotencyHandle } | { proceed: false; response: NextResponse }> {
  if (!key) {
    const noop: IdempotencyHandle = {
      replay: (body, status) => NextResponse.json(body, { status }),
      save: async () => {},
      clear: async () => {},
    };
    return { proceed: true, handle: noop };
  }

  const redis = getRedis();
  const redisKey = `idempotency:${scope}:${key}`;

  if (redis) {
    const existing = await redis.get<IdempotencyRecord>(redisKey);
    if (existing?.status === 'SUCCESS' && existing.responseCode !== undefined) {
      const body = existing.responseBody ? JSON.parse(existing.responseBody) : null;
      return {
        proceed: false,
        response: NextResponse.json(body, { status: existing.responseCode }),
      };
    }
    if (existing?.status === 'PENDING') {
      return {
        proceed: false,
        response: NextResponse.json(
          { error: 'An identical request is currently processing. Please try again.' },
          { status: 409 }
        ),
      };
    }

    const acquired = await redis.set(redisKey, { status: 'PENDING' }, { nx: true, ex: REDIS_TTL_SEC });
    if (!acquired) {
      const again = await redis.get<IdempotencyRecord>(redisKey);
      if (again?.status === 'SUCCESS' && again.responseCode !== undefined) {
        const body = again.responseBody ? JSON.parse(again.responseBody) : null;
        return {
          proceed: false,
          response: NextResponse.json(body, { status: again.responseCode }),
        };
      }
      return {
        proceed: false,
        response: NextResponse.json(
          { error: 'An identical request is currently processing. Please try again.' },
          { status: 409 }
        ),
      };
    }

    const handle: IdempotencyHandle = {
      replay: (body, status) => NextResponse.json(body, { status }),
      save: async (status, body) => {
        await redis.set(
          redisKey,
          {
            status: 'SUCCESS',
            responseCode: status,
            responseBody: JSON.stringify(body),
          },
          { ex: REDIS_TTL_SEC }
        );
      },
      clear: async () => {
        await redis.del(redisKey);
      },
    };
    return { proceed: true, handle };
  }

  // Postgres fallback when Redis is not configured (local dev)
  const existing = await prisma.idempotency.findUnique({ where: { key } });
  if (existing) {
    if (existing.status === 'PENDING') {
      return {
        proceed: false,
        response: NextResponse.json(
          { error: 'An identical request is currently processing. Please try again.' },
          { status: 409 }
        ),
      };
    }
    const savedBody = existing.responseBody
      ? (JSON.parse(existing.responseBody) as unknown)
      : null;
    return {
      proceed: false,
      response: NextResponse.json(savedBody, { status: existing.responseCode || 200 }),
    };
  }

  await prisma.idempotency.create({ data: { key, status: 'PENDING' } });

  const handle: IdempotencyHandle = {
    replay: (body, status) => NextResponse.json(body, { status }),
    save: async (status, body) => {
      await prisma.idempotency.update({
        where: { key },
        data: {
          status: 'SUCCESS',
          responseCode: status,
          responseBody: JSON.stringify(body),
        },
      });
    },
    clear: async () => {
      await prisma.idempotency.delete({ where: { key } }).catch(() => {});
    },
  };
  return { proceed: true, handle };
}
