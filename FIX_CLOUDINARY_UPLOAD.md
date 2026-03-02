# Fix Cloudinary Upload Error (400 Bad Request)

## Problem
Getting 400 Bad Request when uploading images to Cloudinary. This means the upload preset isn't configured correctly.

## Solution: Configure Upload Preset

### Step 1: Go to Cloudinary Settings
1. Open: https://console.cloudinary.com/settings/upload
2. Or: Cloudinary Dashboard → Settings → Upload

### Step 2: Find Your Upload Preset
Look for the preset named: `circular_attachments`

If it doesn't exist, create it:
1. Click "Add upload preset"
2. Name it: `circular_attachments`

### Step 3: Configure the Preset

**CRITICAL SETTINGS:**

1. **Signing Mode:** 
   - Select: **"Unsigned"** ✅
   - This allows uploads from the browser without authentication

2. **Folder:**
   - Leave empty or set to: `circular`
   - The app will specify folders per upload type

3. **Allowed formats:**
   - Images: jpg, png, gif, webp
   - Documents: pdf, doc, docx, xls, xlsx

4. **Transformations (Optional):**
   - For avatars: `c_fill,g_face,h_200,w_200`
   - For images: `q_auto,f_auto`

5. **Access Mode:**
   - Select: **"Public"** ✅

6. **Unique filename:**
   - Enable: **Yes** ✅
   - Prevents filename conflicts

### Step 4: Save the Preset
Click "Save" at the bottom

### Step 5: Verify Configuration

The preset should have:
- ✅ Signing Mode: Unsigned
- ✅ Access Mode: Public
- ✅ Unique filename: Enabled
- ✅ Name: circular_attachments

### Step 6: Test Upload

1. Refresh your app
2. Go to Profile page
3. Try uploading an avatar
4. Should work without 400 error

## Alternative: Use Existing Preset

If you have another unsigned preset, you can use it:

1. Find an existing unsigned preset in Cloudinary
2. Update `.env`:
   ```
   VITE_CLOUDINARY_UPLOAD_PRESET=your-existing-preset-name
   ```
3. Restart dev server: `npm run dev`

## Common Issues

### Issue: "Upload preset must be unsigned"
**Fix:** Change Signing Mode to "Unsigned" in preset settings

### Issue: "Invalid upload preset"
**Fix:** Verify the preset name matches exactly (case-sensitive)

### Issue: "Upload preset not found"
**Fix:** Create the preset in Cloudinary console

### Issue: "Access denied"
**Fix:** Set Access Mode to "Public" in preset settings

## Quick Fix: Create New Preset

If the existing preset is broken, create a new one:

1. Go to: https://console.cloudinary.com/settings/upload
2. Click "Add upload preset"
3. Configure:
   - **Preset name:** `circular_app_uploads`
   - **Signing mode:** Unsigned
   - **Access mode:** Public
   - **Unique filename:** Yes
4. Save
5. Update `.env`:
   ```
   VITE_CLOUDINARY_UPLOAD_PRESET=circular_app_uploads
   ```
6. Restart: `npm run dev`

## Verify Your Settings

Your `.env` should have:
```
VITE_CLOUDINARY_CLOUD_NAME=dzw0mxfzq
VITE_CLOUDINARY_UPLOAD_PRESET=circular_attachments
```

Both values must be correct and the preset must be **unsigned**.

---

**After fixing:** Refresh your app and try uploading again. The 400 error should be gone.
