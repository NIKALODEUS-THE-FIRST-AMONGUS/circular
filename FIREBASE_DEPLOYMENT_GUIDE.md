# Firebase Deployment Guide

## Quick Start - Deploy Rules to Firebase

### Step 1: Deploy Firestore Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **circular2-15417**
3. Click **Firestore Database** in the left sidebar
4. Click the **Rules** tab
5. Copy the entire contents of `firestore.rules` from your project
6. Paste into the Firebase Console editor
7. Click **Publish**

### Step 2: Deploy Storage Rules

1. In Firebase Console, click **Storage** in the left sidebar
2. Click the **Rules** tab
3. Copy the entire contents of `storage.rules` from your project
4. Paste into the Firebase Console editor
5. Click **Publish**

### Step 3: Verify Deployment

1. Go to **Firestore Database** → **Rules**
2. Verify the rules show your custom rules (not default)
3. Go to **Storage** → **Rules**
4. Verify the rules show your custom rules (not default)

---

## Vercel Environment Variables

### Required Variables

Make sure these are set in Vercel:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyBg2uSfKye-ME8ZBHKs_qvG9gfA_-w-Xas
VITE_FIREBASE_AUTH_DOMAIN=circular2-15417.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=circular2-15417
VITE_FIREBASE_STORAGE_BUCKET=circular2-15417.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=918462031556
VITE_FIREBASE_APP_ID=1:918462031556:web:88ffdef80c820b25e60b91
VITE_FIREBASE_MEASUREMENT_ID=G-JETZ1K7C1V
VITE_FIREBASE_VAPID_KEY=BOcVmhB44EW9ro_mboBqJacwZbu02aaX_bPGQ3HUAi1y8OmrQ681PRXHnEKvHK796VJKKcXG0RJaKri4e2xxZGw

# Admin/Testing Keys (keep these)
VITE_ADMIN_SECRET_KEY=CircularAdmin2024!
VITE_TEACHER_SECRET_KEY=CircularTeacher2024!
VITE_STUDENT_SECRET_KEY=CircularStudent2024!
VITE_MASTER_ADMIN_EMAIL=admin@methodist.edu
```

### How to Set in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Click **Save**
6. Redeploy your application

---

## Testing Checklist

### Before Deploying to Production

- [ ] Test authentication locally
- [ ] Test creating circulars
- [ ] Test uploading files
- [ ] Test viewing circulars
- [ ] Test admin features
- [ ] Check browser console for errors
- [ ] Test on mobile device
- [ ] Verify Firebase rules are deployed

### After Deploying to Production

- [ ] Test authentication on production URL
- [ ] Test all features on production
- [ ] Monitor Firebase Console for errors
- [ ] Check Vercel logs for issues
- [ ] Test with real users
- [ ] Monitor Firebase usage/billing

---

## Firebase Console Monitoring

### What to Monitor

1. **Firestore Database**
   - Go to **Firestore Database** → **Data**
   - Verify collections are being created
   - Check document counts

2. **Authentication**
   - Go to **Authentication** → **Users**
   - Verify users are being created
   - Check sign-in methods

3. **Storage**
   - Go to **Storage** → **Files**
   - Verify files are being uploaded
   - Check storage usage

4. **Usage & Billing**
   - Go to **Usage** tab
   - Monitor reads/writes
   - Check storage usage
   - Verify within free tier limits

---

## Troubleshooting

### "Permission denied" errors

**Solution:** Deploy Firestore and Storage rules

1. Copy `firestore.rules` to Firebase Console
2. Copy `storage.rules` to Firebase Console
3. Click **Publish** for both

### "Document not found" errors

**Solution:** Check collection names

- Firestore collections: `profiles`, `circulars`, `circular_bookmarks`, etc.
- Verify collection names match in code

### "Network error" errors

**Solution:** Check Firebase project settings

1. Verify Firebase project ID matches
2. Check API keys are correct
3. Ensure Firebase services are enabled

### "Auth error" errors

**Solution:** Verify Firebase Auth configuration

1. Go to **Authentication** → **Sign-in method**
2. Enable **Google** provider
3. Enable **Email/Password** provider
4. Add authorized domains (localhost, your-domain.vercel.app)

---

## Data Migration (When Ready)

### Export from Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Export data
supabase db dump --data-only > supabase_data.sql
```

### Transform for Firestore

You'll need to:
1. Convert SQL to JSON
2. Transform table structure to collections
3. Handle relationships (foreign keys → document references)
4. Convert timestamps to Firestore format

### Import to Firebase

Use Firebase Admin SDK or Firestore import tool:

```javascript
// Example import script
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Import data
async function importData(collectionName, data) {
  const batch = db.batch();
  data.forEach(doc => {
    const ref = db.collection(collectionName).doc(doc.id);
    batch.set(ref, doc);
  });
  await batch.commit();
}
```

---

## Rollback Plan (If Needed)

### If Firebase Deployment Fails

1. **Keep Supabase running** - Don't delete Supabase data yet
2. **Revert Vercel env vars** - Switch back to VITE_SUPABASE_*
3. **Redeploy previous version** - Use Vercel rollback feature
4. **Debug issues** - Check Firebase Console logs
5. **Fix and retry** - Address issues and redeploy

### Parallel Running

You can run both Supabase and Firebase in parallel:

1. Keep both sets of environment variables
2. Use feature flags to switch between them
3. Gradually migrate users
4. Monitor both systems

---

## Success Criteria

### Deployment is Successful When:

- ✅ Users can log in with Google OAuth
- ✅ Users can log in with email/password
- ✅ Users can create circulars
- ✅ Users can upload files
- ✅ Users can view circulars
- ✅ Admin features work
- ✅ No console errors
- ✅ Firebase Console shows activity
- ✅ Performance is acceptable (< 2s page loads)

---

## Support Resources

### Firebase Documentation
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Firebase Console](https://console.firebase.google.com/)

### Project Documentation
- `MIGRATION_STATUS.md` - Current progress
- `PHASE_3_COMPLETE.md` - Accomplishments
- `FIREBASE_MIGRATION_PLAN.md` - Detailed plan

---

## Quick Commands

```bash
# Build for production
npm run build

# Test locally
npm run dev

# Lint code
npm run lint

# Deploy to Vercel (automatic on git push)
git push origin main
```

---

**Ready to deploy? Follow the steps above and monitor the Firebase Console for any issues.**

**Estimated deployment time: 30 minutes**
