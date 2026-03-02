# Migration Scripts

Automated scripts to migrate data from Supabase to Firebase.

## Prerequisites

```bash
# Install dependencies
npm install @supabase/supabase-js firebase

# Ensure Firebase CLI is installed
firebase --version

# Ensure you're logged in
firebase login
```

## Quick Start (Automated)

Run the complete migration in one command:

```bash
# On Unix/Mac/Linux
bash scripts/migrate-data.sh

# On Windows (PowerShell)
node scripts/export-from-supabase.js
node scripts/import-to-firebase.js
firebase deploy --only firestore:rules
```

## Manual Steps

### Step 1: Export from Supabase

```bash
node scripts/export-from-supabase.js
```

This will:
- Connect to your Supabase project
- Export all collections to `./exports/` folder
- Create JSON files for each table

### Step 2: Review Exports

```bash
# Check exported files
ls -lh exports/

# View a sample
cat exports/profiles.json | head -20
```

### Step 3: Import to Firebase

```bash
node scripts/import-to-firebase.js
```

This will:
- Read JSON files from `./exports/`
- Transform data for Firestore
- Import to Firebase collections
- Show progress for each collection

### Step 4: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## What Gets Migrated

- ✅ profiles
- ✅ circulars
- ✅ circular_acknowledgments
- ✅ circular_bookmarks
- ✅ circular_views
- ✅ circular_history
- ✅ notification_tokens
- ✅ feedback
- ✅ audit_logs
- ✅ profile_pre_approvals

## Data Transformations

### Timestamps
- Supabase: ISO 8601 strings
- Firebase: Timestamp objects
- Auto-converted: `created_at`, `updated_at`, `published_at`, etc.

### Arrays
- Attachments converted from JSON strings to arrays
- Empty arrays created if missing

### Required Fields
- Default values added for missing required fields
- Status defaults to 'pending'
- Role defaults to 'student'

## Verification

After migration, verify in Firebase Console:

1. **Check document counts:**
   ```bash
   # Compare with Supabase counts
   # Profiles: Should match
   # Circulars: Should match
   # etc.
   ```

2. **Verify timestamps:**
   - Check that dates are correct
   - Verify timezone handling

3. **Test relationships:**
   - Verify author_id references work
   - Check user_id references

4. **Test queries:**
   - Run your app
   - Test search and filters
   - Verify data displays correctly

## Troubleshooting

### Export fails
- Check Supabase URL and key in `.env`
- Verify network connection
- Check table names exist

### Import fails
- Check Firebase credentials in `.env`
- Verify Firestore database exists
- Check security rules allow writes

### Missing data
- Check export files in `./exports/`
- Verify JSON is valid
- Check for empty collections

### Timestamp errors
- Verify date formats in source data
- Check timezone settings
- Review transformation logic

## Rollback

If migration fails:

1. Keep Supabase running
2. Don't delete Supabase data
3. Switch back to Supabase in `.env`:
   ```
   # Comment out Firebase, uncomment Supabase
   ```
4. Restart application
5. Fix issues and retry

## Safety

- ✅ Non-destructive (doesn't delete Supabase data)
- ✅ Can be run multiple times (overwrites existing)
- ✅ Creates backups in `./exports/`
- ✅ Shows progress and errors
- ✅ Validates data before import

## Performance

- Small dataset (< 1000 records): ~5 minutes
- Medium dataset (1000-10000 records): ~15 minutes
- Large dataset (> 10000 records): ~30+ minutes

## Support

If you encounter issues:

1. Check the error message
2. Verify credentials in `.env`
3. Check Firebase Console logs
4. Review `./exports/` files
5. Test with small dataset first

---

**Ready to migrate?** Run `bash scripts/migrate-data.sh`
