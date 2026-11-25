import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const DEVELOPMENT_ACCESS_SECRET = 'development-only-creator-platform-access-secret';
const DEVELOPMENT_REFRESH_SECRET = 'development-only-creator-platform-refresh-secret';

const configSchema = z
  .object({
    nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
    port: z.coerce.number().int().min(1).max(65535).default(4000),
    firebaseProjectId: z.string().min(1).default('frame-influencers'),
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

    if (config.nodeEnv === 'production') {
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
  .transform((config) => ({
    ...config,
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

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const useS3 = environment.STORAGE_DRIVER === 's3';
  const result = configSchema.safeParse({
    nodeEnv: environment.NODE_ENV,
    port: environment.PORT,
    firebaseProjectId: environment.FIREBASE_PROJECT_ID,
    firebaseServiceAccountJson: environment.FIREBASE_SERVICE_ACCOUNT_JSON,
    jwtAccessSecret: environment.JWT_ACCESS_SECRET,
    jwtRefreshSecret: environment.JWT_REFRESH_SECRET,
    storageDriver: environment.STORAGE_DRIVER,
    localStorageDir: environment.LOCAL_STORAGE_DIR,
    maxUploadBytes: environment.MAX_UPLOAD_BYTES,
    publicApiUrl: environment.PUBLIC_API_URL,
    webOrigin: environment.WEB_ORIGIN,
    s3Endpoint: useS3 ? environment.S3_ENDPOINT || undefined : undefined,
    s3Region: useS3 ? environment.S3_REGION || undefined : undefined,
    s3Bucket: useS3 ? environment.S3_BUCKET || undefined : undefined,
    s3AccessKeyId: useS3 ? environment.S3_ACCESS_KEY_ID || undefined : undefined,
    s3SecretAccessKey: useS3 ? environment.S3_SECRET_ACCESS_KEY || undefined : undefined,
    s3SessionToken: useS3 ? environment.S3_SESSION_TOKEN || undefined : undefined,
    s3ForcePathStyle: useS3 ? environment.S3_FORCE_PATH_STYLE : undefined,
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