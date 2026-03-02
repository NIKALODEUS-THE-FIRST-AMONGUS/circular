# 🔴 URGENT: Update Firestore Rules Now

## The Problem
Your app is getting "Missing or insufficient permissions" because the Firestore rules haven't been updated yet.

## The Solution (2 minutes)

### Step 1: Open Firebase Console Rules Editor
Click this link: https://console.firebase.google.com/project/circular2-15417/firestore/rules

### Step 2: Replace ALL the rules with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
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
    
    match /profiles/{userId} {
      allow list: if true;
      allow get: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    match /circulars/{circularId} {
      allow read: if isAuthenticated() && isActive();
      allow create: if isTeacher() && isActive();
      allow update: if isTeacher() && isActive() && 
                      (resource.data.author_id == request.auth.uid || isAdmin());
      allow delete: if isAdmin() || 
                      (isTeacher() && resource.data.author_id == request.auth.uid);
    }
    
    match /circular_acknowledgments/{ackId} {
      allow read: if isAuthenticated() && isActive();
      allow create: if isAuthenticated() && isActive() && 
                      request.resource.data.user_id == request.auth.uid;
      allow update: if false;
      allow delete: if isAdmin();
    }
    
    match /circular_bookmarks/{bookmarkId} {
      allow read: if isAuthenticated() && 
                    resource.data.user_id == request.auth.uid;
      allow create: if isAuthenticated() && 
                      request.resource.data.user_id == request.auth.uid;
      allow delete: if isAuthenticated() && 
                      resource.data.user_id == request.auth.uid;
      allow update: if false;
    }
    
    match /circular_views/{viewId} {
      allow read: if isTeacher() || isAdmin();
      allow create: if isAuthenticated() && isActive();
      allow update, delete: if false;
    }
    
    match /circular_history/{historyId} {
      allow read: if isTeacher() || isAdmin();
      allow create: if isTeacher() && isActive();
      allow update, delete: if false;
    }
    
    match /notification_tokens/{tokenId} {
      allow read: if isOwner(resource.data.user_id) || isAdmin();
      allow create: if isAuthenticated() && 
                      request.resource.data.user_id == request.auth.uid;
      allow update: if isOwner(resource.data.user_id);
      allow delete: if isOwner(resource.data.user_id) || isAdmin();
    }
    
    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }
    
    match /feedback/{feedbackId} {
      allow read: if isAdmin() || 
                    (isAuthenticated() && resource.data.user_id == request.auth.uid);
      allow create: if isAuthenticated() && 
                      request.resource.data.user_id == request.auth.uid;
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    match /profile_pre_approvals/{approvalId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
  }
}
```

### Step 3: Click "Publish" button (top right)

### Step 4: Refresh your app

## What This Fixes
- ✅ Allows bootstrap check (first user detection)
- ✅ Fixes "Missing or insufficient permissions" error
- ✅ App will work properly

## The Key Change
Line 33: `allow list: if true;` - This allows counting profiles without authentication, which is needed for the first-time setup check.

---

**DO THIS NOW** - Your app won't work until you update these rules!
