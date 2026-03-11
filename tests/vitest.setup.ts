import {mockDeep, mockReset, DeepMockProxy} from 'vitest-mock-extended';
import {vi, beforeEach} from 'vitest';
import {PrismaClient} from '../src/generated/prisma/client';
import {prisma} from '../src/database';

vi.mock('../src/database', () => ({
    prisma: mockDeep<PrismaClient>()
}));

// Mock du middleware d'authentification
vi.mock('../src/auth/auth.middleware', () => ({
    authenticateToken: vi.fn((req, res, next) => {
        // Simule un utilisateur authentifié
        req.userId = 1
        next()
    }),
}))

beforeEach(() => {
    mockReset(prismaMock);
});

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
