import { randomBytes } from 'node:crypto';

const HANDLE_MAX_LENGTH = 30;
const RANDOM_SUFFIX_LENGTH = 8;

export function handleBase(displayName: string): string {
  const normalized = displayName
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, HANDLE_MAX_LENGTH)
    .replace(/_+$/g, '');

  if (normalized.length >= 3) {
    return normalized;
  }

  return normalized ? `${normalized}_creator`.slice(0, HANDLE_MAX_LENGTH) : 'creator';
}

export function generateHandle(
  displayName: string,
  existingHandles: ReadonlySet<string> = new Set<string>(),
  random: (size: number) => Buffer = randomBytes,
): string {
  const base = handleBase(displayName);
  if (!existingHandles.has(base)) {
    return base;
  }

  const prefixLength = HANDLE_MAX_LENGTH - RANDOM_SUFFIX_LENGTH - 1;
  const prefix = base.slice(0, prefixLength).replace(/_+$/g, '') || 'creator';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = random(RANDOM_SUFFIX_LENGTH / 2).toString('hex');
    const candidate = `${prefix}_${suffix}`;
    if (!existingHandles.has(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to allocate a unique creator handle');
}
