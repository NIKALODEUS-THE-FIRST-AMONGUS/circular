# OneSignal Quick Start - 5 Minutes Setup

## What You Need to Do:

### 1. Create OneSignal Account (2 minutes)
- Go to https://onesignal.com/
- Sign up free
- Create new app/project called "SuchnaX Link"
- Choose "Web" platform

### 2. Get Your Credentials (1 minute)
After creating the app:
- Go to **Settings** (gear icon) > **Keys & IDs**
- Copy your **App ID**
- Copy your **REST API Key**

### 3. Add to .env File (1 minute)
Add these two lines to your `.env` file:

```env
VITE_ONESIGNAL_APP_ID=paste-your-app-id-here
VITE_ONESIGNAL_REST_API_KEY=paste-your-rest-api-key-here
```

### 4. Add to Vercel Environment Variables (1 minute)
Go to Vercel project > Settings > Environment Variables:

```
ONESIGNAL_APP_ID=paste-your-app-id-here
ONESIGNAL_REST_API_KEY=paste-your-rest-api-key-here
VITE_APP_URL=https://your-domain.vercel.app
```

Then **redeploy** your app.

### 5. Restart Dev Server (1 minute)
```bash
# Stop current server (Ctrl + C)
npm run dev
```

### 6. Test It!
- Open your app
- Log in
- Allow notifications when prompted
- Create a test circular with:
  - Title: "Test Notification"
  - Content: "This is a test message"
  - Attach an image (optional)
- Click "Broadcast" (publish button)
- You should receive a push notification showing:
  - ✅ Exact title
  - ✅ Full content
  - ✅ Image (if attached)

## That's It!

OneSignal is now integrated and will:
- ✅ Show the exact circular title in notification
- ✅ Show the full circular content/message
- ✅ Display attached images in notification
- ✅ Work even when the app is closed
- ✅ Support up to 30,000 users for free
- ✅ No Firebase Blaze plan needed!

## Need Help?

See the full guide: `ONESIGNAL_SETUP_GUIDE.md`
