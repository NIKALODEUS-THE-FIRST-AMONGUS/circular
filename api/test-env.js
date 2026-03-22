// Test endpoint to check environment variables
export default async function handler(req, res) {
  return res.status(200).json({
    hasOnesignalAppId: !!process.env.ONESIGNAL_APP_ID,
    hasOnesignalApiKey: !!process.env.ONESIGNAL_REST_API_KEY,
    hasNotificationSecret: !!process.env.NOTIFICATION_SECRET_KEY,
    appIdLength: process.env.ONESIGNAL_APP_ID?.length || 0,
    apiKeyLength: process.env.ONESIGNAL_REST_API_KEY?.length || 0,
    // Don't expose actual values, just check if they exist
    envKeys: Object.keys(process.env).filter(k => k.includes('ONESIGNAL') || k.includes('NOTIFICATION'))
  });
}
