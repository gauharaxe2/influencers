import { loadConfig } from './configuration';

describe('loadConfig', () => {
  it('uses safe development defaults outside production', () => {
    const config = loadConfig({ FIREBASE_PROJECT_ID: 'frame-influencers' });

    expect(config.port).toBe(4000);
    expect(config.storageDriver).toBe('local');
    expect(config.publicApiUrl).toBe('http://localhost:4000');
    expect(config.firebaseProjectId).toBe('frame-influencers');
    expect(config.jwtAccessSecret).not.toBe(config.jwtRefreshSecret);
  });

  it('rejects missing production secrets and public URLs', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', FIREBASE_PROJECT_ID: 'frame-influencers' }),
    ).toThrow('JWT_ACCESS_SECRET is required in production');
  });

  it('requires S3 credentials only when the S3 driver is selected', () => {
    expect(() =>
      loadConfig({ FIREBASE_PROJECT_ID: 'frame-influencers', STORAGE_DRIVER: 's3' }),
    ).toThrow('S3_BUCKET is required when STORAGE_DRIVER=s3');
  });
});