# OneSignal Push Notifications Setup Guide

## Why OneSignal?
- ✅ Free up to 30,000 subscribers (updated 2024)
- ✅ Works on any plan (no Firebase Blaze needed)
- ✅ Easy integration
- ✅ Better delivery rates than FCM
- ✅ Multi-platform support
- ✅ Shows full content + images in notifications

## Step 1: Create OneSignal Account

1. Go to https://onesignal.com/
2. Click "Get Started Free"
3. Sign up with your email or Google account
4. Verify your email

## Step 2: Create a New App

1. After logging in, you'll see the dashboard
2. Click "New App/Project" or the "+" button
3. Enter app name: **SuchnaX Link**
4. Click "Create"

## Step 3: Select Platform

1. You'll see platform options
2. Select **"Web"** (globe icon)
3. Click "Next" or "Configure"

## Step 4: Configure Web Push

### Site Configuration:
1. **Site Name**: SuchnaX Link
2. **Site URL**: 
   - For development: `http://localhost:5173`
   - For production: `https://yourdomain.com`
3. **Auto Resubscribe**: Toggle ON (recommended)
4. **Default Icon URL**: `https://yourdomain.com/logo.svg` (optional)

### Integration Method:
1. Choose **"Typical Site"** (not WordPress)
2. OneSignal will show you the App ID - **COPY THIS!**

## Step 5: Get Your Credentials

### App ID:
1. On the dashboard, look for **"App ID"** at the top
2. Or go to **Settings** (gear icon) > **Keys & IDs**
3. Copy your **App ID** (looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
4. Add to `.env`:
   ```env
   VITE_ONESIGNAL_APP_ID=your-app-id-here
   ```

### REST API Key:
1. Still in **Settings > Keys & IDs**
2. Scroll down to find **REST API Key**
3. Click "Show" or copy the key
4. Add to `.env`:
   ```env
   VITE_ONESIGNAL_REST_API_KEY=your-rest-api-key-here
   ```

## Step 6: Add Environment Variables to Vercel

Since the notification API runs on Vercel, you need to add these:

1. Go to your Vercel project dashboard
2. Click **Settings** > **Environment Variables**
3. Add these variables:
   - `ONESIGNAL_APP_ID` = your-app-id
   - `ONESIGNAL_REST_API_KEY` = your-rest-api-key
   - `VITE_APP_URL` = your-production-url (e.g., https://suchnalink.vercel.app)
4. Click **Save**
5. **Redeploy** your app for changes to take effect

## Step 7: Test Notifications

### Local Testing:
1. Make sure `.env` has OneSignal credentials
2. Restart dev server: `npm run dev`
3. Log in to your app
4. Allow notifications when prompted
5. Create a new circular and click "Broadcast"
6. Check if notification appears with:
   - ✅ Exact title
   - ✅ Full content
   - ✅ Image (if attached)

### Production Testing:
1. Deploy to Vercel
2. Make sure environment variables are set
3. Test the same way as local

## How It Works

When you click "Broadcast" (publish a circular):
1. Circular is saved to Firestore
2. API sends notification to OneSignal
3. OneSignal delivers to all subscribed users
4. Notification shows:
   - **Title**: Exact circular title
   - **Content**: Full circular message
   - **Image**: First attached image (if any)
   - **Action**: Click to view circular

## Notification Features

- **Big Picture**: Shows attached image in expanded view
- **Large Icon**: Shows image as icon
- **Action Button**: "View Details" button
- **Priority**: Urgent circulars get higher priority
- **URL**: Opens circular detail page when clicked

## Troubleshooting

### "OneSignal not configured" error?
- Check if `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` are in Vercel environment variables
- Redeploy after adding variables

### Notifications not received?
1. Check browser notification permission
2. Verify user is subscribed (check browser console)
3. Check OneSignal dashboard > Delivery > Recent Notifications
4. Make sure you're not in "Do Not Disturb" mode

### Image not showing?
- Make sure image URL is publicly accessible
- Check if image is HTTPS (required for web push)
- Verify image format (JPG, PNG, GIF supported)

### "Failed to send notification" error?
- Verify REST API Key is correct
- Check Vercel function logs for details
- Ensure OneSignal account is active

## Production Checklist

Before going live:

- [ ] Update Site URL in OneSignal to production domain
- [ ] Add OneSignal credentials to Vercel environment variables
- [ ] Set `VITE_APP_URL` in Vercel to production URL
- [ ] Test notification on production
- [ ] Verify images load correctly
- [ ] Check notification delivery in OneSignal dashboard

## Pricing

OneSignal Free Tier (2024):
- **30,000 subscribers** (increased from 10,000!)
- **Unlimited notifications**
- **All features unlocked**
- **No credit card required**
- **Email support**

Perfect for educational institutions!

## Support

- OneSignal Docs: https://documentation.onesignal.com/
- OneSignal Support: support@onesignal.com
- Community: https://community.onesignal.com/

## What Changed in OneSignal UI?

The new OneSignal dashboard (2024) is simpler:
- No more "App" vs "Website" distinction
- Unified dashboard for all platforms
- Easier credential management
- Better analytics and delivery tracking

That's it! Your push notifications now show the full circular content with images 🎉
