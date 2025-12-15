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
  // Deletar histórico de cortes
  await supabase
    .from('cortes_historico')
    .delete()
    .eq('cliente_id', id);

  // Deletar histórico de pagamentos
  await supabase
    .from('pagamentos_historico')
    .delete()
    .eq('cliente_id', id);

  // Deletar o cliente
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Excluir todos os clientes e seus dados
export const deleteAllClientes = async (): Promise<void> => {
  // Deletar todos os históricos de cortes
  await supabase
    .from('cortes_historico')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

  // Deletar todos os históricos de pagamentos
  await supabase
    .from('pagamentos_historico')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

  // Deletar todos os clientes
  const { error } = await supabase
    .from('clientes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

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
  valor: number,
  dataPagamento?: string
): Promise<void> => {
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .single();

  if (clienteError || !cliente) throw new Error('Cliente não encontrado');

  const codigoConfirmacao = gerarCodigoConfirmacao();

  // Inserir no histórico de pagamentos
  const pagamentoData: any = {
    cliente_id: clienteId,
    valor,
    confirmacao: codigoConfirmacao
  };

  // Se foi fornecida uma data específica, usar ela
  if (dataPagamento) {
    pagamentoData.data = dataPagamento;
  }

  const { error: pagamentoError } = await supabase
    .from('pagamentos_historico')
    .insert(pagamentoData);

  if (pagamentoError) throw pagamentoError;

  // Lógica de Pagamento Cumulativo
  // Se o cliente paga antes do vencimento, estendemos a data base do pagamento em 1 mês
  // Se paga depois (vencido), a data base vira a data atual (ou a data do pagamento informada)

  let novaDataPagamento: Date;
  const dataPagamentoEfetivo = dataPagamento ? new Date(dataPagamento) : new Date();

  // Normalizar datas para comparação (zerar horas)
  dataPagamentoEfetivo.setHours(12, 0, 0, 0); // Meio-dia para evitar timezone issues

  // Verifica se está dentro da validade
  if (podeFazerCheckin(cliente)) {
    // Cliente adimplente: Soma 1 mês à data de referência antiga
    novaDataPagamento = new Date(cliente.data_pagamento);
    // Adiciona "T12:00:00Z" se não tiver, para parse correto
    if (!cliente.data_pagamento.includes('T')) {
      novaDataPagamento = new Date(`${cliente.data_pagamento}T12:00:00Z`);
    }

    const diaOriginal = novaDataPagamento.getUTCDate();
    novaDataPagamento.setUTCMonth(novaDataPagamento.getUTCMonth() + 1);

    // Ajuste de overflow de mês (ex: 31/01 -> 03/03 -> 28/02)
    if (novaDataPagamento.getUTCDate() !== diaOriginal) {
      novaDataPagamento.setUTCDate(0);
    }
  } else {
    // Cliente inadimplente ou primeira vez: Data base vira a data do pagamento atual
    novaDataPagamento = dataPagamentoEfetivo;
  }

  // Atualiza o cliente com a nova data base
  const { error: updateError } = await supabase
    .from('clientes')
    .update({
      data_pagamento: novaDataPagamento.toISOString().split('T')[0], // yyyy-mm-dd
      data_ultimo_reset: novaDataPagamento.toISOString().split('T')[0] // Atualiza reset também
    })
    .eq('id', clienteId);

  if (updateError) throw updateError;
};

const gerarCodigoConfirmacao = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const calcularVencimento = (dataPagamento: string): Date => {
  // Garante que a data seja tratada como UTC meio-dia para evitar problemas de fuso
  // Se a string for apenas yyyy-mm-dd, adiciona T12:00:00Z
  const isoString = dataPagamento.includes('T') ? dataPagamento : `${dataPagamento}T12:00:00Z`;
  const vencimento = new Date(isoString);

  const diaOriginal = vencimento.getUTCDate();
  vencimento.setUTCMonth(vencimento.getUTCMonth() + 1);

  // Tratamento de overflow (ex: 31 Jan -> 3 Mar -> Volta para 28/29 Fev)
  if (vencimento.getUTCDate() !== diaOriginal) {
    vencimento.setUTCDate(0); // Volta para o último dia do mês anterior
  }

  return vencimento;
};

export const podeFazerCheckin = (cliente: Cliente): boolean => {
  if (!cliente.ativo) return false;

  // Se não tiver data de pagamento, bloqueia
  if (!cliente.data_pagamento) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Considera início do dia

  // Calcula vencimento baseado na data do último pagamento
  const vencimento = calcularVencimento(cliente.data_pagamento);

  // Define o vencimento para o final do dia (tolerância até 23:59:59)
  vencimento.setUTCHours(23, 59, 59, 999);

  // Permite check-in se hoje for anterior ou igual ao vencimento
  return hoje.getTime() <= vencimento.getTime();
};

export const calcularProximoReset = (dataPagamento: string): Date => {
  return calcularVencimento(dataPagamento);
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
