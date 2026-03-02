#!/usr/bin/env node
/**
 * Export data from Supabase using the Supabase CLI
 * Run: node scripts/export-from-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase credentials from .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uikcxqeqivczkiqvftap.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpa2N4cWVxaXZjemtpcXZmdGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjgxNjMsImV4cCI6MjA4NzcwNDE2M30.lSww5NdjTaARsBz2pDDilOEJvT8hhoVmh83oNKUDmSI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Create exports directory
const exportsDir = path.join(__dirname, '..', 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// Collections to export
const collections = [
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

async function exportCollection(tableName) {
  console.log(`📦 Exporting ${tableName}...`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error(`❌ Error exporting ${tableName}:`, error.message);
      return;
    }
    
    const filePath = path.join(exportsDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Exported ${data.length} records from ${tableName}`);
  } catch (err) {
    console.error(`❌ Failed to export ${tableName}:`, err.message);
  }
}

async function exportAll() {
  console.log('🚀 Starting Supabase data export...\n');
  
  for (const collection of collections) {
    await exportCollection(collection);
  }
  
  console.log('\n✨ Export complete! Files saved to ./exports/');
  console.log('\nNext steps:');
  console.log('1. Review exported files in ./exports/');
  console.log('2. Run: node scripts/import-to-firebase.js');
}

exportAll().catch(console.error);
