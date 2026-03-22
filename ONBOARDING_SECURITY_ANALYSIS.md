# Onboarding Security Analysis & Edge Cases

## Critical Issues Found

### 1. Manual Firebase Profile Creation Bypass
**Problem**: If an admin manually creates a profile in Firebase Console, the rules don't validate:
- ❌ No validation on `department`, `year_of_study`, `section` during creation
- ❌ Only validated on UPDATE, not CREATE
- ❌ User can have invalid data that breaks the app

**Fix Needed**:
```javascript
// In firestore.rules - profiles/{userId}
allow create: if isOwner(userId) && 
              isValidDept(request.resource.data.department) &&
              isValidYear(request.resource.data.year_of_study) &&
              isValidSection(request.resource.data.section);
```

### 2. First User Auto-Admin Vulnerability
**Problem**: The "first user" check is client-side only
- ❌ Race condition: Multiple users can become admin if they sign up simultaneously
- ❌ No server-side validation
- ❌ Attacker can clear database and become admin

**Fix Needed**: Use Firebase Cloud Function or Admin SDK to set first user as admin

### 3. Access Code Validation is Client-Side Only
**Problem**: Access codes are validated in React, not in Firestore rules
- ❌ Attacker can bypass UI and directly call `setDoc()` with any role
- ❌ No server-side verification of access codes
- ❌ Anyone can make themselves admin/teacher via API

**Fix Needed**: Move access code validation to Cloud Function or use custom claims

### 4. Profile Status Bypass
**Problem**: User can set their own `status` to 'active'
- ❌ No rule preventing user from setting `status: 'active'` during creation
- ❌ Pending approval can be bypassed

**Fix Needed**:
```javascript
allow create: if isOwner(userId) && 
              (!('status' in request.resource.data) || 
               request.resource.data.status == 'pending');
```

### 5. Role Escalation During Update
**Problem**: Users can change their own role
- ❌ No protection against changing `role` field
- ❌ Student can make themselves admin

**Fix Needed**:
```javascript
allow update: if isOwner(userId) && 
              (!('role' in request.resource.data) || 
               request.resource.data.role == resource.data.role); // Can't change role
```

### 6. Methodist Email Check is Client-Side
**Problem**: Methodist email auto-approval happens in React
- ❌ Can be bypassed by directly calling Firestore
- ❌ No server-side email domain validation

**Fix Needed**: Cloud Function to verify email domain

### 7. Missing Required Fields Validation
**Problem**: No validation that required fields exist
- ❌ Profile can be created without `full_name`, `department`, etc.
- ❌ App will break with incomplete profiles

**Fix Needed**:
```javascript
allow create: if isOwner(userId) && 
              request.resource.data.keys().hasAll([
                'email', 'full_name', 'role', 'department', 
                'year_of_study', 'section', 'status'
              ]);
```

### 8. Notification Token Collection Vulnerability
**Problem**: `notification_tokens` allows duplicate entries
- ❌ No unique constraint on `user_id`
- ❌ Can create unlimited tokens for same user
- ❌ Document ID should be `user_id` for uniqueness

**Fix Needed**: Use `user_id` as document ID instead of auto-generated ID

### 9. No Rate Limiting on Profile Creation
**Problem**: No protection against spam account creation
- ❌ Attacker can create unlimited profiles
- ❌ No cooldown period

**Fix Needed**: Implement rate limiting via Cloud Functions

### 10. Onboarding State Stored in localStorage
**Problem**: Onboarding completion tracked client-side
- ❌ User can clear localStorage and re-onboard
- ❌ Can create multiple profiles for same auth user
- ❌ No server-side tracking

**Fix Needed**: Check if profile exists in Firestore, not localStorage

## Recommended Fixes Priority

### HIGH PRIORITY (Security Critical)
1. ✅ Add role change protection in Firestore rules
2. ✅ Add status field protection (can't set to 'active' on create)
3. ✅ Add required fields validation
4. ✅ Fix notification_tokens to use user_id as document ID

### MEDIUM PRIORITY (Data Integrity)
5. ⚠️ Add field validation on profile creation
6. ⚠️ Move first-user check to Cloud Function
7. ⚠️ Add Methodist email verification server-side

### LOW PRIORITY (Enhancement)
8. 💡 Add rate limiting
9. 💡 Move access code validation to server
10. 💡 Add audit logging for profile creation

## Immediate Action Items

1. Update `firestore.rules` to add validation on CREATE
2. Add Cloud Function for first-user detection
3. Use Firebase Custom Claims for roles instead of Firestore field
4. Add server-side email domain validation
5. Change notification_tokens to use user_id as doc ID

## Code Changes Needed

See next file: `FIRESTORE_RULES_FIX.md`
