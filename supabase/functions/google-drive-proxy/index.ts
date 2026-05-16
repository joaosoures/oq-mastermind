import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get('id');

    if (!fileId) {
      return new Response(JSON.stringify({ error: 'Missing file id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Google Drive direct download URL
    const googleUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;

    const response = await fetch(googleUrl);

    if (!response.ok) {
      throw new Error(`Google Drive responded with ${response.status}`);
    }

    // Proxy the response
    const { body, headers, status } = response;
    
    // We want to keep most headers, especially Content-Type and Content-Length
    const responseHeaders = new Headers(corsHeaders);
    headers.forEach((value, key) => {
      if (['content-type', 'content-length', 'accept-ranges', 'content-range'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new Response(body, {
      status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
