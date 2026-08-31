# Faculty Of The Graduate School FOTGS dashboard

Next.js app for publishing Faculty Of The Graduate School FOTGS OBIEE exports to a read-only dashboard.

The upload may contain WSU ID / `EMPLID`. The app uses it only on the server to create a private HMAC identity key for stable import matching. `EMPLID` is not stored in the public payload and is not rendered on `/view` or `/s/<slug>`.

## Required OBIEE columns

The first worksheet or CSV header must include these exact fields:

| Column | Use |
| --- | --- |
| `Updated on` | Run date shown on the dashboard |
| `EMPLID` | Private upload-only identity key; not public |
| `Last Name` | Search and display |
| `First Name` | Search and display |
| `Preferred Name` | Primary public display name when present |
| `Highest Degree` | Public table and Workday incomplete metric |
| `Rank` | Public table and Workday incomplete metric |
| `Track and Status` | Public filter and table |
| `Faculty of the Graduate School Status` | Public filter and table |
| `Appointment Status` | Public filter and table |
| `Research Webpage` | Public external link when valid |

## Hosting requirement

This app is intended to run on Vercel. Do not rely on the local filesystem for published data: Vercel deployments are not a durable filesystem. Production requires a connected **private Vercel Blob** store and the `BLOB_READ_WRITE_TOKEN` variable that Vercel provides when the store is connected.

The repository contains local-development fallback code for maintenance and testing, but that is not the production storage path and is not part of the Vercel setup.

## Vercel setup

### 1. Import the project in Vercel

1. Open the Vercel dashboard.
2. Select the correct team from the team switcher.
3. Select **Add New...** → **Project**.
4. Under **Import Git Repository**, choose GitHub and select `gcrouch-wsu/wsu-gradschool-fotgs`.
5. On the configuration screen:
   - **Project Name**: `wsu-gradschool-fotgs`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: leave as repository root unless this app is inside a subfolder
   - **Build Command**: leave default (`next build`)
   - **Output Directory**: leave default
   - **Install Command**: leave default
6. Select **Deploy**.

The first deployment may show the public page with no publication until storage and environment variables are configured. The production branch should be `main`; pushes to `main` will create production deployments after setup.

### 2. Create and connect private Vercel Blob

1. Open the Vercel project.
2. Select **Storage**.
3. Select **Create Database** → **Blob**.
4. Select **Continue**.
5. Set **Access** to **Private**.
6. Create the store and connect it to this project.
7. Open the project **Settings** → **Environment Variables** and confirm that Vercel added `BLOB_READ_WRITE_TOKEN`.

Private Blob is required because the stored JSON contains private HMAC identity keys. The app uses the Blob store for sanitized publication snapshots and the current-publication pointer; it does not publish the original upload or raw `EMPLID` values.

If the Blob store was created at the team level instead of from this project, use the store's **Connect to Project** action. A connected store is what adds `BLOB_READ_WRITE_TOKEN` to the project.

### 3. Add the application environment variables

Open the project, then **Settings** → **Environment Variables**.

For each row below, select **Production**. Mark the three secret values as sensitive if the dashboard offers that option.

| Key | Value |
| --- | --- |
| `ADMIN_USERNAME` | The admin username you want |
| `ADMIN_PASSWORD` | A strong admin password |
| `AUTH_SECRET` | A random secret, at least 32 characters |
| `FOTGS_BLOB_ACCESS` | `private` |

Do not create a `NEXT_PUBLIC_` version of any of these variables. They are server-side secrets or server-side configuration.

`BLOB_READ_WRITE_TOKEN` should already exist after Blob is connected. If it does not, reconnect the Blob store to the project and check the Blob store's project connection. Do not paste a token into GitHub or into this README.

For each of `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `AUTH_SECRET`, and `FOTGS_BLOB_ACCESS`, also select **Preview** if you want to test uploads on Vercel preview URLs. The Blob connection should provide `BLOB_READ_WRITE_TOKEN` for the preview deployment as well. Do not use production data from a preview upload unless that is intentional; a separate Blob store and separate admin credentials are safer for preview testing.

### 4. Redeploy after configuration

Environment variable and storage changes do not modify an already-built deployment.

1. Open **Deployments** in the Vercel project.
2. Open the most recent production deployment.
3. Select the three-dot menu → **Redeploy**.
4. Wait for the deployment to finish with a **Ready** status.

### 5. Publish the first dashboard

1. Open `https://<your-project-domain>/admin/login`.
2. Sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
3. Upload the OBIEE `.csv` or `.xlsx` export. The upload must contain the exact required columns listed above, including `EMPLID`.
4. After publish, open `https://<your-project-domain>/view`.
5. Confirm the dashboard has the expected row count and filters, and confirm that no WSU ID/`EMPLID` column is visible.
6. Link your website to `https://<your-project-domain>/view`.

Each upload creates a snapshot at `/s/<slug>` and updates `/view` to the newest upload.

## Optional Vercel CLI

The dashboard workflow above does not require the CLI. For command-line deployment, environment inspection, or pulling Vercel-managed variables, install the current CLI first:

```bash
npm i -g vercel
vercel login
vercel link
vercel env ls production
vercel env pull .env.local --environment=production
```

Use `vercel env pull` only on a machine where the resulting `.env.local` is protected and ignored by Git. Environment changes still require a new deployment before the hosted app sees them.

## Troubleshooting

- **`BLOB_READ_WRITE_TOKEN` is missing**: reconnect the private Blob store to this Vercel project, then redeploy.
- **Login fails**: verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set for the deployment's environment, then redeploy.
- **Upload fails with an `AUTH_SECRET` message**: add `AUTH_SECRET` with at least 32 characters and redeploy.
- **The dashboard says no publication is available**: sign in at `/admin/login` and publish an export; `/view` is empty until the first successful upload.
- **A preview behaves differently from production**: verify that the required variables are scoped to **Preview** as well as **Production**, and check whether the preview is connected to the intended Blob store.
