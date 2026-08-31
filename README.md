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

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill:

   ```env
   ADMIN_USERNAME=your-admin-name
   ADMIN_PASSWORD=your-strong-password
   AUTH_SECRET=at-least-16-random-characters
   FOTGS_BLOB_ACCESS=private
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000/admin/login`, sign in, and upload the OBIEE `.csv` or `.xlsx`.

Local development can store sanitized publications in `.fotgs-local-store/` when `BLOB_READ_WRITE_TOKEN` is absent. Vercel production requires Blob.

## Vercel setup

### 1. Put the app in GitHub

1. Create a GitHub repository, for example `wsu-gradschool-fotgs`.
2. Push this folder to the repository.
3. Use `main` as the production branch.

### 2. Import the project in Vercel

1. Open the Vercel dashboard.
2. Select the correct team from the team switcher.
3. Select **New Project**.
4. Choose the GitHub repository.
5. On the configuration screen:
   - **Project Name**: `wsu-gradschool-fotgs`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: leave as repository root unless this app is inside a subfolder
   - **Build Command**: leave default (`next build`)
   - **Output Directory**: leave default
   - **Install Command**: leave default
6. Select **Deploy**.

The first deployment may show the public page with no publication until storage and env vars are configured.

### 3. Create and connect Vercel Blob

1. Open the Vercel project.
2. Select **Storage**.
3. Select **Create Database**.
4. Choose **Blob**.
5. Select **Continue**.
6. Set access to **Private**.
7. Create the Blob store and connect it to this project.
8. Confirm the project has `BLOB_READ_WRITE_TOKEN`.

Private Blob is the recommended mode because the stored JSON contains private HMAC identity keys.

### 4. Add environment variables

Open the project, then **Settings** → **Environment Variables**.

Add these variables for **Production**:

| Key | Value |
| --- | --- |
| `ADMIN_USERNAME` | The admin username you want |
| `ADMIN_PASSWORD` | A strong admin password |
| `AUTH_SECRET` | A random secret, 16+ characters; 32+ recommended |
| `FOTGS_BLOB_ACCESS` | `private` |

`BLOB_READ_WRITE_TOKEN` should already exist after Blob is connected. If it does not, reconnect the Blob store to the project.

For preview deployments, add the same variables to **Preview** if you want uploads to work on preview URLs.

### 5. Redeploy

Environment variable changes do not modify already-built deployments.

1. Open **Deployments** in the Vercel project.
2. Select the latest deployment.
3. Select **Redeploy**.
4. Wait for the production deployment to finish.

### 6. Publish data

1. Open `https://<your-project-domain>/admin/login`.
2. Sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
3. Upload the OBIEE export.
4. After publish, open `https://<your-project-domain>/view`.
5. Link your website to `/view`.

Each upload creates a snapshot at `/s/<slug>` and updates `/view` to the newest upload.

## CLI equivalents

After installing Vercel CLI:

```bash
vercel login
vercel link
vercel env add ADMIN_USERNAME production
vercel env add ADMIN_PASSWORD production
vercel env add AUTH_SECRET production
vercel env add FOTGS_BLOB_ACCESS production
vercel env pull .env.local
vercel --prod
```

Create and connect the private Blob store from the Vercel dashboard as described above so the
project receives `BLOB_READ_WRITE_TOKEN`.
