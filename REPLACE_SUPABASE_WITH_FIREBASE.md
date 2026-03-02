# Replace Supabase with Pure Firebase

## We are using FIREBASE, not Supabase!

The compatibility layer exists only for gradual migration. Use pure Firebase code going forward.

## Import the Firebase Helper

```javascript
// OLD (Supabase)
import { supabase } from '../lib/supabase';

// NEW (Firebase)
import firebaseDb from '../lib/firebase-db';
// OR import specific functions
import { createCircular, getCircular, updateCircular } from '../lib/firebase-db';
```

## Common Replacements

### CREATE (Insert)

```javascript
// OLD
await supabase.from('circulars').insert([circularData]);

// NEW
await firebaseDb.createCircular(circularData);
// OR
import { createDocument } from '../lib/firebase-db';
await createDocument('circulars', circularData);
```

### READ (Select)

```javascript
// OLD
const { data } = await supabase
  .from('circulars')
  .select('*')
  .eq('status', 'published');

// NEW
const circulars = await firebaseDb.getAllCirculars({
  where: [['status', '==', 'published']]
});
```

### UPDATE

```javascript
// OLD
await supabase
  .from('circulars')
  .update({ status: 'published' })
  .eq('id', circularId);

// NEW
await firebaseDb.updateCircular(circularId, { status: 'published' });
```

### DELETE

```javascript
// OLD
await supabase
  .from('circulars')
  .delete()
  .eq('id', circularId);

// NEW
await firebaseDb.deleteCircular(circularId);
```

## Specific Examples

### Audit Logs

```javascript
// OLD
await supabase.from('audit_logs').insert({
  actor_id: user.id,
  action: 'create_circular',
  details: { title: 'Test' }
});

// NEW
import { createAuditLog } from '../lib/firebase-db';
await createAuditLog({
  actor_id: user.id,
  action: 'create_circular',
  details: { title: 'Test' }
});
```

### Feedback

```javascript
// OLD
await supabase.from('feedback').insert([feedbackData]);

// NEW
import { createFeedback } from '../lib/firebase-db';
await createFeedback(feedbackData);
```

### Downloads Tracking

```javascript
// OLD
await supabase.from('circular_downloads').insert({
  circular_id: circularId,
  user_id: userId,
  attachment_url: url
});

// NEW
import { trackDownload } from '../lib/firebase-db';
await trackDownload({
  circular_id: circularId,
  user_id: userId,
  attachment_url: url
});
```

### Profiles

```javascript
// OLD
await supabase
  .from('profiles')
  .update({ avatar_url: url })
  .eq('id', userId);

// NEW
import { updateProfile } from '../lib/firebase-db';
await updateProfile(userId, { avatar_url: url });
```

## Query Filters

```javascript
// Get documents with filters
const circulars = await firebaseDb.getDocuments('circulars', {
  where: [
    ['status', '==', 'published'],
    ['priority', '==', 'high']
  ],
  orderBy: ['created_at', 'desc'],
  limit: 10
});
```

## Files to Update

Replace Supabase calls in these files:

1. `src/pages/CreateCircular.jsx` - createCircular
2. `src/pages/ManageUsers.jsx` - createAuditLog
3. `src/pages/Feedback.jsx` - createFeedback
4. `src/pages/Approvals.jsx` - createAuditLog
5. `src/pages/AddMember.jsx` - createAuditLog
6. `src/pages/CircularDetail.jsx` - trackDownload
7. `src/components/CircularCard.jsx` - trackDownload

## Quick Fix Script

Want me to automatically replace all Supabase calls with Firebase? Let me know which file is failing and I'll fix it immediately.

---

**Remember: We're using FIREBASE + CLOUDINARY, not Supabase!**
