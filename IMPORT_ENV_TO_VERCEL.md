# Import Environment Variables to Vercel

## Quick Steps (2 minutes)

### Method 1: Import .env.vercel File (EASIEST)
1. Go to https://vercel.com/dashboard
2. Select your project: **sxl**
3. Click **Settings** → **Environment Variables**
4. Click **Import .env File** button (top right)
5. Select the file: `.env.vercel` from your project
6. Choose environments: **Production, Preview, Development**
7. Click **Import**
8. Go to **Deployments** → Click **...** → **Redeploy**

### Method 2: Manual Update (if import doesn't work)
Just update these 3 variables (remove quotes):

1. **NOTIFICATION_SECRET_KEY**
   - Old: `"MySuperSecretPassword123!@#"`
   - New: `MySuperSecretPassword123!@#`

2. **ONESIGNAL_APP_ID**
   - Value: `0cc061a3-f282-46e9-b4e5-1b3217adf6e2`

3. **ONESIGNAL_REST_API_KEY**
   - Value: `ehs57fxbsend5q5oqkplxlnuz`

Then **Redeploy**.

## After Import
1. Go to **Deployments** tab
2. Click **...** on latest deployment
3. Click **Redeploy**
4. Wait 1-2 minutes
5. Hard refresh browser (Ctrl+Shift+R)
6. Test broadcast → Should work! ✅

## File Location
The `.env.vercel` file is in your project root with all correct values (no quotes).
