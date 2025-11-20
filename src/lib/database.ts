import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PlanoType = Database['public']['Enums']['plano_type'];

export interface Cliente {
  id: string;
  nome: string;
  sobrenome: string;
  cpf: string;
  plano: PlanoType;
  data_pagamento: string;
  pin_criacao: string;
  cortes_restantes: number;
  cortes_bonus: number;
  data_ultimo_reset: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CorteHistorico {
  id: string;
  cliente_id: string;
  data: string;
  tipo: string | null;
  created_at: string;
}

export interface PagamentoHistorico {
  id: string;
  cliente_id: string;
  valor: number;
  data: string;
  confirmacao: string;
  created_at: string;
}

export const PLANOS = {
  COPA_BRASIL: {
    nome: 'Copa do Brasil',
    valor: 54.90,
    cortes: 3
  },
  UEFA_CL: {
    nome: 'UEFA Champions League',
    valor: 95.00,
    cortes: 3
  }
};

export const ADMIN_CREDENTIALS = {
  nome: 'Kelven',
  sobrenome: 'Jarqueles',
  pin: '08642'
};

export const CLIENT_CREATION_PIN = '97531';

// Funções auxiliares
export const getClienteById = async (id: string): Promise<Cliente | undefined> => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .eq('ativo', true)
    .single();
  
  if (error) return undefined;
  return data as Cliente;
};

export const getClienteByCpf = async (cpf: string): Promise<Cliente | undefined> => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('cpf', cpf)
    .eq('ativo', true)
    .single();
  
  if (error) return undefined;
  return data as Cliente;
};

export const getClienteByCredentials = async (
  nome: string,
  sobrenome: string,
  cpf: string
): Promise<Cliente | undefined> => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('cpf', cpf)
    .eq('ativo', true)
    .ilike('nome', nome)
    .ilike('sobrenome', sobrenome)
    .single();
  
  if (error) return undefined;
  return data as Cliente;
};

export const getAllClientes = async (): Promise<Cliente[]> => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Cliente[];
};

export const addCliente = async (cliente: {
  nome: string;
  sobrenome: string;
  cpf: string;
  plano: PlanoType;
  data_pagamento: string;
  pin_criacao: string;
  cortes_restantes?: number;
  cortes_bonus?: number;
}): Promise<string> => {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nome: cliente.nome,
      sobrenome: cliente.sobrenome,
      cpf: cliente.cpf,
      plano: cliente.plano,
      data_pagamento: cliente.data_pagamento,
      data_ultimo_reset: cliente.data_pagamento, // Define o mesmo dia como último reset
      pin_criacao: cliente.pin_criacao,
      cortes_restantes: cliente.cortes_restantes ?? 3,
      cortes_bonus: cliente.cortes_bonus ?? 0,
      ativo: true
    })
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
};

export const updateCliente = async (id: string, updates: Partial<Cliente>): Promise<void> => {
  const { error } = await supabase
    .from('clientes')
    .update(updates)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteCliente = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('clientes')
    .update({ ativo: false })
    .eq('id', id);
  
  if (error) throw error;
};

export const registrarCorte = async (clienteId: string): Promise<void> => {
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .single();

  if (clienteError || !cliente) throw new Error('Cliente não encontrado');

  if (cliente.cortes_restantes <= 0) {
    throw new Error('Sem cortes disponíveis');
  }

  const usandoBonus = (cliente.cortes_bonus || 0) > 0;
  
  // Inserir no histórico de cortes
  const { error: corteError } = await supabase
    .from('cortes_historico')
    .insert({
      cliente_id: clienteId,
      tipo: usandoBonus ? 'admin' : 'normal'
    });

  if (corteError) throw corteError;

  // Atualizar cortes restantes
  const { error: updateError } = await supabase
    .from('clientes')
    .update({
      cortes_restantes: cliente.cortes_restantes - 1,
      cortes_bonus: usandoBonus ? cliente.cortes_bonus - 1 : (cliente.cortes_bonus || 0)
    })
    .eq('id', clienteId);

  if (updateError) throw updateError;
};

export const adicionarCorte = async (clienteId: string): Promise<void> => {
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .single();

  if (clienteError || !cliente) throw new Error('Cliente não encontrado');

  const { error } = await supabase
    .from('clientes')
    .update({
      cortes_restantes: cliente.cortes_restantes + 1,
      cortes_bonus: (cliente.cortes_bonus || 0) + 1
    })
    .eq('id', clienteId);

  if (error) throw error;
};

export const registrarPagamento = async (
  clienteId: string,
  valor: number
): Promise<void> => {
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .single();

  if (clienteError || !cliente) throw new Error('Cliente não encontrado');

  const codigoConfirmacao = gerarCodigoConfirmacao();

  // Inserir no histórico de pagamentos
  const { error: pagamentoError } = await supabase
    .from('pagamentos_historico')
    .insert({
      cliente_id: clienteId,
      valor,
      confirmacao: codigoConfirmacao
    });

  if (pagamentoError) throw pagamentoError;
};

const gerarCodigoConfirmacao = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const calcularProximoReset = (dataPagamento: string): Date => {
  // Formato esperado: yyyy-mm-dd
  const data = new Date(dataPagamento);
  // Adiciona 31 dias à data de pagamento
  data.setDate(data.getDate() + 31);
  return data;
};

export const verificarEResetarCortes = async (): Promise<void> => {
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('ativo', true);

  if (error || !clientes) return;
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  for (const cliente of clientes) {
    // Determina a data base para calcular o próximo reset
    const dataBase = cliente.data_ultimo_reset 
      ? new Date(cliente.data_ultimo_reset)
      : new Date(cliente.data_pagamento);
    
    // Calcula a data do próximo reset (31 dias após a data base)
    const proximoReset = new Date(dataBase);
    proximoReset.setDate(proximoReset.getDate() + 31);
    proximoReset.setHours(0, 0, 0, 0);
    
    // Se hoje >= próximo reset, fazer o reset
    if (hoje >= proximoReset) {
      await supabase
        .from('clientes')
        .update({
          cortes_restantes: PLANOS[cliente.plano].cortes,
          cortes_bonus: 0,
          data_ultimo_reset: hoje.toISOString().split('T')[0]
        })
        .eq('id', cliente.id);
    }
  }
};

// Função para buscar histórico de cortes de um cliente
export const getHistoricoCortes = async (clienteId: string): Promise<CorteHistorico[]> => {
  const { data, error } = await supabase
    .from('cortes_historico')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('data', { ascending: false });
  
  if (error) throw error;
  return data as CorteHistorico[];
};

// Função para buscar histórico de pagamentos de um cliente
export const getHistoricoPagamentos = async (clienteId: string): Promise<PagamentoHistorico[]> => {
  const { data, error } = await supabase
    .from('pagamentos_historico')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('data', { ascending: false });
  
  if (error) throw error;
  return data as PagamentoHistorico[];
};
