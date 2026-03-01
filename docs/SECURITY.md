# Security Guidelines

## Environment Variables

### Never Commit Sensitive Data

All sensitive credentials are stored in `.env` file which is gitignored.

### Setup Instructions

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your actual credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-key
VITE_FIREBASE_API_KEY=your-actual-key
# ... etc
```

3. **NEVER** commit `.env` to git

### Protected Credentials

The following are now environment variables:

**Supabase:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Firebase:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_VAPID_KEY`

**Admin Keys:**
- `VITE_ADMIN_SECRET_KEY`
- `VITE_TEACHER_SECRET_KEY`
- `VITE_STUDENT_SECRET_KEY`
- `VITE_MASTER_ADMIN_EMAIL`

---

## Database Security

### Row Level Security (RLS)

All tables have RLS enabled with policies:

**Profiles:**
- Users can view all profiles
- Users can update only their own profile
- Admins can update any profile

**Circulars:**
- Users can view circulars targeted to them
- Teachers/Admins can create circulars
- Only creators can update/delete their circulars

**Feedback:**
- Users can view all feedback
- Users can submit their own feedback
- Admins can update/delete any feedback
- Anonymous feedback hides user info from non-admins

**Circular Views:**
- Users can view all view records
- Users can insert/update only their own views

### SQL Injection Prevention

- All queries use parameterized statements
- Supabase client handles escaping automatically
- No raw SQL in frontend code

---

## Input Validation

### Profanity Filtering

Implemented in `src/utils/profanityFilter.js`:

- Detects offensive words in 30+ languages
- Severity levels: none, low, medium, high, extreme
- Auto-rejects extremely offensive content
- Leetspeak detection (f*ck → fuck)
- Special character obfuscation detection

### XSS Prevention

- All user input is sanitized
- React automatically escapes JSX
- No `dangerouslySetInnerHTML` without sanitization
- Content Security Policy headers recommended

### File Upload Security

- File type validation
- Size limits enforced
- Stored in Supabase Storage with RLS
- Virus scanning recommended for production

---

## Authentication Security

### JWT Tokens

- Tokens stored in httpOnly cookies (Supabase handles this)
- Automatic token refresh
- Secure token transmission over HTTPS

### Password Security

- Passwords hashed with bcrypt (Supabase handles this)
- Minimum password requirements enforced
- No password storage in frontend

### Session Management

- Automatic session expiry
- Logout clears all local storage
- Real-time session validation

---

## API Security

### Rate Limiting

Recommended for production:

```javascript
// Supabase Edge Function
import { rateLimit } from '@supabase/rate-limit'

const limiter = rateLimit({
  interval: 60000, // 1 minute
  uniqueTokenPerInterval: 500
})

export async function handler(req) {
  try {
    await limiter.check(req, 10) // 10 requests per minute
    // ... handle request
  } catch {
    return new Response('Rate limit exceeded', { status: 429 })
  }
}
```

### CORS Protection

Configure in Supabase dashboard:
- Allow only your domain
- Restrict HTTP methods
- Set proper headers

---

## Production Deployment

### Environment Variables

**Vercel/Netlify:**
1. Go to project settings
2. Add environment variables
3. Redeploy

**Never expose:**
- Database passwords
- API keys
- Secret keys
- Private tokens

### Security Headers

Add to `vercel.json` or `netlify.toml`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
```

### HTTPS Only

- Always use HTTPS in production
- Enable HSTS headers
- Redirect HTTP to HTTPS

---

## Monitoring & Logging

### Audit Logs

All critical actions are logged:
- User creation/deletion
- Circular creation/deletion
- Permission changes
- Failed login attempts

### Error Tracking

Recommended tools:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for usage

---

## Incident Response

### If Credentials Are Leaked

1. **Immediately rotate all keys:**
   - Supabase: Generate new anon key
   - Firebase: Regenerate API keys
   - Admin keys: Change in .env

2. **Check audit logs** for unauthorized access

3. **Notify users** if data breach occurred

4. **Update .env** on all deployments

5. **Review git history** and remove leaked credentials

### Reporting Security Issues

Email: security@yourinstitution.edu

Do not create public GitHub issues for security vulnerabilities.

---

## Checklist

Before deploying to production:

- [ ] All credentials in environment variables
- [ ] `.env` is gitignored
- [ ] RLS policies tested
- [ ] Input validation implemented
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Audit logging active
- [ ] Error tracking setup
- [ ] Backup strategy in place

---

**Last Updated**: March 1, 2026  
**Version**: 1.0
