# Update Vercel Environment Variables

## Problem
The `.env` file was updated to remove quotes, but Vercel still has the old value with quotes.

## Solution
Update the environment variable in Vercel Dashboard:

### Steps:
1. Go to https://vercel.com/dashboard
2. Select your project: `sxl-lake`
3. Go to **Settings** → **Environment Variables**
4. Find `NOTIFICATION_SECRET_KEY`
5. Click **Edit**
6. Change value from: `"MySuperSecretPassword123!@#"` (with quotes)
7. Change value to: `MySuperSecretPassword123!@#` (without quotes)
8. Save changes
9. **Redeploy** the project (Settings → Deployments → click "..." → Redeploy)

### Alternative: Use Vercel CLI
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login
vercel login

# Update environment variable
vercel env rm NOTIFICATION_SECRET_KEY production
vercel env add NOTIFICATION_SECRET_KEY production
# When prompted, enter: MySuperSecretPassword123!@#

# Redeploy
vercel --prod
```

## Current Values (without quotes):
```
NOTIFICATION_SECRET_KEY=MySuperSecretPassword123!@#
ONESIGNAL_APP_ID=0cc061a3-f282-46e9-b4e5-1b3217adf6e2
ONESIGNAL_REST_API_KEY=ehs57fxbsend5q5oqkplxlnuz
```

## After Update
The 403 Forbidden error will be resolved and notifications will send successfully.
