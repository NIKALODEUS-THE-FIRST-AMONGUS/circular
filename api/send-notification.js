// OneSignal Push Notification API
// Sends push notifications when circulars are published

export default async function handler(req, res) {
  // 1. Check HTTP Method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. SECURITY LAYER: Check for the Authorization header
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.NOTIFICATION_SECRET_KEY;
  
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    console.warn('Blocked unauthorized notification attempt');
    return res.status(401).json({ error: 'Unauthorized access' });
  }

  try {
    const { title, body, circularId, priority, authorRole, imageUrl, content } = req.body;

    console.log('📬 Notification request received:', { title, circularId, priority });

    if (!title || !circularId) {
       return res.status(400).json({ error: 'Missing required fields: title, circularId' });
    }

    // OneSignal API endpoint
    const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';
    // Try both VITE_ and non-VITE_ versions for compatibility
    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID;
    const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || process.env.VITE_ONESIGNAL_REST_API_KEY;
    const APP_URL = process.env.VITE_APP_URL || process.env.VERCEL_URL || 'https://sxl-lake.vercel.app';

    console.log('🔑 Environment check:', {
      hasAppId: !!ONESIGNAL_APP_ID,
      hasApiKey: !!ONESIGNAL_REST_API_KEY,
      appUrl: APP_URL,
      envKeys: Object.keys(process.env).filter(k => k.includes('ONESIGNAL') || k.includes('NOTIFICATION'))
    });

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('OneSignal credentials not configured');
      console.error('ONESIGNAL_APP_ID:', ONESIGNAL_APP_ID ? 'Set' : 'Missing');
      console.error('ONESIGNAL_REST_API_KEY:', ONESIGNAL_REST_API_KEY ? 'Set' : 'Missing');
      return res.status(500).json({ 
        error: 'OneSignal not configured',
        details: {
          hasAppId: !!ONESIGNAL_APP_ID,
          hasApiKey: !!ONESIGNAL_REST_API_KEY
        }
      });
    }

    // Prepare notification payload
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      // Send to all subscribed users (you can filter by tags if needed)
      included_segments: ['All'],
      // Notification content
      headings: { en: title },
      contents: { en: content || body || 'Tap to view the new circular' },
      // Add image if available
      big_picture: imageUrl || undefined,
      large_icon: imageUrl || undefined,
      // URL to open when clicked
      url: `${APP_URL}/dashboard/center/${circularId}`,
      // Custom data
      data: {
        circularId,
        priority: priority || 'normal',
        authorRole: authorRole || 'teacher'
      },
      // Priority settings
      priority: priority === 'urgent' ? 10 : 5,
      // Android specific
      android_channel_id: priority === 'urgent' ? 'urgent-circulars' : 'circulars',
      // iOS specific
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      // Web push specific
      web_buttons: [
        {
          id: 'view-circular',
          text: 'View Details',
          icon: '/logo.svg'
        }
      ]
    };

    // Send notification via OneSignal
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notificationPayload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal API error:', result);
      console.error('OneSignal API status:', response.status);
      console.error('Payload sent:', JSON.stringify(notificationPayload, null, 2));
      return res.status(response.status).json({ 
        error: 'Failed to send notification', 
        details: result,
        payload: notificationPayload
      });
    }

    console.log('✅ Notification sent via OneSignal:', result);

    return res.status(200).json({
      message: 'Notification sent successfully',
      recipients: result.recipients || 0,
      id: result.id
    });

  } catch (error) {
    console.error('Error sending push notification:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
