import type { Transaction } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../firestore/collections';
import { generateHandle } from './handle';

export async function allocateCreatorHandle(
  transaction: Transaction,
  db: FirebaseFirestore.Firestore,
  displayName: string,
): Promise<string> {
  const preferredHandle = generateHandle(displayName);
  const handleRef = db.collection(COLLECTIONS.creatorHandles).doc(preferredHandle);
  const existing = await transaction.get(handleRef);

  return existing.exists
    ? generateHandle(displayName, new Set([preferredHandle]))
    : preferredHandle;
}