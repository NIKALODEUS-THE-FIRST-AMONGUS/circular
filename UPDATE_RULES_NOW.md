# 🔴 URGENT: Update Firestore Rules Now

## The Problem
Your app is getting "Missing or insufficient permissions" because the Firestore rules haven't been updated yet.

## The Solution (2 minutes)

### Step 1: Open Firebase Console Rules Editor
Click this link: https://console.firebase.google.com/project/circular2-15417/firestore/rules

### Step 2: Replace ALL the rules with this:

```
v
```

### Step 3: Click "Publish" button (top right)

### Step 4: Refresh your app

## What This Fixes
- ✅ Allows bootstrap check (first user detection)
- ✅ Fixes "Missing or insufficient permissions" error
- ✅ App will work properly

## The Key Change
Line 33: `allow list: if true;` - This allows counting profiles without authentication, which is needed for the first-time setup check.

---

**DO THIS NOW** - Your app won't work until you update these rules!
