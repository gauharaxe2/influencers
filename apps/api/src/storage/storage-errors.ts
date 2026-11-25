export class StorageObjectNotFoundError extends Error {
  constructor() {
    super('Storage object not found');
    this.name = 'StorageObjectNotFoundError';
  }
}

export class StorageObjectExistsError extends Error {
  constructor() {
    super('Storage object already exists');
    this.name = 'StorageObjectExistsError';
  }
}
