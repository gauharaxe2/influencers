import { loadConfig } from './configuration';

const databaseUrl = 'postgresql://postgres:postgres@localhost:5432/creator_platform_test';

describe('loadConfig', () => {
  it('uses safe development defaults outside production', () => {
    const config = loadConfig({ DATABASE_URL: databaseUrl });

    expect(config.port).toBe(4000);
    expect(config.storageDriver).toBe('local');
    expect(config.publicApiUrl).toBe('http://localhost:4000');
    expect(config.jwtAccessSecret).not.toBe(config.jwtRefreshSecret);
  });

  it('rejects missing production secrets and public URLs', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', DATABASE_URL: databaseUrl })).toThrow(
      'JWT_ACCESS_SECRET is required in production',
    );
  });

  it('requires S3 credentials only when the S3 driver is selected', () => {
    expect(() => loadConfig({ DATABASE_URL: databaseUrl, STORAGE_DRIVER: 's3' })).toThrow(
      'S3_BUCKET is required when STORAGE_DRIVER=s3',
    );
  });
});
