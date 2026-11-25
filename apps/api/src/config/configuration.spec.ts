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

  it('treats blank environment values as unset', () => {
    const config = loadConfig({
      FIREBASE_PROJECT_ID: '   ',
      JWT_ACCESS_SECRET: '',
      JWT_REFRESH_SECRET: '',
      STORAGE_DRIVER: '',
      PUBLIC_API_URL: '',
      WEB_ORIGIN: '',
      PORT: '',
    });

    expect(config.firebaseProjectId).toBe('frame-influencers');
    expect(config.storageDriver).toBe('local');
    expect(config.publicApiUrl).toBe('http://localhost:4000');
    expect(config.port).toBe(4000);
  });

  it('requires the Firebase project id in production', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        PUBLIC_API_URL: 'https://api.example.com',
        WEB_ORIGIN: 'https://app.example.com',
      }),
    ).toThrow('FIREBASE_PROJECT_ID is required in production');
  });

  it('requires a Firebase service account when Vercel runs in production', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        VERCEL: '1',
        FIREBASE_PROJECT_ID: 'frame-influencers',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
        PUBLIC_API_URL: 'https://api.example.com',
        WEB_ORIGIN: 'https://app.example.com',
      }),
    ).toThrow(/FIREBASE_SERVICE_ACCOUNT_JSON is required on Vercel/);
  });

  it('accepts Vercel production with local storage for auth and Firestore', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      VERCEL: '1',
      FIREBASE_PROJECT_ID: 'frame-influencers',
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        client_email: 'api@frame-influencers.iam.gserviceaccount.com',
        private_key: 'test-only-key',
      }),
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      PUBLIC_API_URL: 'https://api.example.com/',
      WEB_ORIGIN: 'https://app.example.com/',
      STORAGE_DRIVER: 'local',
    });

    expect(config.firebaseProjectId).toBe('frame-influencers');
    expect(config.storageDriver).toBe('local');
    expect(config.publicApiUrl).toBe('https://api.example.com');
    expect(config.webOrigin).toBe('https://app.example.com');
  });
});