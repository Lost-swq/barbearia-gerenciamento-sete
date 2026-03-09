import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, payload } = await req.json();

    // For write operations, verify admin token
    const adminToken = req.headers.get('x-admin-token');
    const writeActions = ['insert_cliente', 'update_cliente', 'delete_cliente', 'registrar_corte', 'adicionar_corte', 'registrar_pagamento', 'delete_all'];
    
    if (writeActions.includes(action) && !adminToken) {
      return new Response(
        JSON.stringify({ error: 'Token de admin necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'get_clientes': {
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('ativo', true)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return jsonResponse({ data }, corsHeaders);
      }

      case 'get_cliente_by_credentials': {
        const { nome, sobrenome, cpf } = payload;
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('cpf', cpf)
          .eq('ativo', true)
          .ilike('nome', nome)
          .ilike('sobrenome', sobrenome)
          .single();
        if (error) return jsonResponse({ data: null }, corsHeaders);
        return jsonResponse({ data }, corsHeaders);
      }

      case 'get_cliente_by_id': {
        const { id } = payload;
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
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
          .select()
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
        const { error } = await supabase
          .from('cortes_historico')
          .insert({ cliente_id, tipo: tipo || 'normal' });
        if (error) throw error;
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
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function jsonResponse(data: any, headers: Record<string, string>) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
}
