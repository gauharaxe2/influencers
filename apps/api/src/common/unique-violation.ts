export class UniqueViolationError extends Error {
  readonly field: string;

  constructor(field: string) {
    super(`Unique constraint violated: ${field}`);
    this.name = 'UniqueViolationError';
    this.field = field;
  }
}

export function isUniqueViolation(error: unknown, field: string): boolean {
  return error instanceof UniqueViolationError && error.field === field;
}