import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome, sobrenome, pin } = await req.json();

    const adminNome = Deno.env.get('ADMIN_NOME') || '';
    const adminSobrenome = Deno.env.get('ADMIN_SOBRENOME') || '';
    const adminPin = Deno.env.get('ADMIN_PIN') || '';

    const isValid =
      nome.toLowerCase() === adminNome.toLowerCase() &&
      sobrenome.toLowerCase() === adminSobrenome.toLowerCase() &&
      pin === adminPin;

    if (isValid) {
      // Generate HMAC-signed token with expiry
      const payload = {
        sub: 'admin',
        exp: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
        iat: Date.now(),
      };
      const payloadB64 = btoa(JSON.stringify(payload));

      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(adminPin),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const token = `${payloadB64}.${signatureHex}`;

      return new Response(
        JSON.stringify({ success: true, token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Credenciais inválidas' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
