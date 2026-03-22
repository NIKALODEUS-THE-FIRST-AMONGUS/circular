#!/bin/bash

# Enable Firebase Cloud Messaging APIs
# Run this script if you have gcloud CLI installed

echo "🔧 Enabling Firebase Cloud Messaging APIs..."

gcloud services enable fcmregistrations.googleapis.com --project=circular2-15417
gcloud services enable fcm.googleapis.com --project=circular2-15417
gcloud services enable firebaseinstallations.googleapis.com --project=circular2-15417

echo "✅ APIs enabled! Wait 2-3 minutes for changes to propagate."
echo "📱 Refresh your app to test notifications."
