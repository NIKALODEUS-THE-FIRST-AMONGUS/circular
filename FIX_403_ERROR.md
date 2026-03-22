# Fix 403 Forbidden Error - URGENT

## The Problem
Vercel's `NOTIFICATION_SECRET_KEY` environment variable has quotes around it:
- Current value: `"MySuperSecretPassword123!@#"` ❌
- Needed value: `MySuperSecretPassword123!@#` ✅

## The Solution (2 minutes)

### Step 1: Go to Vercel Dashboard
1. Open: https://vercel.com/dashboard
2. Click on your project: **sxl**

### Step 2: Edit Environment Variable
1. Click **Settings** (left sidebar)
2. Click **Environment Variables**
3. Find `NOTIFICATION_SECRET_KEY`
4. Click the **three dots (...)** → **Edit**
5. Remove the quotes from the value:
   - Change from: `"MySuperSecretPassword123!@#"`
   - Change to: `MySuperSecretPassword123!@#`
6. Click **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click the **three dots (...)** on the latest deployment
3. Click **Redeploy**
4. Wait 1-2 minutes for deployment to complete

### Step 4: Test
1. Hard refresh your browser (Ctrl+Shift+R)
2. Create a circular
3. Click "Broadcast"
4. ✅ Notification should send successfully!

## Why This Happens
- `.env` files in Vercel don't need quotes around values
- The quotes become part of the actual value
- Authorization check fails because:
  - Client sends: `Bearer MySuperSecretPassword123!@#`
  - Server expects: `Bearer "MySuperSecretPassword123!@#"`
  - They don't match → 403 Forbidden

## Alternative: Delete and Re-add
If editing doesn't work:
1. Delete `NOTIFICATION_SECRET_KEY` from all environments
2. Add it back with value: `MySuperSecretPassword123!@#` (no quotes)
3. Redeploy
