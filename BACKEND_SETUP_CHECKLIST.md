# Backend Setup Checklist - Firebase

## 🚨 CRITICAL - Must Do Before Testing

### 1. Deploy Firestore Security Rules ⚠️

**Status:** NOT DEPLOYED YET

**Why Critical:** Without rules, your database won't work. Users can't read/write data.

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **circular2-15417**
3. Click **Firestore Database** in left sidebar
4. Click **Rules** tab at the top
5. You'll see default rules - DELETE THEM ALL
6. Open `firestore.rules` file in your project
7. Copy ENTIRE contents (all 100+ lines)
8. Paste into Firebase Console editor
9. Click **Publish** button
10. Wait for "Rules published successfully" message

**Verify:**
- Rules tab should show your custom rules
- Should see functions like `isAuthenticated()`, `isAdmin()`, etc.

---

### 2. Deploy Storage Security Rules ⚠️

**Status:** NOT NEEDED - Using Cloudinary for all storage

**Why:** We're using Cloudinary (not Firebase Storage) for all files (images, PDFs, docs). Cloudinary handles security through upload presets.

**Action:** Skip this step - Firebase Storage rules not needed.

**Note:** If you want to use Firebase Storage in the future, you can deploy `storage.rules` later.

---

### 3. Enable Firebase Services ✅

**Check these are enabled:**

#### Authentication
1. Go to **Authentication** in Firebase Console
2. Click **Sign-in method** tab
3. Verify these are ENABLED:
   - ✅ Google (should show as enabled)
   - ✅ Email/Password (should show as enabled)
4. Click **Settings** tab
5. Under **Authorized domains**, verify:
   - ✅ localhost
   - ✅ circular2-15417.firebaseapp.com
   - ✅ Your Vercel domain (if deployed)

#### Firestore Database
1. Go to **Firestore Database**
2. Should see "Cloud Firestore" (not "Realtime Database")
3. Should be in **Production mode**
4. Location: Should be set (e.g., us-central1)

#### Storage
1. Go to **Storage**
2. **NOT NEEDED** - We're using Cloudinary instead
3. Firebase Storage can remain disabled or enabled (doesn't matter)

**Note:** All files (images, PDFs, Word docs) are stored in Cloudinary (25 GB free).

---

### 4. Setup Cloudinary (REQUIRED) ⚠️

**Status:** NEEDS CONFIGURATION

**Why Critical:** All file uploads (images, PDFs, Word docs) go to Cloudinary.

**Steps:**
1. Go to [Cloudinary Console](https://console.cloudinary.com/)
2. Login with your account (Cloud Name: dzw0mxfzq)
3. Go to **Settings** → **Upload** → **Upload presets**
4. Find preset: `circular-attachments`
5. Click **Edit**
6. Change **Signing Mode** from "Signed" to **"Unsigned"**
7. Verify **Allowed formats** includes: `jpg, png, jpeg, gif, webp, pdf, doc, docx, xls, xlsx`
8. Verify **Max file size** is at least 10 MB
9. Click **Save**

**Verify:**
- Upload preset is set to "Unsigned" mode
- Allowed formats include documents (pdf, doc, docx, etc.)
- Max file size is 10 MB or higher

---

### 5. Create Storage Buckets (NOT NEEDED)

**Status:** SKIP - Using Cloudinary instead

We're not using Firebase Storage, so no buckets needed. All files go to Cloudinary.

---

### 5. Set Up Indexes (Optional but Recommended)

**Why:** Firestore needs indexes for complex queries.

**When to do:** After first test, Firebase will tell you which indexes are needed.

**How:**
1. Test your app locally
2. Check browser console for errors like:
   ```
   The query requires an index. You can create it here: https://console.firebase.google.com/...
   ```
3. Click the link in the error
4. Firebase will create the index automatically

**Common indexes needed:**
- `circulars` collection: `status` + `created_at` (descending)
- `circular_acknowledgments`: `circular_id` + `created_at`
- `circular_bookmarks`: `user_id` + `created_at`

---

### 6. Verify Environment Variables

**Local (.env file):**
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyBg2uSfKye-ME8ZBHKs_qvG9gfA_-w-Xas
VITE_FIREBASE_AUTH_DOMAIN=circular2-15417.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=circular2-15417
VITE_FIREBASE_STORAGE_BUCKET=circular2-15417.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=918462031556
VITE_FIREBASE_APP_ID=1:918462031556:web:88ffdef80c820b25e60b91
VITE_FIREBASE_MEASUREMENT_ID=G-JETZ1K7C1V

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=dzw0mxfzq
VITE_CLOUDINARY_UPLOAD_PRESET=circular-attachments
```

**Vercel (when deploying):**
- Same variables as above
- Add in Vercel Dashboard → Settings → Environment Variables

---

### 7. Test Backend Setup

**After deploying rules, test these:**

#### Test 1: Authentication
```bash
npm run dev
```
1. Go to http://localhost:5173
2. Try logging in with Google
3. Check Firebase Console → Authentication → Users
4. Should see new user created

#### Test 2: Firestore Write
1. After logging in, check browser console
2. Should see profile created in Firestore
3. Go to Firebase Console → Firestore Database → Data
4. Should see `profiles` collection with your user

#### Test 3: Firestore Read
1. Navigate to Dashboard
2. Should load without "permission denied" errors
3. Check browser console for errors

#### Test 4: File Upload (Cloudinary)
1. Go to Create Circular page
2. Try uploading an image
3. Should see console: `📤 Uploading image to Cloudinary: filename.jpg`
4. Should upload successfully
5. Try uploading a PDF
6. Should see console: `📤 Uploading document to Cloudinary: filename.pdf`
7. Should upload successfully
8. Check [Cloudinary Console](https://console.cloudinary.com/) → Media Library
9. Should see files in `circular-attachments` folder

---

## 🎯 Quick Setup (20 minutes)

### Do This Right Now:

1. **Deploy Firestore Rules** (5 min)
   - Firebase Console → Firestore Database → Rules
   - Copy from `firestore.rules` → Paste → Publish

2. **Setup Cloudinary Upload Preset** (5 min)
   - Cloudinary Console → Settings → Upload → Upload presets
   - Edit `circular-attachments` preset
   - Change "Signed" to "Unsigned"
   - Save

3. **Verify Services Enabled** (2 min)
   - Check Authentication has Google + Email/Password
   - Check Firestore Database exists
   - (Firebase Storage not needed - using Cloudinary)

4. **Test Locally** (8 min)
   ```bash
   npm run dev
   ```
   - Try logging in
   - Try uploading image and PDF
   - Check console for errors

---

## ❌ Common Errors & Solutions

### "Missing or insufficient permissions"
**Cause:** Firestore rules not deployed
**Solution:** Deploy `firestore.rules` to Firebase Console

### "Storage: User does not have permission"
**Cause:** Not applicable - we're using Cloudinary
**Solution:** Check Cloudinary upload preset is set to "Unsigned"

### "The query requires an index"
**Cause:** Firestore needs index for complex query
**Solution:** Click the link in error message, Firebase creates index automatically

### "Firebase: Error (auth/unauthorized-domain)"
**Cause:** Domain not authorized in Firebase Auth
**Solution:** Firebase Console → Authentication → Settings → Authorized domains → Add your domain

---

## ✅ Success Checklist

After setup, verify:

- [ ] Firestore rules deployed (check Rules tab)
- [ ] Cloudinary upload preset set to "Unsigned"
- [ ] Can log in with Google
- [ ] Can log in with email/password
- [ ] Profile created in Firestore
- [ ] No "permission denied" errors
- [ ] Can upload images (Cloudinary)
- [ ] Can upload PDFs (Cloudinary)
- [ ] Can upload Word docs (Cloudinary)
- [ ] Dashboard loads without errors

---

## 📞 Need Help?

### Firebase Console Links:
- [Project Overview](https://console.firebase.google.com/project/circular2-15417)
- [Firestore Rules](https://console.firebase.google.com/project/circular2-15417/firestore/rules)
- [Storage Rules](https://console.firebase.google.com/project/circular2-15417/storage/rules)
- [Authentication](https://console.firebase.google.com/project/circular2-15417/authentication/users)

### Documentation:
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security)

---

**Next Step:** Deploy Firestore and Storage rules (15 minutes)

**Then:** Test locally with `npm run dev`

**Finally:** Deploy to production when everything works!
