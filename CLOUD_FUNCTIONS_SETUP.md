# Automated Cleanup Setup Guide

This project needs automated maintenance tasks for audit logs and deleted circulars. Since Firebase Cloud Functions require a paid plan, here are FREE alternatives.

## Option 1: Client-Side Cleanup (Recommended - 100% Free)

Run cleanup when admins visit the Audit Logs page. No external services needed.

### Implementation

The cleanup logic runs automatically in the background when an admin opens the Audit Logs page. It checks if cleanup is needed (once per day) and runs silently without blocking the UI.

**Pros**:
- Completely free
- No external dependencies
- Works on Firebase Spark (free) plan
- Automatic when admins use the app

**Cons**:
- Requires admin to visit Audit Logs page at least once per day
- Cleanup happens during user session (but non-blocking)

### Setup
Already implemented! Just ensure admins visit the Audit Logs page regularly.

---

## Option 2: GitHub Actions (Free for Public Repos)

Use GitHub Actions to run cleanup scripts on a schedule.

### Setup Instructions

1. **Create cleanup script** (`scripts/cleanup-audit-logs.js`):
```javascript
// Already created in your project
```

2. **Add GitHub Action** (`.github/workflows/cleanup.yml`):
```yaml
name: Database Cleanup
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install firebase-admin
      - run: node scripts/cleanup-audit-logs.js
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
```

3. **Add Firebase credentials to GitHub Secrets**:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate new private key
   - Copy the JSON content
   - Go to GitHub repo → Settings → Secrets → New repository secret
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: Paste the JSON

**Pros**:
- Free for public repos (2,000 minutes/month for private)
- Reliable scheduling
- No user interaction needed

**Cons**:
- Requires GitHub repository
- Need to manage service account credentials

---

## Option 3: Vercel Cron Jobs (Free Tier)

Use Vercel's cron jobs if you're already hosting on Vercel.

### Setup Instructions

1. **Create API route** (`api/cleanup.js`):
```javascript
// Already created in your project
```

2. **Add to vercel.json**:
```json
{
  "crons": [{
    "path": "/api/cleanup",
    "schedule": "0 2 * * *"
  }]
}
```

3. **Set environment variables in Vercel**:
   - Add Firebase service account JSON as `FIREBASE_SERVICE_ACCOUNT`

**Pros**:
- Free on Vercel hobby plan
- Integrated with your hosting
- Reliable execution

**Cons**:
- Only works if hosting on Vercel
- Limited to 1 cron job on free tier

---

## Option 4: EasyCron (Free Tier)

Use a free external cron service to trigger cleanup.

### Setup Instructions

1. **Create public API endpoint** (`api/cleanup.js`)
2. **Add authentication token** to verify requests
3. **Sign up at EasyCron.com** (free tier: 1 cron job)
4. **Create cron job** pointing to your API endpoint

**Pros**:
- Works with any hosting
- Simple setup
- Reliable

**Cons**:
- Requires public API endpoint
- Need to secure with authentication token
- Limited to 1 job on free tier

---

## Recommended Approach

**For most users**: Use **Option 1 (Client-Side Cleanup)**
- Zero cost
- Zero configuration
- Works immediately
- Just ensure admins check Audit Logs regularly

**For production apps**: Use **Option 2 (GitHub Actions)** or **Option 3 (Vercel Cron)**
- More reliable
- No user interaction needed
- Still free

---

## Cleanup Tasks

### 1. Audit Log Cleanup
**Frequency**: Daily  
**Action**: Delete logs older than 30 days, create summary

### 2. Deleted Circular Cleanup
**Frequency**: Weekly  
**Action**: Permanently delete circulars in "deleted" status for 90+ days

---

## Manual Cleanup

Admins can manually trigger cleanup from the Audit Logs page:
1. Go to Dashboard → Audit Logs
2. Click "Settings" icon
3. Click "Run Cleanup Now"

---

## Monitoring

Check cleanup status in:
- Audit Logs page → Archives tab (view summaries)
- Browser console (cleanup logs)
- GitHub Actions logs (if using Option 2)
- Vercel logs (if using Option 3)

---

## Cost Comparison

| Option | Cost | Reliability | Setup Difficulty |
|--------|------|-------------|------------------|
| Client-Side | $0 | Medium | Easy |
| GitHub Actions | $0 | High | Medium |
| Vercel Cron | $0 | High | Easy |
| EasyCron | $0 | High | Medium |
| Firebase Functions | $0-25/mo | High | Easy |

---

## Files Created

- `src/utils/clientCleanup.js` - Client-side cleanup logic
- `scripts/cleanup-audit-logs.js` - Standalone cleanup script
- `api/cleanup.js` - API endpoint for external cron
- `.github/workflows/cleanup.yml` - GitHub Actions workflow (optional)

All files are ready to use based on your chosen option!
