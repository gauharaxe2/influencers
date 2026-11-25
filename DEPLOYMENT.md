# Deployment

Influence is an npm workspaces monorepo. The website is Next.js (`apps/web`). The API is NestJS (`apps/api`) and is the only process that talks to Firebase. Deploy them as two Vercel projects from this GitHub repository. Do not put service-account JSON, JWT secrets, or S3 keys in git.

Firebase project id referenced by this repo: `frame-influencers` (`.firebaserc`, and the API's local default).

## Firebase

The API uses **Cloud Firestore** through `firebase-admin`. It does not use Firebase Authentication, Realtime Database, Cloud Storage, or Cloud Functions. Accounts are email and password hashes in Firestore. Video bytes go to local disk in development and to S3-compatible storage in production.

1. Open [Firebase console](https://console.firebase.google.com/) for project `frame-influencers`. If you use another project, change `.firebaserc`, `firebase.json` only if you want, and set `FIREBASE_PROJECT_ID` everywhere below.
2. Create a Firestore database in **Native** mode if one does not exist. `firebase.json` records location `nam5` (United States multi-region). Location is chosen once. If the database already exists in another region, leave it there and change the `location` field in `firebase.json` to match before the first rules deploy.
3. In Google Cloud IAM, create a service account for the API with the **Cloud Datastore User** role (Firestore read/write). Create a JSON key. You will paste that JSON into Vercel. Do not commit the file.
4. Deploy rules and indexes from this repo (requires `firebase login`):

   ```bash
   npx firebase-tools deploy --only firestore:rules,firestore:indexes --project frame-influencers
   ```

   `firestore.rules` denies every client read and write. The Admin SDK bypasses rules. Do not open these collections to `if true`.
5. Seed country policies once. Put `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_JSON` in the gitignored file `apps/api/.env`, then from the repo root run:

   ```bash
   npm run db:seed
   ```

`firestore.indexes.json` defines the composite index the API uses to list a creator's videos (`ownerId` + `createdAt`).

## Environment variables

Blank lines in the `.env.example` files are intentional. Copy the API example to `apps/api/.env` and the web example to `apps/web/.env.local` for local development. Empty values are ignored.

Vercel sets `NODE_ENV=production`, `VERCEL=1`, and `PORT`. On Vercel the API refuses to boot unless `STORAGE_DRIVER=s3` and `FIREBASE_SERVICE_ACCOUNT_JSON` is set, because the function filesystem is ephemeral and request bodies cannot carry video uploads (4.5 MB, or 20 MB if large bodies are enabled).

### API project (`apps/api`)

| Variable | Required on Vercel | Purpose |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | yes | Firestore project. Use `frame-influencers` unless you changed it. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | yes | Minified service-account JSON (`client_email`, `private_key`). One line. |
| `JWT_ACCESS_SECRET` | yes | Random string, at least 32 characters. |
| `JWT_REFRESH_SECRET` | yes | Different random string, at least 32 characters. |
| `STORAGE_DRIVER` | yes | `s3` |
| `S3_REGION` | yes | Region, or `auto` for some S3-compatible providers. |
| `S3_BUCKET` | yes | Bucket name. |
| `S3_ACCESS_KEY_ID` | yes | Access key. |
| `S3_SECRET_ACCESS_KEY` | yes | Secret key. |
| `PUBLIC_API_URL` | yes | API origin with no path, such as `https://<api-project>.vercel.app`. |
| `WEB_ORIGIN` | yes | Website origin with no path, such as `https://<web-project>.vercel.app`. Used for CORS. |
| `S3_ENDPOINT` | no | Set for R2, MinIO, or another S3-compatible host. Include `https://`. |
| `S3_SESSION_TOKEN` | no | Only for temporary credentials. |
| `S3_FORCE_PATH_STYLE` | no | `true` or `false`. Defaults to path-style when `S3_ENDPOINT` is set. |
| `MAX_UPLOAD_BYTES` | no | Defaults to `1073741824` (1 GiB). |

`GOOGLE_APPLICATION_CREDENTIALS` is a local file path the Admin SDK can use instead of `FIREBASE_SERVICE_ACCOUNT_JSON`. Vercel has no key file, so use the JSON variable there.

The bucket needs CORS that allows `PUT` from `WEB_ORIGIN`. The browser uploads directly to the presigned URL.

### Web project (`apps/web`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `API_INTERNAL_URL` | yes | API base including the global prefix, such as `https://<api-project>.vercel.app/api/v1`. |

Next.js reads this when it builds rewrites. Set it before the first deploy, and redeploy the web project after it changes. The browser calls `/api/v1` on the website; it never receives this URL.

Generate the two JWT secrets locally with `openssl rand -base64 48`.

## Vercel project settings

Create **two** projects from `https://github.com/gauharaxe2/influencers`. In each project, set **Root Directory** and enable **Include source files outside of the Root Directory** so the install can see the workspace root and `packages/contracts`.

Node.js version: **22.x**. Root, web, and API `package.json` files pin `engines.node` to `22.x` so Vercel does not select a newer major.

### Web

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Install Command: taken from `apps/web/vercel.json` (`cd ../.. && npm install --include=dev`). Vercel sets `NODE_ENV=production`, which would otherwise skip TypeScript.
- Build Command: taken from `apps/web/vercel.json` (builds `@creator-platform/contracts`, then the web app)
- Output Directory: Next.js default (`.next`). Do not set a custom directory.

### API

- Root Directory: `apps/api`
- Framework Preset: NestJS
- Install Command: taken from `apps/api/vercel.json` (`npm install --include=dev`, then builds `@creator-platform/contracts`)
- Build Command: leave empty. Vercel bundles `apps/api/src/main.ts` with the NestJS runtime. Do not point it at `tsc` or `dist/`.
- Output Directory: none

After both projects exist, set `API_INTERNAL_URL` and `PUBLIC_API_URL` / `WEB_ORIGIN` to the real `*.vercel.app` URLs (or your domains) and redeploy. Smoke-check `GET /api/v1/health` on the API. It should return `{"status":"ok","service":"creator-platform-api"}`.

GitHub Actions (`.github/workflows/ci.yml`) runs `npm test` and `npm run build` on pull requests and on `main`. It does not deploy.

## What you still need to provide

This setup does not deploy anything and does not contain credentials.

- Confirm the Firebase project `frame-influencers` is yours, that Firestore Native is enabled, and which region it uses.
- A service-account JSON key for that project, stored only as `FIREBASE_SERVICE_ACCOUNT_JSON` on the API Vercel project.
- Two distinct JWT secrets.
- An S3-compatible bucket, keys, and bucket CORS for browser `PUT`.
- Vercel access to import this GitHub repository twice (web and API), plus the env vars above.
