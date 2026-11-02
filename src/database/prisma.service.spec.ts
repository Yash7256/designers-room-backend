import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from './prisma.service.js';

const { prismaPgConstructor } = vi.hoisted(() => ({
  prismaPgConstructor: vi.fn(),
}));

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class {
    constructor(options: unknown) {
      prismaPgConstructor(options);
    }
  },
}));

vi.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: class {
    $connect = vi.fn();
    $disconnect = vi.fn();
  },
}));

function configWith(values: Record<string, unknown>): ConfigService {
  return {
    getOrThrow: vi.fn((key: string) => values[key]),
    get: vi.fn((key: string, defaultValue?: unknown) =>
      key in values ? values[key] : defaultValue,
    ),
  } as unknown as ConfigService;
}

const connectionString = 'postgresql://user:pass@localhost:5432/designers_room';

describe('PrismaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes DB_POOL_MAX to the Postgres adapter', () => {
    new PrismaService(
      configWith({
        DATABASE_URL: connectionString,
        DB_POOL_MAX: 7,
      }),
    );

    expect(prismaPgConstructor).toHaveBeenCalledWith({
      connectionString,
      max: 7,
    });
  });

  it('defaults the pool size to 3 when DB_POOL_MAX is unset', () => {
    new PrismaService(configWith({ DATABASE_URL: connectionString }));

    expect(prismaPgConstructor).toHaveBeenCalledWith({
      connectionString,
      max: 3,
    });
  });
});
