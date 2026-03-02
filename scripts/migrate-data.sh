#!/bin/bash
# Complete data migration script
# Run: bash scripts/migrate-data.sh

echo "🚀 Starting complete data migration..."
echo ""

# Step 1: Export from Supabase
echo "📦 Step 1: Exporting data from Supabase..."
node scripts/export-from-supabase.js

if [ $? -ne 0 ]; then
    echo "❌ Export failed! Please check your Supabase credentials."
    exit 1
fi

echo ""
echo "✅ Export complete!"
echo ""

# Step 2: Review exports (optional pause)
echo "📋 Exported files:"
ls -lh exports/
echo ""
read -p "Review the exports above. Continue with import? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Step 3: Import to Firebase
echo "📥 Step 2: Importing data to Firebase..."
node scripts/import-to-firebase.js

if [ $? -ne 0 ]; then
    echo "❌ Import failed! Please check your Firebase credentials."
    exit 1
fi

echo ""
echo "✅ Import complete!"
echo ""

# Step 4: Deploy Firestore rules
echo "🔒 Step 3: Deploying Firestore rules..."
firebase deploy --only firestore:rules

if [ $? -ne 0 ]; then
    echo "⚠️  Rules deployment failed. You may need to deploy manually."
fi

echo ""
echo "🎉 Migration complete!"
echo ""
echo "Next steps:"
echo "1. Verify data in Firebase Console:"
echo "   https://console.firebase.google.com/project/circular2-15417/firestore/data"
echo ""
echo "2. Test your application thoroughly"
echo ""
echo "3. Keep Supabase as backup for 1 week"
echo ""
