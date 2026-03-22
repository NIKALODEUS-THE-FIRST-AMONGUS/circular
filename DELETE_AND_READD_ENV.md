# DELETE AND RE-ADD ENVIRONMENT VARIABLES

## The Problem
Vercel STILL has quotes in the environment variables:
```
NOTIFICATION_SECRET_KEY="MySuperSecretPassword123!@#"  ❌ WRONG
VITE_NOTIFICATION_SECRET_KEY="MySuperSecretPassword123!@#"  ❌ WRONG
```

## Solution: Delete and Re-add

### Step 1: Delete Old Variables
1. Go to: https://vercel.com/dashboard
2. Select: **sxl** project
3. **Settings** → **Environment Variables**
4. Find `NOTIFICATION_SECRET_KEY` → Click **...** → **Delete**
5. Find `VITE_NOTIFICATION_SECRET_KEY` → Click **...** → **Delete**

### Step 2: Add New Variables (WITHOUT QUOTES)
1. Click **Add New** button
2. **Key**: `NOTIFICATION_SECRET_KEY`
3. **Value**: `MySuperSecretPassword123!@#` (NO QUOTES!)
4. **Environments**: Production, Preview, Development
5. Click **Save**

6. Click **Add New** again
7. **Key**: `VITE_NOTIFICATION_SECRET_KEY`
8. **Value**: `MySuperSecretPassword123!@#` (NO QUOTES!)
9. **Environments**: Production, Preview, Development
10. Click **Save**

### Step 3: Redeploy
1. **Deployments** tab
2. Click **...** → **Redeploy**
3. Wait 1-2 minutes

### Step 4: Test
1. Hard refresh (Ctrl+Shift+R)
2. Create circular
3. Click "Broadcast"
4. ✅ Should work!

## CRITICAL
When adding the value in Vercel, type it WITHOUT any quotes:
- ❌ WRONG: `"MySuperSecretPassword123!@#"`
- ✅ CORRECT: `MySuperSecretPassword123!@#`
