# Deployment & Operations Manual: Smart Workforce Operations System

This guide outlines setup procedures, database maintenance, key rotations, and monitoring instructions for deploying to cloud environments.

---

## 1. Environment Configurations

Configure these environment variables in your hosting provider:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key used for signing session cookies | `openssl rand -base64 32` |
| `NODE_ENV` | Environment identifier | `production` |
| `INIT_ADMIN_USERNAME` | First Administrator username | `admin` |
| `INIT_ADMIN_PASSWORD` | First Administrator password | `SecurePassword123` |
| `NEXT_PUBLIC_APP_URL` | Live production canonical domain | `https://workforce.onrender.com` |

---

## 2. Render Deployment (Prisma Migrations & Builds)

The platform is designed to deploy using a Render Blueprint (`render.yaml`).

### Step-by-Step Deployment:
1. Link your private GitHub repository to Render.
2. Select the **Blueprint** options.
3. Configure the build command:
   ```bash
   npm install && npx prisma generate && npx prisma migrate deploy && npm run build
   ```
4. Configure the start command:
   ```bash
   npm run start
   ```

### Updating NEXT_PUBLIC_APP_URL:
1. Once Render generates your live URL (e.g. `https://workforce.onrender.com`), navigate to the **Environment** settings in Render.
2. Update the `NEXT_PUBLIC_APP_URL` variable to this domain.
3. Save changes. Render will rebuild and trigger a rolling update.

---

## 3. Post-Deployment Setup & Workplace Geofencing

### QR Code Poster Updates:
1. Log in to the management backend at `/admin/login` using your configured admin credentials.
2. Navigate to the **打卡 QR Code** page (or access `/admin/qr-code` directly).
3. The page automatically generates a QR code pointing to `https://[Domain]/clock?token=[workplaceToken]`.
4. Click **列印打卡海報 (Print Poster)** or download the high-resolution QR image and post it on the shop floor.

### Regenerating QR Codes & Tokens:
If a check-in QR code is leaked or shared outside the workplace, regenerate the token immediately:
1. Go to the **工作地設定 (Workplace Settings)** page.
2. Click **重新產生 Token (Regenerate Token)**.
3. This invalidates the old URL instantly and updates the QR Code poster.
4. Download and reprint the new poster for the shop floor.

### Updating GPS Latitude/Longitude:
To align the geofence with your physical shop floor:
1. Go to the **工作地設定 (Workplace Settings)** page.
2. Paste the exact coordinates from Google Maps (6 decimal places) into the **經度 (Longitude)** and **緯度 (Latitude)** fields.
3. Adjust the **允許半徑 (Allowed Radius)** and **警告半徑 (Warning Radius)**.
4. Click **儲存設定 (Save Settings)**.

---

## 4. Key Rotation & Security Practices

### Rotating JWT_SECRET:
Rotate the JWT secret key to invalidate all active administrator sessions:
1. Generate a new key:
   ```bash
   openssl rand -base64 32
   ```
2. Replace the `JWT_SECRET` variable in Render Environment Settings.
3. Save changes to redeploy. Admins will be forced to log in again.

---

## 5. PostgreSQL Backup & Restore

### Database Backup:
Create a compressed binary dump of the PostgreSQL database using `pg_dump`:

```bash
pg_dump -d "YOUR_EXTERNAL_DATABASE_URL" -F c -b -v -f "workforce_backup_$(date +%F).dump"
```

### Database Restore:
Restore the backup file using `pg_restore`:

```bash
pg_restore -d "YOUR_EXTERNAL_DATABASE_URL" -v -c --clean "workforce_backup_2026-06-22.dump"
```
*Note: The `-c --clean` flag drops existing tables before recreating them to ensure a clean restoration.*

---

## 6. Health Monitoring Endpoint

The system includes a `/api/health` monitoring endpoint for uptime verification:
- **Success (`200 OK`)**: Database is connected. Returns:
  ```json
  {
    "status": "UP",
    "database": "connected",
    "timestamp": "2026-06-22T11:15:00.000Z",
    "version": "0.1.0"
  }
  ```
- **Failure (`500 Internal Error`)**: Database connection is down. Returns:
  ```json
  {
    "status": "DOWN",
    "database": "disconnected",
    "timestamp": "2026-06-22T11:15:00.000Z",
    "version": "0.1.0"
  }
  ```
  Render's health monitoring will automatically restart the service if the endpoint returns a 500 status code.
