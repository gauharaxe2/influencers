import type { Transaction } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../firestore/collections';
import { generateHandle } from './handle';

export async function allocateCreatorHandle(
  transaction: Transaction,
  db: FirebaseFirestore.Firestore,
  displayName: string,
): Promise<string> {
  const taken = new Set<string>();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateHandle(displayName, taken);
    const existing = await transaction.get(db.collection(COLLECTIONS.creatorHandles).doc(candidate));
    if (!existing.exists) {
      return candidate;
    }
    taken.add(candidate);
  }

  return generateHandle(displayName, taken);
}
