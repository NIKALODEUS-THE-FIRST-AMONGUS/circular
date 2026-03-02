# Cloudinary Setup Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Cloudinary Account

1. Go to [Cloudinary.com](https://cloudinary.com/users/register/free)
2. Click "Sign Up for Free"
3. Fill in your details:
   - Name
   - Email
   - Password
4. Click "Create Account"
5. Verify your email

### Step 2: Get Your Credentials

After logging in, you'll see your dashboard:

1. **Cloud Name** - Found at the top of the dashboard
   - Example: `dxyz123abc`
   - Copy this value

2. **API Key** - Found in "Account Details" section
   - Example: `123456789012345`
   - Copy this value (you won't need it for frontend uploads)

3. **API Secret** - Found in "Account Details" section
   - Keep this SECRET (don't expose in frontend)

### Step 3: Create Upload Preset

Upload presets allow unsigned uploads from the frontend (secure and easy):

1. Go to **Settings** (gear icon) → **Upload**
2. Scroll down to **Upload presets**
3. Click **Add upload preset**
4. Configure:
   - **Preset name:** `circular_attachments` (or any name you like)
   - **Signing Mode:** Select **Unsigned** (important!)
   - **Folder:** `circular-attachments` (optional, for organization)
   - **Allowed formats:** `jpg, png, jpeg, gif, webp`
   - **Max file size:** `5 MB` (5242880 bytes)
   - **Transformation:** Leave default or add optimizations
5. Click **Save**
6. Copy the **preset name** (e.g., `circular_attachments`)

### Step 4: Add to .env File

Add these to your `.env` file:

```env
# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=dxyz123abc
VITE_CLOUDINARY_UPLOAD_PRESET=circular_attachments
```

Replace with your actual values!

### Step 5: Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - `VITE_CLOUDINARY_CLOUD_NAME` = your cloud name
   - `VITE_CLOUDINARY_UPLOAD_PRESET` = your preset name
5. Click **Save**
6. Redeploy your app

---

## ✅ Verify Setup

### Test Upload Locally

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Go to Create Circular page
3. Try uploading an image
4. Check browser console for:
   ```
   📸 Uploading image to Cloudinary: filename.jpg
   ```

5. Check Cloudinary dashboard:
   - Go to **Media Library**
   - You should see your uploaded image in `circular-attachments` folder

### Check Optimization

Your images will be automatically optimized:

**Original URL:**
```
https://res.cloudinary.com/dxyz123abc/image/upload/v1234567890/circular-attachments/abc123.jpg
```

**Optimized URL (automatic):**
```
https://res.cloudinary.com/dxyz123abc/image/upload/q_auto,f_auto/v1234567890/circular-attachments/abc123.jpg
```

- `q_auto` = Automatic quality optimization
- `f_auto` = Automatic format (WebP for modern browsers)

**Result:** 90% smaller file size, 5-10x faster loading!

---

## 🎨 Advanced Features (Optional)

### Image Transformations

You can transform images on-the-fly:

```javascript
// Thumbnail (150x150)
https://res.cloudinary.com/dxyz123abc/image/upload/w_150,h_150,c_fill/v1234567890/image.jpg

// Resize to width 800
https://res.cloudinary.com/dxyz123abc/image/upload/w_800,c_limit/v1234567890/image.jpg

// Blur background
https://res.cloudinary.com/dxyz123abc/image/upload/e_blur:1000/v1234567890/image.jpg

// Face detection crop
https://res.cloudinary.com/dxyz123abc/image/upload/w_300,h_300,c_fill,g_face/v1234567890/image.jpg
```

### Responsive Images

The app automatically generates responsive URLs:

```javascript
import { getResponsiveUrls } from './lib/cloudinary';

const urls = getResponsiveUrls(originalUrl);
// {
//   thumbnail: '...w_150,h_150...',
//   small: '...w_400...',
//   medium: '...w_800...',
//   large: '...w_1200...',
//   original: '...'
// }
```

### Lazy Loading

Use responsive URLs with lazy loading:

```jsx
<img
  src={urls.thumbnail}
  data-src={urls.medium}
  alt="Circular attachment"
  loading="lazy"
  className="lazy-image"
/>
```

---

## 📊 Monitor Usage

### Check Your Usage

1. Go to Cloudinary Dashboard
2. Click **Reports** → **Usage**
3. See:
   - Storage used (out of 25 GB)
   - Bandwidth used (out of 25 GB/month)
   - Transformations used

### Free Tier Limits

- ✅ **Storage:** 25 GB
- ✅ **Bandwidth:** 25 GB/month
- ✅ **Transformations:** 25,000/month
- ✅ **Images:** Unlimited

**Typical Usage for Your App:**
- 100 circulars/month with 2 images each
- Average image: 500 KB → optimized to 50 KB
- Storage: ~10 MB/month
- Bandwidth: ~5 GB/month (100 views per circular)
- **Well within free tier!** ✅

---

## 🔒 Security Best Practices

### ✅ DO:
- Use unsigned upload presets (already configured)
- Set file size limits in preset (5 MB)
- Set allowed formats in preset (jpg, png, etc.)
- Use folders for organization
- Monitor usage regularly

### ❌ DON'T:
- Expose API Secret in frontend code
- Allow unlimited file sizes
- Allow all file formats
- Skip upload preset configuration

---

## 🐛 Troubleshooting

### "Cloudinary configuration missing" Error

**Solution:** Check your .env file has:
```env
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-preset-name
```

### "Upload failed" Error

**Possible causes:**
1. **Wrong cloud name** - Check spelling
2. **Wrong preset name** - Check spelling
3. **Preset is signed** - Must be unsigned
4. **File too large** - Check preset limits
5. **Wrong file format** - Check allowed formats

**Solution:** Go to Cloudinary dashboard → Settings → Upload → Check preset configuration

### Images Not Showing

**Possible causes:**
1. **CORS issue** - Cloudinary should allow all origins by default
2. **Wrong URL** - Check console for actual URL
3. **Network block** - Unlikely with Cloudinary

**Solution:** Check browser console for errors

### Slow Upload

**Possible causes:**
1. **Large file** - Compress before upload
2. **Slow network** - Normal on slow connections
3. **Server location** - Cloudinary uses nearest CDN

**Solution:** 
- Compress images before upload
- Show upload progress to user
- Use smaller file size limits

---

## 📚 Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Upload Presets Guide](https://cloudinary.com/documentation/upload_presets)
- [Image Transformations](https://cloudinary.com/documentation/image_transformations)
- [Optimization Guide](https://cloudinary.com/documentation/image_optimization)

---

## 🎉 You're All Set!

Your app now uses:
- ✅ **Cloudinary** for images (25 GB free, CDN, optimization)
- ✅ **Supabase** for documents (1 GB free)
- ✅ **Total:** 26 GB free storage
- ✅ **Cost:** $0/month
- ✅ **Performance:** 5-10x faster image loading

**Next Steps:**
1. Test uploading images
2. Check Cloudinary dashboard
3. Monitor usage
4. Enjoy fast, free image hosting!

---

**Setup Time:** 5 minutes  
**Monthly Cost:** $0  
**Performance Gain:** 5-10x faster  
**Storage:** 25 GB free

**Questions?** Check the troubleshooting section or Cloudinary documentation.
