# Data Migration from Supabase to Firebase

## Current Status ✅

- ✅ Firebase project setup (circular2-15417)
- ✅ Firestore database created (asia-south1)
- ✅ Security rules written and ready
- ✅ Cloudinary configured for images
- ✅ Compatibility layer working
- ✅ Authentication working

## Next Steps: Data Migration

### Step 1: Export Data from Supabase (30 minutes)

#### 1.1 Export Profiles
```bash
# Using Supabase CLI or SQL
SELECT * FROM profiles ORDER BY created_at;
```

Or use the Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/uikcxqeqivczkiqvftap/editor
2. Table Editor → profiles → Export as CSV/JSON

#### 1.2 Export Circulars
```sql
SELECT * FROM circulars ORDER BY created_at;
```

#### 1.3 Export Related Data
- circular_acknowledgments
- circular_bookmarks
- circular_views
- notification_tokens
- feedback
- audit_logs

### Step 2: Transform Data Format (1 hour)

Create a migration script to transform Supabase data to Firestore format:

```javascript
// migration-script.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import fs from 'fs';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBg2uSfKye-ME8ZBHKs_qvG9gfA_-w-Xas",
  authDomain: "circular2-15417.firebaseapp.com",
  projectId: "circular2-15417",
  storageBucket: "circular2-15417.firebasestorage.app",
  messagingSenderId: "918462031556",
  appId: "1:918462031556:web:88ffdef80c820b25e60b91"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Transform timestamp strings to Firestore Timestamps
function transformTimestamp(dateString) {
  if (!dateString) return null;
  return Timestamp.fromDate(new Date(dateString));
}

// Migrate profiles
async function migrateProfiles() {
  const profiles = JSON.parse(fs.readFileSync('./exports/profiles.json', 'utf8'));
  
  for (const profile of profiles) {
    const docRef = doc(db, 'profiles', profile.id);
    
    const firestoreData = {
      ...profile,
      created_at: transformTimestamp(profile.created_at),
      updated_at: transformTimestamp(profile.updated_at),
      last_login: transformTimestamp(profile.last_login)
    };
    
    await setDoc(docRef, firestoreData);
    console.log(`Migrated profile: ${profile.email}`);
  }
}

// Migrate circulars
async function migrateCirculars() {
  const circulars = JSON.parse(fs.readFileSync('./exports/circulars.json', 'utf8'));
  
  for (const circular of circulars) {
    const docRef = doc(db, 'circulars', circular.id);
    
    const firestoreData = {
      ...circular,
      created_at: transformTimestamp(circular.created_at),
      updated_at: transformTimestamp(circular.updated_at),
      published_at: transformTimestamp(circular.published_at)
    };
    
    await setDoc(docRef, firestoreData);
    console.log(`Migrated circular: ${circular.title}`);
  }
}

// Run migration
async function runMigration() {
  console.log('Starting migration...');
  
  await migrateProfiles();
  console.log('✅ Profiles migrated');
  
  await migrateCirculars();
  console.log('✅ Circulars migrated');
  
  // Add other collections...
  
  console.log('🎉 Migration complete!');
}

runMigration().catch(console.error);
```

### Step 3: Run Migration Script (1 hour)

```bash
# Install dependencies
npm install firebase

# Create exports directory
mkdir exports

# Place your exported JSON files in exports/
# - exports/profiles.json
# - exports/circulars.json
# - etc.

# Run migration
node migration-script.js
```

### Step 4: Verify Data (30 minutes)

Check Firebase Console to verify:
1. Go to: https://console.firebase.google.com/project/circular2-15417/firestore/data
2. Verify all collections exist
3. Check document counts match
4. Verify timestamps are correct
5. Check relationships are intact

### Step 5: Test Application (1 hour)

1. Clear browser cache and local storage
2. Sign in with existing account
3. Verify profile loads correctly
4. Check circulars display properly
5. Test creating new circular
6. Test acknowledgments
7. Test bookmarks
8. Test search and filters

## Alternative: Manual Migration (Small Dataset)

If you have a small dataset (< 100 records), you can migrate manually:

### Manual Profile Migration

1. Go to Supabase → profiles table
2. Copy each profile
3. Go to Firebase Console → Firestore
4. Create document in `profiles` collection
5. Use user's UID as document ID
6. Paste data, convert timestamps

### Manual Circular Migration

Same process for circulars collection.

## Data Mapping Reference

### Profiles Collection
```
Supabase Field → Firestore Field
id → document ID (use Firebase Auth UID)
email → email
full_name → full_name
role → role
status → status
avatar_url → avatar_url
created_at → created_at (Timestamp)
updated_at → updated_at (Timestamp)
```

### Circulars Collection
```
Supabase Field → Firestore Field
id → document ID (auto-generated)
title → title
content → content
author_id → author_id
status → status
priority → priority
attachments → attachments (array)
created_at → created_at (Timestamp)
updated_at → updated_at (Timestamp)
published_at → published_at (Timestamp)
```

## Important Notes

### Timestamp Conversion
- Supabase: ISO 8601 strings (`"2024-03-02T10:30:00Z"`)
- Firestore: Timestamp objects
- Use: `Timestamp.fromDate(new Date(isoString))`

### Document IDs
- Profiles: Use Firebase Auth UID (must match)
- Circulars: Can use existing UUIDs or let Firestore generate
- Other collections: Use existing IDs for consistency

### Attachments
- Supabase Storage URLs → Cloudinary URLs
- Update attachment URLs during migration
- Or migrate files to Cloudinary first

### Relationships
- Firestore uses document references
- Keep foreign keys as strings (author_id, user_id, etc.)
- No need to change relationship structure

## Migration Checklist

### Pre-Migration
- [ ] Export all data from Supabase
- [ ] Verify exports are complete
- [ ] Test migration script on sample data
- [ ] Backup Supabase data

### Migration
- [ ] Run migration script
- [ ] Verify document counts
- [ ] Check data integrity
- [ ] Verify timestamps
- [ ] Test relationships

### Post-Migration
- [ ] Test authentication
- [ ] Test all CRUD operations
- [ ] Verify search and filters work
- [ ] Check file uploads (Cloudinary)
- [ ] Test real-time updates
- [ ] Monitor for errors

### Cleanup
- [ ] Keep Supabase as backup for 1 week
- [ ] Update environment variables
- [ ] Remove Supabase dependencies (optional)
- [ ] Update documentation

## Rollback Plan

If migration fails:
1. Keep Supabase running
2. Switch back to Supabase in .env
3. Restart application
4. Fix issues and retry

## Timeline

- Export data: 30 minutes
- Transform data: 1 hour
- Run migration: 1 hour
- Verify data: 30 minutes
- Test application: 1 hour
- **Total: 4 hours**

## Support

If you encounter issues:
1. Check Firebase Console logs
2. Verify Firestore rules allow writes
3. Check authentication is working
4. Verify timestamp conversions
5. Test with small dataset first

---

**Ready to migrate?** Start with Step 1: Export Data from Supabase.
