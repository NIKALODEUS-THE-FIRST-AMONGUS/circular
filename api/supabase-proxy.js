/**
 * Vercel Edge Function to proxy Supabase requests
 * Bypasses mobile carrier blocks by routing through Vercel domain
 */

/* global process */

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  
  // Get Supabase URL from environment (try both with and without VITE_ prefix)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ 
        error: 'Supabase configuration missing',
        debug: {
          hasViteUrl: !!process.env.VITE_SUPABASE_URL,
          hasUrl: !!process.env.SUPABASE_URL,
          hasViteKey: !!process.env.VITE_SUPABASE_ANON_KEY,
          hasKey: !!process.env.SUPABASE_ANON_KEY
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Construct target URL
  const targetUrl = `${supabaseUrl}${path}`;

  try {
    // Get headers from original request
    const headers = new Headers();
    
    // Copy important headers from the original request
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers.set('Authorization', authHeader);
    } else {
      // Use anon key as fallback
      headers.set('Authorization', `Bearer ${supabaseKey}`);
    }
    
    // Always set apikey
    headers.set('apikey', supabaseKey);
    
    // Copy content-type if present
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    
    // Copy other Supabase-specific headers
    const prefer = request.headers.get('prefer');
    if (prefer) {
      headers.set('Prefer', prefer);
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' 
        ? await request.text() 
        : undefined,
    });

    // Clone response and add CORS headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, prefer, x-client-info');
    responseHeaders.set('Access-Control-Expose-Headers', 'content-range, x-supabase-api-version');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Proxy request failed', 
        message: error.message,
        targetUrl: targetUrl
      }),
      { 
        status: 502, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
