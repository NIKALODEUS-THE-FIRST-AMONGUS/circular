# Performance Optimization Guide

## Current Performance Score: 64/100

### Critical Issues Identified

1. **Large JavaScript Bundles** - 4,271 KiB total payload
2. **Unused JavaScript** - 1,656 KiB can be removed
3. **Unminified Code** - 1,534 KiB can be minified
4. **Long Critical Path** - 1,168 ms latency

---

## Immediate Optimizations (Production Build)

### 1. Build for Production

```bash
npm run build
npm run preview
```

This will:
- Minify all JavaScript (saves ~1,534 KiB)
- Tree-shake unused code (saves ~1,656 KiB)
- Compress assets with gzip/brotli
- Generate optimized chunks

### 2. Reduce Lucide Icons Bundle (950 KiB → ~50 KiB)

Currently importing entire icon library. Switch to individual imports:

**Before:**
```javascript
import { Icon1, Icon2, Icon3 } from 'lucide-react';
```

**After:**
```javascript
import Icon1 from 'lucide-react/dist/esm/icons/icon1';
import Icon2 from 'lucide-react/dist/esm/icons/icon2';
```

Or create a custom icon bundle in `src/components/Icons.jsx`:
```javascript
export { 
  MessageSquare,
  Bug,
  Lightbulb,
  // ... only icons you use
} from 'lucide-react';
```

Then import from your custom file:
```javascript
import { MessageSquare, Bug } from '../components/Icons';
```

### 3. Optimize Framer Motion (411 KiB)

Replace heavy animations with CSS where possible:

**Instead of:**
```javascript
<motion.div animate={{ opacity: 1 }} />
```

**Use:**
```css
.fade-in {
  animation: fadeIn 0.3s ease-out;
}
```

Only use Framer Motion for complex gestures/interactions.

---

## Code Splitting Improvements

### 1. Split Dashboard Routes

Create `src/pages/Dashboard.jsx` with lazy-loaded routes:

```javascript
const CircularCenter = lazy(() => import('./CircularCenter'));
const CreateCircular = lazy(() => import('./CreateCircular'));
const Feedback = lazy(() => import('./Feedback'));
const Drafts = lazy(() => import('./Drafts'));
// ... etc
```

### 2. Lazy Load Heavy Components

```javascript
const CircularFeatures = lazy(() => import('./components/CircularFeatures'));
const AppleIntro = lazy(() => import('./components/AppleIntro'));
```

---

## Network Optimizations

### 1. Enable Compression (Vite Config)

Add to `vite.config.js`:

```javascript
import compression from 'vite-plugin-compression';

export default {
  plugins: [
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
};
```

### 2. Preconnect to Origins

Already implemented in `index.html`:
```html
<link rel="preconnect" href="https://uikcxqeqivczkiqvftap.supabase.co">
<link rel="preconnect" href="https://fonts.googleapis.com">
```

### 3. Font Optimization

Replace Google Fonts with local fonts or use `font-display: swap`:

```css
@font-face {
  font-family: 'Inter';
  font-display: swap;
  src: url('/fonts/inter.woff2') format('woff2');
}
```

---

## Image Optimizations

### 1. Use WebP Format

Convert images to WebP (70% smaller):

```bash
npm install -D vite-plugin-imagemin
```

### 2. Lazy Load Images

Use `LazyImage` component everywhere:

```javascript
<LazyImage src="/logo.svg" alt="Logo" />
```

---

## Caching Strategy

### 1. Service Worker for Offline Support

Create `public/sw.js`:

```javascript
const CACHE_NAME = 'circular-v1';
const urlsToCache = [
  '/',
  '/index.css',
  '/logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

### 2. HTTP Cache Headers (Production Server)

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

---

## Database Optimizations

### 1. Reduce Supabase Queries

- Use `select('*')` sparingly - only fetch needed columns
- Implement pagination (limit 20 items per page)
- Cache frequently accessed data in localStorage

### 2. Optimize Queries

**Before:**
```javascript
const { data } = await supabase.from('circulars').select('*');
```

**After:**
```javascript
const { data } = await supabase
  .from('circulars')
  .select('id, title, created_at')
  .range(0, 19)
  .order('created_at', { ascending: false });
```

---

## Security Headers (Production)

Add to server config:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## Monitoring & Analytics

### 1. Track Core Web Vitals

Already implemented via `performanceMonitor.js`

### 2. Set Performance Budgets

Add to `package.json`:

```json
{
  "lighthouse": {
    "performance": 90,
    "accessibility": 95,
    "best-practices": 95,
    "seo": 90
  }
}
```

---

## Expected Results After Optimization

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Performance Score | 64 | 90+ | +40% |
| Bundle Size | 4,271 KiB | ~1,200 KiB | -72% |
| FCP | 2.5s | <1.0s | -60% |
| LCP | 4.3s | <2.0s | -53% |
| TBT | 0ms | 0ms | ✓ |
| CLS | 0 | 0 | ✓ |

---

## Quick Wins (Do These First)

1. ✅ Run production build (`npm run build`)
2. ✅ Optimize Lucide icons (individual imports)
3. ✅ Add manual chunks to Vite config
4. ✅ Enable compression plugin
5. ✅ Lazy load dashboard routes
6. ✅ Remove unused dependencies

---

## Testing Performance

```bash
# Build production
npm run build

# Preview production build
npm run preview

# Run Lighthouse
npm install -g lighthouse
lighthouse http://localhost:4173 --view
```

---

## Notes

- Development builds are always slower (no minification)
- Test performance in production mode only
- Use Chrome DevTools Performance tab for profiling
- Monitor bundle size with `npm run build -- --report`
