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
    // Forward the request to Supabase
    const headers = new Headers(request.headers);
    headers.set('apikey', supabaseKey);
    headers.set('Authorization', `Bearer ${supabaseKey}`);
    
    // Remove host header to avoid conflicts
    headers.delete('host');

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
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

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
