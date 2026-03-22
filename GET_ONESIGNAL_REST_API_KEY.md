# Get OneSignal REST API Key

## Steps to Find Your REST API Key

1. **Go to OneSignal Dashboard**
   - Visit: https://onesignal.com/
   - Log in to your account

2. **Select Your App**
   - Click on your app: **circular** (or whatever you named it)
   - App ID: `0cc061a3-f282-46e9-b4e5-1b3217adf6e2`

3. **Go to Settings**
   - Click **Settings** in the left sidebar
   - Click **Keys & IDs**

4. **Find REST API Key**
   - Look for **REST API Key** section
   - It should be a long string (looks like: `os_v2_app_xxxxxxxxxxxxx` or similar)
   - Click **Show** or **Copy** button

5. **Update Vercel Environment Variables**
   - Go to Vercel Dashboard: https://vercel.com/dashboard
   - Select project: **sxl**
   - Settings → Environment Variables
   - Find `ONESIGNAL_REST_API_KEY`
   - Replace with the CORRECT REST API Key from OneSignal
   - Also update `VITE_ONESIGNAL_REST_API_KEY` with the same value
   - Save and Redeploy

## Current Issue
The value `ehs57fxbsend5q5oqkplxlnuz` you're using is NOT a valid OneSignal REST API Key.

OneSignal REST API Keys typically look like:
- `os_v2_app_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (newer format)
- Or a long alphanumeric string (older format)

## What You Need
- **App ID**: `0cc061a3-f282-46e9-b4e5-1b3217adf6e2` ✅ (This is correct)
- **REST API Key**: Get from OneSignal Dashboard → Settings → Keys & IDs

## After Getting the Correct Key
1. Update both environment variables in Vercel:
   - `ONESIGNAL_REST_API_KEY`
   - `VITE_ONESIGNAL_REST_API_KEY`
2. Redeploy
3. Test broadcast → Should work! ✅
