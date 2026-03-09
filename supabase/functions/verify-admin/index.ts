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
      // Generate a simple token (hash of credentials + timestamp)
      const encoder = new TextEncoder();
      const data = encoder.encode(`${adminNome}${adminPin}${Date.now()}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const token = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

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
