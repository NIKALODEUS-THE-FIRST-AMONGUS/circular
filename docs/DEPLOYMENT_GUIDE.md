# Production Deployment Guide - Quick Setup

## Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Ready for production deployment"

# Create GitHub repo and push
# Go to github.com → New repository → Create
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to: https://vercel.com/signup
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Vite settings
6. Click "Deploy"
7. Wait 2-3 minutes
8. Done! You'll get a URL like: `https://your-app.vercel.app`

### Step 3: Update Firebase Config (Important!)

After deployment, add your Vercel domain to Firebase:

1. Go to: https://console.firebase.google.com/project/circular2-15417/settings/general
2. Scroll to "Your apps" → Web app
3. Click settings (gear icon)
4. Add your Vercel domain to "Authorized domains":
   - `your-app.vercel.app`
5. Save

### Step 4: Test

1. Visit your Vercel URL
2. Sign in
3. Enable notifications
4. Create a test circular
5. Check if notification appears

---

## Alternative: Deploy to Netlify (Also 5 minutes)

### Step 1: Push to GitHub (same as above)

### Step 2: Deploy to Netlify

1. Go to: https://app.netlify.com/signup
2. Sign up with GitHub
3. Click "Add new site" → "Import an existing project"
4. Choose GitHub → Select your repo
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"
7. Wait 2-3 minutes
8. Done! You'll get a URL like: `https://your-app.netlify.app`

### Step 3: Update Firebase Config (same as Vercel)

Add your Netlify domain to Firebase authorized domains.

---

## Environment Variables (If using .env)

If you have sensitive data in `.env` file:

**Vercel:**
1. Go to your project → Settings → Environment Variables
2. Add each variable from your `.env` file
3. Redeploy

**Netlify:**
1. Go to Site settings → Environment variables
2. Add each variable from your `.env` file
3. Redeploy

---

## Custom Domain (Optional)

### Vercel:
1. Go to project → Settings → Domains
2. Add your domain
3. Update DNS records as instructed

### Netlify:
1. Go to Site settings → Domain management
2. Add custom domain
3. Update DNS records as instructed

---

## Post-Deployment Checklist

✅ App loads on production URL
✅ Users can sign in
✅ Circulars can be created
✅ Notifications work (enable in browser)
✅ Firebase authorized domains updated
✅ All features working

---

## Troubleshooting

### Issue: "Failed to register service worker"
**Fix:** Make sure your site is served over HTTPS (Vercel/Netlify do this automatically)

### Issue: "Notifications not working"
**Fix:** 
1. Check Firebase authorized domains includes your production domain
2. Check browser console for errors
3. Verify VAPID key is correct in `src/lib/firebase.js`

### Issue: "Supabase connection failed"
**Fix:** Check if you need to add environment variables for Supabase URL and keys

### Issue: "Build failed"
**Fix:** 
1. Run `npm run build` locally to test
2. Check build logs in Vercel/Netlify
3. Fix any TypeScript/ESLint errors

---

## Quick Commands

```bash
# Test build locally
npm run build

# Preview production build
npm run preview

# Check for errors
npm run lint

# Push to GitHub
git add .
git commit -m "Update"
git push
```

---

## Timeline for Tomorrow

**Morning (30 minutes):**
1. Push code to GitHub (5 min)
2. Deploy to Vercel (5 min)
3. Update Firebase domains (5 min)
4. Test on your phone (10 min)
5. Fix any issues (5 min)

**Ready for production!** 🚀

---

## Support

If you encounter issues during deployment:
1. Check Vercel/Netlify build logs
2. Check browser console on production site
3. Verify all environment variables are set
4. Test locally with `npm run build && npm run preview`

---

Last Updated: 2026-03-01
