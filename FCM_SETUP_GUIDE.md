# Firebase Cloud Messaging (FCM) Setup Guide

## Current Issue
You're getting a 401 Unauthorized error because the Firebase Cloud Messaging API is not enabled in your Firebase project.

## Steps to Fix

### 1. Enable Firebase Cloud Messaging API
1. Go to: https://console.firebase.google.com/project/circular2-15417/settings/cloudmessaging
2. Click on "Cloud Messaging" tab
3. Enable the "Firebase Cloud Messaging API (V1)"
4. Wait 1-2 minutes for the API to activate

### 2. Verify VAPID Key
1. In Firebase Console, go to Project Settings > Cloud Messaging
2. Under "Web Push certificates", you should see your VAPID key
3. Verify it matches the one in your `.env` file:
   ```
   VITE_FIREBASE_VAPID_KEY=BHTXcDcDvCoVrOCSNIrBUNa9ROXsLmbLKa2KdY3l55LJdabuosfseySlovfnm-M8XL51tfDH5Ztl3ZkZSzBufos
   ```

### 3. Enable Required APIs in Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/library?project=circular2-15417
2. Search for and enable these APIs:
   - **Firebase Cloud Messaging API**
   - **Firebase Installations API**
   - **FCM Registration API**

### 4. Check Service Worker
Make sure `public/firebase-messaging-sw.js` exists and is properly configured.

### 5. Test Notifications
After enabling the APIs:
1. Refresh your app
2. Click "Allow" when prompted for notification permission
3. Check console for: "✅ FCM token generated successfully"

## Troubleshooting

### Still getting 401 errors?
- Wait 5-10 minutes after enabling APIs
- Clear browser cache and reload
- Check Firebase project billing (FCM requires Blaze plan for production)

### Permission denied?
- Check browser notification settings
- Try in incognito mode
- Ensure HTTPS is being used (localhost is OK)

### Service Worker not registering?
- Check browser console for SW errors
- Verify `firebase-messaging-sw.js` is in the `public` folder
- Make sure the file is accessible at `/firebase-messaging-sw.js`

## Quick Enable Command
Run this to enable the API via gcloud CLI (if you have it installed):
```bash
gcloud services enable fcmregistrations.googleapis.com --project=circular2-15417
gcloud services enable fcm.googleapis.com --project=circular2-15417
```

## Current Status
- ✅ Code is properly configured
- ✅ VAPID key is set
- ✅ Service worker is registered
- ❌ FCM API needs to be enabled in Firebase Console

Once you enable the API, notifications will work automatically!
