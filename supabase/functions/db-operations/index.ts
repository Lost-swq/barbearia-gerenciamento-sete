import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token, x-client-session, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Explicit columns to never expose pin_criacao
const CLIENTE_COLUMNS = 'id, nome, sobrenome, cpf, plano, data_pagamento, cortes_restantes, cortes_bonus, ativo, data_ultimo_reset, created_at, updated_at';

async function verifyAdminToken(token: string): Promise<boolean> {
  const secret = Deno.env.get('ADMIN_PIN') || '';
  if (!secret || !token) return false;

  try {
    const [payloadB64, signatureHex] = token.split('.');
    if (!payloadB64 || !signatureHex) return false;

    // Verify HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = new Uint8Array(
      signatureHex.match(/.{2}/g)!.map(b => parseInt(b, 16))
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(payloadB64)
    );

    if (!isValid) return false;

    // Check expiry
    const payload = JSON.parse(atob(payloadB64));
    if (Date.now() > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

function verifyClientSession(sessionToken: string, clienteId: string): boolean {
  // Client session token format: base64({cpf, cliente_id, exp}).signature
  // For now, we validate that the token references the correct client
  try {
    const [payloadB64] = sessionToken.split('.');
    if (!payloadB64) return false;
    const payload = JSON.parse(atob(payloadB64));
    if (Date.now() > payload.exp) return false;
    if (payload.cliente_id !== clienteId) return false;
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, payload } = await req.json();

    // Define action categories
    const adminOnlyActions = ['insert_cliente', 'update_cliente', 'delete_cliente', 'adicionar_corte', 'registrar_pagamento', 'delete_all'];
    const adminReadActions = ['get_clientes', 'get_all_pagamentos', 'get_all_cortes'];
    const publicActions = ['get_cliente_by_credentials']; // Login action - no auth needed
    const clientActions = ['registrar_corte']; // Client can register their own cuts
    const clientReadActions = ['get_cliente_by_id', 'get_cliente_by_cpf', 'get_historico_pagamentos', 'get_historico_cortes'];

    // Admin token validation for admin-only write + admin-read actions
    const adminToken = req.headers.get('x-admin-token');
    const clientSession = req.headers.get('x-client-session');

    if (adminOnlyActions.includes(action) || adminReadActions.includes(action)) {
      if (!adminToken || !(await verifyAdminToken(adminToken))) {
        return new Response(
          JSON.stringify({ error: 'Token de admin inválido ou expirado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Client actions require either admin token OR valid client session
    if (clientActions.includes(action)) {
      const isAdmin = adminToken && await verifyAdminToken(adminToken);
      const hasClientSession = clientSession && payload?.cliente_id && verifyClientSession(clientSession, payload.cliente_id);
      if (!isAdmin && !hasClientSession) {
        return new Response(
          JSON.stringify({ error: 'Autenticação necessária' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Client read actions require either admin token OR client session
    if (clientReadActions.includes(action)) {
      const isAdmin = adminToken && await verifyAdminToken(adminToken);
      if (!isAdmin && !clientSession) {
        return new Response(
          JSON.stringify({ error: 'Autenticação necessária' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    switch (action) {
      case 'get_clientes': {
        const { data, error } = await supabase
          .from('clientes')
          .select(CLIENTE_COLUMNS)
          .eq('ativo', true)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return jsonResponse({ data }, corsHeaders);
      }

      case 'get_cliente_by_credentials': {
        const { nome, sobrenome, cpf } = payload;
        if (!nome || !sobrenome || !cpf) {
          return new Response(
            JSON.stringify({ error: 'Campos obrigatórios faltando' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const { data, error } = await supabase
          .from('clientes')
          .select(CLIENTE_COLUMNS)
          .eq('cpf', cpf)
          .eq('ativo', true)
          .ilike('nome', nome)
          .ilike('sobrenome', sobrenome)
          .single();
        if (error) return jsonResponse({ data: null }, corsHeaders);

        // Generate a client session token
        const sessionToken = await generateClientSession(data.id, data.cpf);
        return jsonResponse({ data, sessionToken }, corsHeaders);
      }

      case 'get_cliente_by_cpf': {
        const { cpf } = payload;
        const { data, error } = await supabase
          .from('clientes')
          .select(CLIENTE_COLUMNS)
          .eq('cpf', cpf)
          .eq('ativo', true)
          .single();
        if (error) return jsonResponse({ data: null }, corsHeaders);
        return jsonResponse({ data }, corsHeaders);
      }

      case 'get_cliente_by_id': {
        const { id } = payload;
        const { data, error } = await supabase
          .from('clientes')
          .select(CLIENTE_COLUMNS)
          .eq('id', id)
          .eq('ativo', true)
          .single();
        if (error) return jsonResponse({ data: null }, corsHeaders);
        return jsonResponse({ data }, corsHeaders);
      }

      case 'get_historico_pagamentos': {
        const { cliente_id } = payload;
        const { data, error } = await supabase
          .from('pagamentos_historico')
          .select('*')
          .eq('cliente_id', cliente_id)
          .order('data', { ascending: false });
        if (error) throw error;
        return jsonResponse({ data }, corsHeaders);
      }

      case 'get_historico_cortes': {
        const { cliente_id } = payload;
        const { data, error } = await supabase
          .from('cortes_historico')
          .select('*')
          .eq('cliente_id', cliente_id)
          .order('data', { ascending: false });
        if (error) throw error;
        return jsonResponse({ data }, corsHeaders);
      }

      case 'get_all_pagamentos': {
        const { cliente_ids } = payload;
        const { data, error } = await supabase
          .from('pagamentos_historico')
          .select('*')
          .in('cliente_id', cliente_ids)
          .order('data', { ascending: false });
        if (error) throw error;
        return jsonResponse({ data }, corsHeaders);
      }

      case 'get_all_cortes': {
        const { cliente_ids } = payload;
        const { data, error } = await supabase
          .from('cortes_historico')
          .select('*')
          .in('cliente_id', cliente_ids)
          .order('data', { ascending: false });
        if (error) throw error;
        return jsonResponse({ data }, corsHeaders);
      }

      case 'insert_cliente': {
        const { data, error } = await supabase
          .from('clientes')
          .insert(payload)
          .select(CLIENTE_COLUMNS)
          .single();
        if (error) throw error;
        return jsonResponse({ data }, corsHeaders);
      }

      case 'update_cliente': {
        const { id, updates } = payload;
        const { error } = await supabase
          .from('clientes')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
        return jsonResponse({ success: true }, corsHeaders);
      }

      case 'delete_cliente': {
        const { id } = payload;
        await supabase.from('cortes_historico').delete().eq('cliente_id', id);
        await supabase.from('pagamentos_historico').delete().eq('cliente_id', id);
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) throw error;
        return jsonResponse({ success: true }, corsHeaders);
      }

      case 'registrar_corte': {
        const { cliente_id, tipo } = payload;
        // Get current client data
        const { data: clienteData, error: fetchErr } = await supabase
          .from('clientes')
          .select('cortes_restantes, cortes_bonus')
          .eq('id', cliente_id)
          .single();
        if (fetchErr || !clienteData) throw fetchErr || new Error('Cliente não encontrado');
        if (clienteData.cortes_restantes <= 0) {
          return new Response(
            JSON.stringify({ error: 'Sem cortes disponíveis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const usandoBonus = (clienteData.cortes_bonus || 0) > 0;
        const { error: insertErr } = await supabase
          .from('cortes_historico')
          .insert({ cliente_id, tipo: usandoBonus ? 'admin' : (tipo || 'normal') });
        if (insertErr) throw insertErr;
        // Update client cuts
        const { error: updateErr } = await supabase
          .from('clientes')
          .update({
            cortes_restantes: clienteData.cortes_restantes - 1,
            cortes_bonus: usandoBonus ? clienteData.cortes_bonus - 1 : (clienteData.cortes_bonus || 0)
          })
          .eq('id', cliente_id);
        if (updateErr) throw updateErr;
        return jsonResponse({ success: true }, corsHeaders);
      }

      case 'registrar_pagamento': {
        const pagamentoData: any = {
          cliente_id: payload.cliente_id,
          valor: payload.valor,
          confirmacao: payload.confirmacao,
        };
        if (payload.data) {
          pagamentoData.data = payload.data;
        }
        const { error } = await supabase
          .from('pagamentos_historico')
          .insert(pagamentoData);
        if (error) throw error;
        return jsonResponse({ success: true }, corsHeaders);
      }

      case 'delete_all': {
        await supabase.from('cortes_historico').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('pagamentos_historico').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { error } = await supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        return jsonResponse({ success: true }, corsHeaders);
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação desconhecida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateClientSession(clienteId: string, cpf: string): Promise<string> {
  const payload = {
    cliente_id: clienteId,
    cpf,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const payloadB64 = btoa(JSON.stringify(payload));

  const secret = Deno.env.get('ADMIN_PIN') || '';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${payloadB64}.${signatureHex}`;
}

function jsonResponse(data: any, headers: Record<string, string>) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
}
