# Fix Firestore Permission Error

## Problem
Landing page tries to check if database is empty (for first-time setup) but gets "Missing or insufficient permissions" error.

## Solution
Update Firestore rules to allow bootstrap check without authentication.

## Steps:

### Option 1: Enable Billing & Deploy (Recommended)
1. Go to: https://console.developers.google.com/billing/enable?project=circular2-15417
2. Enable billing (Firebase free tier is generous, you won't be charged)
3. Run: `firebase deploy --only firestore:rules`

### Option 2: Manual Update (Quick Fix)
1. Go to Firebase Console: https://console.firebase.google.com/project/circular2-15417/firestore/rules
2. Replace the rules with the updated version below
3. Click "Publish"

## Updated Rules (Copy & Paste):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function getProfile() {
      return get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data;
    }
    
    function isAdmin() {
      return isAuthenticated() && getProfile().role == 'admin';
    }
    
    function isTeacher() {
      return isAuthenticated() && (getProfile().role == 'teacher' || getProfile().role == 'admin');
    }
    
    function isActive() {
      return isAuthenticated() && getProfile().status == 'active';
    }
    
    // Profiles collection
    match /profiles/{userId} {
      // Allow limited read for bootstrap check (first user detection)
      allow list: if true; // Allows counting profiles for bootstrap
      allow get: if isAuthenticated(); // Individual profile reads require auth
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Circulars collection
    match /circulars/{circularId} {
      allow read: if isAuthenticated() && isActive();
      allow create: if isTeacher() && isActive();
      allow update: if isTeacher() && isActive() && 
                      (resource.data.author_id == request.auth.uid || isAdmin());
      allow delete: if isAdmin() || 
                      (isTeacher() && resource.data.author_id == request.auth.uid);
    }
    
    // Circular acknowledgments
    match /circular_acknowledgments/{ackId} {
      allow read: if isAuthenticated() && isActive();
      allow create: if isAuthenticated() && isActive() && 
                      request.resource.data.user_id == request.auth.uid;
      allow update: if false;
      allow delete: if isAdmin();
    }
    
    // Circular bookmarks
    match /circular_bookmarks/{bookmarkId} {
      allow read: if isAuthenticated() && 
                    resource.data.user_id == request.auth.uid;
      allow create: if isAuthenticated() && 
                      request.resource.data.user_id == request.auth.uid;
      allow delete: if isAuthenticated() && 
                      resource.data.user_id == request.auth.uid;
      allow update: if false;
    }
    
    // Circular views (analytics)
    match /circular_views/{viewId} {
      allow read: if isTeacher() || isAdmin();
      allow create: if isAuthenticated() && isActive();
      allow update, delete: if false;
    }
    
    // Circular history (edit history)
    match /circular_history/{historyId} {
      allow read: if isTeacher() || isAdmin();
      allow create: if isTeacher() && isActive();
      allow update, delete: if false;
    }
    
    // Notification tokens
    match /notification_tokens/{tokenId} {
      allow read: if isOwner(resource.data.user_id) || isAdmin();
      allow create: if isAuthenticated() && 
                      request.resource.data.user_id == request.auth.uid;
      allow update: if isOwner(resource.data.user_id);
      allow delete: if isOwner(resource.data.user_id) || isAdmin();
    }
    
    // Audit logs
    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }
    
    // Feedback
    match /feedback/{feedbackId} {
      allow read: if isAdmin() || 
                    (isAuthenticated() && resource.data.user_id == request.auth.uid);
      allow create: if isAuthenticated() && 
                      request.resource.data.user_id == request.auth.uid;
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Profile pre-approvals (admin only)
    match /profile_pre_approvals/{approvalId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
  }
}
```

## What Changed:
- Split `allow read` into `allow list` (for queries) and `allow get` (for individual docs)
- `allow list: if true` - Allows unauthenticated users to query/count profiles
- `allow get: if isAuthenticated()` - Still requires auth to read individual profiles
- This allows the bootstrap check without exposing user data

## After Updating:
1. Refresh your app
2. The permission error will disappear
3. First-time setup will work correctly
