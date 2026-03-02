#!/usr/bin/env node
/**
 * Import data to Firebase Firestore
 * Run: node scripts/import-to-firebase.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase config from .env
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBg2uSfKye-ME8ZBHKs_qvG9gfA_-w-Xas",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "circular2-15417.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "circular2-15417",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "circular2-15417.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "918462031556",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:918462031556:web:88ffdef80c820b25e60b91"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const exportsDir = path.join(__dirname, '..', 'exports');

// Transform Supabase timestamp to Firestore Timestamp
function transformTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === 'string') {
    try {
      return Timestamp.fromDate(new Date(value));
    } catch {
      return null;
    }
  }
  return null;
}

// Transform document data
function transformDocument(data, collectionName) {
  const transformed = { ...data };
  
  // Convert timestamp fields
  const timestampFields = ['created_at', 'updated_at', 'published_at', 'last_login', 'acknowledged_at', 'viewed_at'];
  timestampFields.forEach(field => {
    if (transformed[field]) {
      transformed[field] = transformTimestamp(transformed[field]);
    }
  });
  
  // Handle collection-specific transformations
  if (collectionName === 'profiles') {
    // Ensure required fields
    if (!transformed.status) transformed.status = 'pending';
    if (!transformed.role) transformed.role = 'student';
  }
  
  if (collectionName === 'circulars') {
    // Ensure attachments is an array
    if (!transformed.attachments) transformed.attachments = [];
    if (typeof transformed.attachments === 'string') {
      try {
        transformed.attachments = JSON.parse(transformed.attachments);
      } catch {
        transformed.attachments = [];
      }
    }
  }
  
  return transformed;
}

async function importCollection(collectionName) {
  const filePath = path.join(exportsDir, `${collectionName}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${collectionName} (no export file)`);
    return;
  }
  
  console.log(`📥 Importing ${collectionName}...`);
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`⏭️  Skipping ${collectionName} (empty)`);
      return;
    }
    
    let imported = 0;
    let failed = 0;
    
    for (const item of data) {
      try {
        const docId = item.id;
        const docRef = doc(db, collectionName, docId);
        const transformedData = transformDocument(item, collectionName);
        
        await setDoc(docRef, transformedData);
        imported++;
        
        if (imported % 10 === 0) {
          process.stdout.write(`\r   Imported ${imported}/${data.length}...`);
        }
      } catch (err) {
        failed++;
        console.error(`\n   ❌ Failed to import document:`, err.message);
      }
    }
    
    console.log(`\n✅ Imported ${imported} records to ${collectionName} (${failed} failed)`);
  } catch (err) {
    console.error(`❌ Failed to import ${collectionName}:`, err.message);
  }
}

async function importAll() {
  console.log('🚀 Starting Firebase import...\n');
  
  // Import in order (profiles first, then circulars, then related data)
  const importOrder = [
    'profiles',
    'circulars',
    'circular_acknowledgments',
    'circular_bookmarks',
    'circular_views',
    'circular_history',
    'notification_tokens',
    'feedback',
    'audit_logs',
    'profile_pre_approvals'
  ];
  
  for (const collection of importOrder) {
    await importCollection(collection);
  }
  
  console.log('\n✨ Import complete!');
  console.log('\nNext steps:');
  console.log('1. Verify data in Firebase Console');
  console.log('2. Test your application');
  console.log('3. Check for any errors');
}

importAll().catch(console.error);
