import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const DEVELOPMENT_ACCESS_SECRET = 'development-only-creator-platform-access-secret';
const DEVELOPMENT_REFRESH_SECRET = 'development-only-creator-platform-refresh-secret';
const DEVELOPMENT_FIREBASE_PROJECT_ID = 'frame-influencers';

const configSchema = z
  .object({
    nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
    port: z.coerce.number().int().min(1).max(65535).default(4000),
    runningOnVercel: z.boolean().default(false),
    firebaseProjectId: z.string().min(1).optional(),
    firebaseServiceAccountJson: z.string().min(1).optional(),
    jwtAccessSecret: z.string().min(1).optional(),
    jwtRefreshSecret: z.string().min(1).optional(),
    storageDriver: z.enum(['local', 's3']).default('local'),
    localStorageDir: z.string().min(1).default('.data/uploads'),
    maxUploadBytes: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).default(1073741824),
    publicApiUrl: z.string().url().optional(),
    webOrigin: z.string().url().optional(),
    s3Endpoint: z.string().url().optional(),
    s3Region: z.string().min(1).optional(),
    s3Bucket: z.string().min(1).optional(),
    s3AccessKeyId: z.string().min(1).optional(),
    s3SecretAccessKey: z.string().min(1).optional(),
    s3SessionToken: z.string().min(1).optional(),
    s3ForcePathStyle: z.preprocess(
      (value) => (value === 'true' ? true : value === 'false' ? false : value),
      z.boolean().default(false),
    ),
  })
  .superRefine((config, context) => {
    if (
      config.jwtAccessSecret &&
      config.jwtRefreshSecret &&
      config.jwtAccessSecret === config.jwtRefreshSecret
    ) {
      context.addIssue({
        code: 'custom',
        path: ['jwtRefreshSecret'],
        message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET',
      });
    }

    if (config.firebaseServiceAccountJson) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(config.firebaseServiceAccountJson);
      } catch {
        parsed = null;
      }
      const account = parsed as { client_email?: unknown; private_key?: unknown } | null;
      if (
        !account ||
        typeof account.client_email !== 'string' ||
        typeof account.private_key !== 'string'
      ) {
        context.addIssue({
          code: 'custom',
          path: ['firebaseServiceAccountJson'],
          message:
            'FIREBASE_SERVICE_ACCOUNT_JSON must be a service account JSON object with client_email and private_key',
        });
      }
    }

    if (config.nodeEnv === 'production') {
      if (!config.firebaseProjectId) {
        context.addIssue({
          code: 'custom',
          path: ['firebaseProjectId'],
          message: 'FIREBASE_PROJECT_ID is required in production',
        });
      }
      if (!config.publicApiUrl) {
        context.addIssue({
          code: 'custom',
          path: ['publicApiUrl'],
          message: 'PUBLIC_API_URL is required in production',
        });
      }
      if (!config.webOrigin) {
        context.addIssue({
          code: 'custom',
          path: ['webOrigin'],
          message: 'WEB_ORIGIN is required in production',
        });
      }

      if (!config.jwtAccessSecret) {
        context.addIssue({
          code: 'custom',
          path: ['jwtAccessSecret'],
          message: 'JWT_ACCESS_SECRET is required in production',
        });
      } else if (config.jwtAccessSecret.length < 32) {
        context.addIssue({
          code: 'custom',
          path: ['jwtAccessSecret'],
          message: 'JWT_ACCESS_SECRET must contain at least 32 characters in production',
        });
      }

      if (!config.jwtRefreshSecret) {
        context.addIssue({
          code: 'custom',
          path: ['jwtRefreshSecret'],
          message: 'JWT_REFRESH_SECRET is required in production',
        });
      } else if (config.jwtRefreshSecret.length < 32) {
        context.addIssue({
          code: 'custom',
          path: ['jwtRefreshSecret'],
          message: 'JWT_REFRESH_SECRET must contain at least 32 characters in production',
        });
      }

      if (config.runningOnVercel) {
        if (!config.firebaseServiceAccountJson) {
          context.addIssue({
            code: 'custom',
            path: ['firebaseServiceAccountJson'],
            message: 'FIREBASE_SERVICE_ACCOUNT_JSON is required on Vercel',
          });
        }
        if (config.storageDriver !== 's3') {
          context.addIssue({
            code: 'custom',
            path: ['storageDriver'],
            message: 'STORAGE_DRIVER must be s3 on Vercel',
          });
        }
      }
    }

    if (config.storageDriver === 's3') {
      const required = [
        ['s3Region', 'S3_REGION'],
        ['s3Bucket', 'S3_BUCKET'],
        ['s3AccessKeyId', 'S3_ACCESS_KEY_ID'],
        ['s3SecretAccessKey', 'S3_SECRET_ACCESS_KEY'],
      ] as const;

      for (const [field, name] of required) {
        if (!config[field]) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: `${name} is required when STORAGE_DRIVER=s3`,
          });
        }
      }
    }
  })
  .transform(({ runningOnVercel: _runningOnVercel, ...config }) => ({
    ...config,
    firebaseProjectId: config.firebaseProjectId ?? DEVELOPMENT_FIREBASE_PROJECT_ID,
    jwtAccessSecret: config.jwtAccessSecret ?? DEVELOPMENT_ACCESS_SECRET,
    jwtRefreshSecret: config.jwtRefreshSecret ?? DEVELOPMENT_REFRESH_SECRET,
    publicApiUrl: config.publicApiUrl ?? 'http://localhost:4000',
    webOrigin: config.webOrigin ?? 'http://localhost:3000',
  }));

export type AppConfig = z.infer<typeof configSchema>;

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function readEnv(environment: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = environment[name];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const useS3 = readEnv(environment, 'STORAGE_DRIVER') === 's3';
  const result = configSchema.safeParse({
    nodeEnv: readEnv(environment, 'NODE_ENV'),
    port: readEnv(environment, 'PORT'),
    runningOnVercel: environment.VERCEL === '1',
    firebaseProjectId: readEnv(environment, 'FIREBASE_PROJECT_ID'),
    firebaseServiceAccountJson: readEnv(environment, 'FIREBASE_SERVICE_ACCOUNT_JSON'),
    jwtAccessSecret: readEnv(environment, 'JWT_ACCESS_SECRET'),
    jwtRefreshSecret: readEnv(environment, 'JWT_REFRESH_SECRET'),
    storageDriver: readEnv(environment, 'STORAGE_DRIVER'),
    localStorageDir: readEnv(environment, 'LOCAL_STORAGE_DIR'),
    maxUploadBytes: readEnv(environment, 'MAX_UPLOAD_BYTES'),
    publicApiUrl: readEnv(environment, 'PUBLIC_API_URL'),
    webOrigin: readEnv(environment, 'WEB_ORIGIN'),
    s3Endpoint: useS3 ? readEnv(environment, 'S3_ENDPOINT') : undefined,
    s3Region: useS3 ? readEnv(environment, 'S3_REGION') : undefined,
    s3Bucket: useS3 ? readEnv(environment, 'S3_BUCKET') : undefined,
    s3AccessKeyId: useS3 ? readEnv(environment, 'S3_ACCESS_KEY_ID') : undefined,
    s3SecretAccessKey: useS3 ? readEnv(environment, 'S3_SECRET_ACCESS_KEY') : undefined,
    s3SessionToken: useS3 ? readEnv(environment, 'S3_SESSION_TOKEN') : undefined,
    s3ForcePathStyle: useS3 ? readEnv(environment, 'S3_FORCE_PATH_STYLE') : undefined,
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'configuration'}: ${issue.message}`)
      .join('\n');
    throw new ConfigurationError(`Invalid API configuration:\n${details}`);
  }

  return {
    ...result.data,
    publicApiUrl: result.data.publicApiUrl.replace(/\/+$/, ''),
    webOrigin: result.data.webOrigin.replace(/\/+$/, ''),
  };
}
