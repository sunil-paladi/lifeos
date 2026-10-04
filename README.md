# LifeOS

LifeOS is a Next.js application backed by PostgreSQL and Prisma.

## Local development

1. Install dependencies with `npm ci`.
2. Configure the local values in `.env` (see `.env.example`).
3. Apply development migrations with `npx prisma migrate dev`.
4. Start the app with `npm run dev`.

`SHADOW_DATABASE_URL` is used for local `prisma migrate dev`; it is not needed by production `prisma migrate deploy`.

## Production deployment on Render

LifeOS uses a native Node.js Render Web Service with Render PostgreSQL. This keeps the deployment to one app service and one database; the existing Docker files remain available for local/container workflows but are not required on Render. Use the Node.js version pinned in `.node-version` and place the web service and database in the same Render region. Use the database's internal connection URL for `DATABASE_URL`.

### Configure the Web Service

Create a Web Service from this repository and configure:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Node version | `.node-version` (Node.js 22) |
| Build command | `npm ci && npm run build` |
| Pre-deploy command | `npx prisma migrate deploy` |
| Start command | `npm start` |
| Health check path | `/api/health` |

The build script generates Prisma Client, runs `next build`, and copies the static assets into the standalone output. `npm start` launches that standalone Node server, as required by the existing `output: "standalone"` configuration. Keep migrations out of the build command: Render runs the pre-deploy command after the build and before deploying it, and the deployment fails if migration application fails.

Render supports pre-deploy commands only on paid Web Service instances. Use a paid Web Service for production deployments that apply migrations automatically. Render's Free PostgreSQL plan expires after 30 days and is not suitable for production. If a pre-deploy command is unavailable, arrange a controlled migration step in CI or from an authorized operator environment before deploying; do not assume a Render Shell is available on every plan.

### Production environment variables

Configure these values in the Render service environment, never in source files:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Render PostgreSQL internal connection URL |
| `BETTER_AUTH_SECRET` | Yes | Long, randomly generated Better Auth secret; generate/store it securely |
| `BETTER_AUTH_URL` | Yes | Public HTTPS origin of the app, e.g. `https://<service>.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same public HTTPS origin; set before the first build because Next.js embeds `NEXT_PUBLIC_*` values in browser bundles |
| `RESEND_API_KEY` | For password reset emails | Resend API key |
| `EMAIL_FROM` | For password reset emails | Verified sender address configured with Resend |

Generate `BETTER_AUTH_SECRET` outside the repository (for example, with `openssl rand -base64 32`) and enter its output directly into Render. Do not paste the value into source control, this document, or build logs. The standalone server sets `NODE_ENV=production`, and Render provides `PORT`. `SHADOW_DATABASE_URL` is for local development migrations and is not required in production.

Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to exactly the same HTTPS origin, with no path. Set them before the first build so the server auth base URL, client auth base URL, and the trusted-app-origin helper all resolve to the Render host. Production auth cookies are already configured as secure when `NODE_ENV=production`.

The `http://localhost:3000` values in `.env.example` are for local development only; production does not require a localhost URL.

### First deployment and migrations

1. Create a Render PostgreSQL database. Choose a paid, production-appropriate plan with the retention and backup policy you need.
2. Create the Node Web Service in the same region and connect it to this repository and deployment branch.
3. Configure the build, pre-deploy, start, and health-check settings from the table above.
4. Add all required production environment variables before deploying. Use the database's internal URL for `DATABASE_URL`, and use the service's HTTPS URL for both application URL variables.
5. Confirm the database is new and empty, then deploy. Render runs `npx prisma migrate deploy` before starting the new version. For later deployments, keep using the pre-deploy command and take/verify backups according to the database plan before schema changes.
6. If a pre-deploy command is unavailable, run `npx prisma migrate deploy` from a controlled CI or operator environment against the production database before deploying, and confirm success. Review the migration impact and take an appropriate backup first; do not assume Render Shell access is available. Never substitute `migrate dev`, `migrate reset`, or `db push` in production.
7. Check `https://<service>.onrender.com/api/health` for HTTP 200 and `{"status":"ok"}`.

**Migration warning:** `20260825130540_add_better_auth` drops the legacy `"User"` table and creates Better Auth's lowercase `"user"` table. This is safe when applying the complete migration history to a genuinely empty new Render database. Do not apply this migration history to a database containing existing user data unless that data has first been backed up and a deliberate data migration has been planned. No production migration should be run against a non-empty database without reviewing its impact.

### Post-deployment verification

- Confirm the health endpoint returns HTTP 200 without authentication or sensitive details.
- Open `/login` and `/signup`; verify the signup and login flows, and verify logout/session cookies use HTTPS and have the `Secure` attribute.
- Create or use test accounts for Owner, Trainer, and Member roles. Verify that each sees only its authorized pages and data, and test the primary role-specific flows.
- As an Owner, perform an action that creates an audit log and notification; confirm the corresponding records and in-app notification behavior.
- Open `/manifest.webmanifest` and verify the LifeOS name, `/dashboard` start URL, `/` scope, standalone display mode, and logo path.
- Confirm the app has no custom service worker or PWA cache for authenticated data. Authenticated pages are rendered dynamically and the app does not install an offline cache that stores API responses.
- If password reset is offered, configure Resend and verify a real reset email is delivered and its link uses the production HTTPS origin.

### Custom domain

1. Add the custom domain in the Render Web Service's settings.
2. Copy the DNS record type, host/name, target/value, and any additional records that Render displays. Add exactly those records at the DNS provider; Render supplies the provider/service-specific targets. Do not guess an apex IP or CNAME target. Remove conflicting records only when Render's instructions require it.
3. Wait for Render to verify the domain and provision TLS.
4. Update both `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the final `https://<your-domain>` origin (same host, no path or trailing slash). Save the environment changes and redeploy; changing `NEXT_PUBLIC_APP_URL` requires a new build.
5. Verify the app, login/signup, password-reset links (if enabled), secure cookies, manifest, and health endpoint again on the custom domain. Keep the Render-provided domain configured if it is still needed.
