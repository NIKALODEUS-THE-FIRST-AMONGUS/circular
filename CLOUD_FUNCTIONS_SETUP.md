# Cloud Functions Setup Guide

This project uses Firebase Cloud Functions for automated maintenance tasks.

## Functions Overview

### 1. cleanupOldAuditLogs
**Schedule**: Daily at 2 AM UTC  
**Purpose**: Automatically delete audit logs older than 30 days

**What it does**:
- Finds all audit logs older than 30 days
- Creates a summary with statistics:
  - Total logs deleted
  - Date range covered
  - Action type breakdown
  - Number of unique actors
- Saves summary to `audit_log_archives` collection
- Deletes the old logs in batch

**Benefits**:
- Keeps database size manageable
- Maintains historical insights via summaries
- Automatic cleanup without manual intervention

### 2. cleanupOldDeletedCirculars
**Schedule**: Weekly on Sunday at 3 AM UTC  
**Purpose**: Permanently delete circulars that have been in "deleted" status for 90+ days

**What it does**:
- Finds circulars with status='deleted' older than 90 days
- Permanently removes them from database
- Logs cleanup summary

**Benefits**:
- Provides 90-day recovery window for deleted circulars
- Automatic permanent deletion after grace period
- Reduces storage costs

## Setup Instructions

### Step 1: Install Dependencies
```bash
cd functions
npm install
cd ..
```

### Step 2: Deploy Functions
```bash
firebase deploy --only functions
```

### Step 3: Verify Deployment
Check Firebase Console → Functions to see:
- `cleanupOldAuditLogs` - scheduled daily
- `cleanupOldDeletedCirculars` - scheduled weekly

## Viewing Archived Summaries

Audit log summaries are stored in the `audit_log_archives` collection. Each document contains:

```javascript
{
  total_deleted: 150,
  date_range: {
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-02-01T23:59:59.000Z"
  },
  actions: {
    "create_circular": 45,
    "approve_member": 30,
    "decline_member": 15,
    "bulk_approve_members": 10,
    // ... other actions
  },
  unique_actors: 12,
  cleanup_date: "2026-03-03T02:00:00.000Z"
}
```

## Manual Cleanup (Optional)

To manually trigger cleanup functions:

```bash
# Test locally with emulator
firebase emulators:start --only functions

# Or call directly (requires Firebase CLI)
firebase functions:shell
> cleanupOldAuditLogs()
```

## Cost Considerations

**Free Tier Includes**:
- 2 million invocations/month
- 400,000 GB-seconds compute time
- 200,000 CPU-seconds compute time

**Our Usage**:
- Daily cleanup: ~30 invocations/month
- Weekly cleanup: ~4 invocations/month
- Total: ~34 invocations/month (well within free tier)

## Monitoring

View function logs in Firebase Console:
1. Go to Firebase Console → Functions
2. Click on function name
3. View "Logs" tab

Or use CLI:
```bash
firebase functions:log
```

## Firestore Rules for Archives

Add to `firestore.rules`:

```javascript
// Audit log archives - admin read-only
match /audit_log_archives/{archiveId} {
  allow read: if request.auth != null && 
    get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.role == 'admin';
  allow write: if false; // Only Cloud Functions can write
}
```

## Troubleshooting

### Function not running on schedule
- Check Firebase Console → Functions → Logs for errors
- Verify billing is enabled (required for scheduled functions)
- Check function deployment status

### Permission errors
- Ensure Firebase Admin SDK has proper permissions
- Check service account roles in Google Cloud Console

### Testing locally
```bash
cd functions
npm test
```

## Future Enhancements

Consider adding:
- Email notifications for cleanup summaries
- Configurable retention periods via environment variables
- Cleanup for other collections (notifications, bookmarks, etc.)
- Export to Cloud Storage before deletion
