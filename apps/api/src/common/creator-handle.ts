import type { Prisma } from '@prisma/client';
import { generateHandle } from './handle';

export async function allocateCreatorHandle(
  transaction: Prisma.TransactionClient,
  displayName: string,
): Promise<string> {
  const preferredHandle = generateHandle(displayName);
  const existing = await transaction.creatorProfile.findUnique({
    where: { handle: preferredHandle },
    select: { handle: true },
  });

  return existing
    ? generateHandle(displayName, new Set([existing.handle]))
    : preferredHandle;
}
