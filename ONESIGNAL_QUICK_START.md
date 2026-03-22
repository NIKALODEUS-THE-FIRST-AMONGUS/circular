# OneSignal Quick Start Guide

## Current Status
✅ OneSignal SDK integrated  
✅ Service worker configured  
✅ API endpoint created  
✅ Environment variables set in Vercel  

## Environment Variables in Vercel

Make sure these are set in your Vercel project settings:

```
ONESIGNAL_APP_ID=0cc061a3-f282-46e9-b4e5-1b3217adf6e2
ONESIGNAL_REST_API_KEY=ehs57fxbsend5q5oqkplxlnuz
NOTIFICATION_SECRET_KEY=MySuperSecretPassword123!@#
```

## Testing Push Notifications

1. Open your deployed site: https://sxl-lake.vercel.app
2. Allow notifications when prompted
3. Create a new circular
4. Click "Broadcast" button
5. Check if notification appears

## Troubleshooting

### 500 Error on /api/send-notification
- Check Vercel function logs
- Verify environment variables are set
- Check that ONESIGNAL_REST_API_KEY is correct

### 404 Errors (dashboard, favicon)
- These are now fixed with vercel.json rewrites
- Redeploy to apply changes

### Service Worker Warnings
- "Could not get ServiceWorkerRegistration" - Harmless, OneSignal SDK internal
- "SDK already initialized" - Harmless, happens on hot reload
- "Event handler of 'message'" - Harmless, OneSignal SDK warning

## Files Modified
- `api/send-notification.js` - OneSignal API integration
- `src/lib/onesignal-config.js` - SDK initialization
- `public/OneSignalSDKWorker.js` - Service worker
- `index.html` - SDK script tag
- `vercel.json` - SPA routing fix
