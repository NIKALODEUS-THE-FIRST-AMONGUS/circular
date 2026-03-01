import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { initializeApp, cert, getApps } from 'npm:firebase-admin@12.0.0/app'
import { getMessaging } from 'npm:firebase-admin@12.0.0/messaging'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Initialize Firebase Admin SDK
let firebaseApp
try {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '{}')
    firebaseApp = initializeApp({
      credential: cert(serviceAccount)
    })
  } else {
    firebaseApp = getApps()[0]
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error)
}

interface NotificationPayload {
  circular_id: string
  title: string
  content: string
  author_name: string
  department_target: string
  target_year: string
  target_section: string
  priority: string
}

interface FCMToken {
  token: string
  user_id: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🚀 FCM Notification Request Started')
  console.log('📝 Request Method:', req.method)
  console.log('📝 Request Headers:', Object.fromEntries(req.headers.entries()))

  try {
    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: NotificationPayload = await req.json()
    
    console.log('📤 Processing notification for circular:', payload.circular_id)
    console.log('📋 Payload:', JSON.stringify(payload, null, 2))
    console.log('🎯 Targeting:', {
      department: payload.department_target,
      year: payload.target_year,
      section: payload.target_section,
      priority: payload.priority
    })

    // Get all eligible users based on targeting
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, department, year_of_study, section, role')
      .eq('status', 'active')

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError)
      throw profileError
    }

    console.log(`👥 Found ${profiles?.length || 0} total active profiles`)

    // Filter users based on circular targeting
    const eligibleUserIds = profiles
      .filter(profile => {
        // Universal targeting
        if (payload.department_target === 'ALL' && 
            payload.target_year === 'ALL' && 
            payload.target_section === 'ALL') {
          return true
        }

        // Department match
        const deptMatch = payload.department_target === 'ALL' || 
                         profile.department === payload.department_target

        // Year match
        const yearMatch = payload.target_year === 'ALL' || 
                         profile.year_of_study?.toString() === payload.target_year

        // Section match
        const sectionMatch = payload.target_section === 'ALL' || 
                            profile.section === payload.target_section

        return deptMatch && yearMatch && sectionMatch
      })
      .map(p => p.id)

    console.log(`🎯 Found ${eligibleUserIds.length} eligible users`)

    if (eligibleUserIds.length === 0) {
      console.log('⚠️ No eligible users found for this circular')
      return new Response(
        JSON.stringify({ message: 'No eligible users found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get FCM tokens for eligible users
    const { data: tokens, error: tokenError } = await supabaseClient
      .from('notification_tokens')
      .select('token, user_id')
      .in('user_id', eligibleUserIds)

    if (tokenError) {
      console.error('❌ Token fetch error:', tokenError)
      throw tokenError
    }

    console.log(`🔔 Found ${tokens?.length || 0} FCM tokens`)

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No FCM tokens found for eligible users')
      return new Response(
        JSON.stringify({ message: 'No FCM tokens found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare notification message
    const notificationTitle = payload.priority === 'important' 
      ? `🔴 URGENT: ${payload.title}`
      : `📢 ${payload.title}`

    const notificationBody = payload.content.length > 100
      ? payload.content.substring(0, 100) + '...'
      : payload.content

    // Get Firebase Messaging instance
    const messaging = getMessaging(firebaseApp)
    console.log('🔥 Firebase Messaging initialized')

    // Send notifications in batches using Firebase Admin SDK
    const batchSize = 500 // FCM allows up to 500 tokens per request
    let successCount = 0
    let failureCount = 0
    const invalidTokens: string[] = []

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize)
      const registrationTokens = batch.map((t: FCMToken) => t.token)

      // Create multicast message
      const message = {
        tokens: registrationTokens,
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          circular_id: payload.circular_id,
          priority: payload.priority,
          author: payload.author_name,
          click_action: `/dashboard/center/${payload.circular_id}`,
        },
        webpush: {
          notification: {
            icon: '/logo192.png',
            badge: '/logo192.png',
          },
          fcmOptions: {
            link: `/dashboard/center/${payload.circular_id}`,
          },
        },
        android: {
          priority: payload.priority === 'important' ? 'high' : 'normal',
        },
      }

      try {
        // Send multicast message
        const response = await messaging.sendEachForMulticast(message)
        
        successCount += response.successCount
        failureCount += response.failureCount

        console.log(`📊 Batch ${Math.floor(i / batchSize) + 1}: ${response.successCount} sent, ${response.failureCount} failed`)

        // Collect invalid tokens
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error
            if (error?.code === 'messaging/invalid-registration-token' ||
                error?.code === 'messaging/registration-token-not-registered') {
              invalidTokens.push(registrationTokens[idx])
            }
          }
        })
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error)
        failureCount += registrationTokens.length
      }
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      console.log(`🗑️ Removing ${invalidTokens.length} invalid tokens`)
      const { error: deleteError } = await supabaseClient
        .from('notification_tokens')
        .delete()
        .in('token', invalidTokens)
      
      if (deleteError) {
        console.error('❌ Error deleting invalid tokens:', deleteError)
      } else {
        console.log('✅ Invalid tokens removed successfully')
      }
    }

    // Log notification in audit_logs
    const { error: auditError } = await supabaseClient
      .from('audit_logs')
      .insert({
        action: 'notification_sent',
        actor_id: null,
        details: {
          circular_id: payload.circular_id,
          title: payload.title,
          recipients: eligibleUserIds.length,
          sent: successCount,
          failed: failureCount,
        },
      })

    if (auditError) {
      console.error('❌ Audit log error:', auditError)
    } else {
      console.log('✅ Audit log created')
    }

    console.log('✅ Notification process completed successfully')
    console.log('📊 Final Stats:', {
      eligible_users: eligibleUserIds.length,
      tokens_found: tokens.length,
      sent: successCount,
      failed: failureCount
    })

    return new Response(
      JSON.stringify({
        message: 'Notifications sent successfully',
        eligible_users: eligibleUserIds.length,
        tokens_found: tokens.length,
        sent: successCount,
        failed: failureCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Fatal Error:', error)
    console.error('❌ Error Stack:', error.stack)
    console.error('❌ Error Details:', JSON.stringify(error, null, 2))
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
