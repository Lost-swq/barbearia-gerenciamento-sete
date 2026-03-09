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

// Admin credentials and client creation PIN are now stored server-side as secrets
// and verified via edge functions (verify-admin and verify-pin)

// Helper to get admin token from sessionStorage
const getAdminToken = (): string | null => {
  return sessionStorage.getItem("adminAuthenticated");
};

// Helper to get client session token
const getClientSession = (): string | null => {
  return sessionStorage.getItem("clientSession");
};

// Helper to call db-operations edge function
const dbOp = async (action: string, payload?: any, requiresAdmin = false) => {
  const headers: Record<string, string> = {};
  if (requiresAdmin) {
    const token = getAdminToken();
    if (token) {
      headers['x-admin-token'] = token;
    }
  }

  // For client read actions, send client session if available
  const clientSession = getClientSession();
  if (clientSession) {
    headers['x-client-session'] = clientSession;
  }

  // Admin token also works for client reads
  const adminToken = getAdminToken();
  if (adminToken && !headers['x-admin-token']) {
    headers['x-admin-token'] = adminToken;
  }

  const { data, error } = await supabase.functions.invoke('db-operations', {
    body: { action, payload },
    headers,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

// Funções auxiliares
export const getClienteById = async (id: string): Promise<Cliente | undefined> => {
  const result = await dbOp('get_cliente_by_id', { id });
  return result.data || undefined;
};

export const getClienteByCpf = async (cpf: string): Promise<Cliente | undefined> => {
  const result = await dbOp('get_cliente_by_cpf', { cpf });
  return result.data || undefined;
};

export const getClienteByCredentials = async (
  nome: string,
  sobrenome: string,
  cpf: string
): Promise<Cliente | undefined> => {
  const result = await dbOp('get_cliente_by_credentials', { nome, sobrenome, cpf });
  // Store client session token if provided
  if (result.sessionToken) {
    sessionStorage.setItem("clientSession", result.sessionToken);
  }
  return result.data || undefined;
};

export const getAllClientes = async (): Promise<Cliente[]> => {
  const result = await dbOp('get_clientes', undefined, true);
  return result.data as Cliente[];
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
  const result = await dbOp('insert_cliente', {
    nome: cliente.nome,
    sobrenome: cliente.sobrenome,
    cpf: cliente.cpf,
    plano: cliente.plano,
    data_pagamento: cliente.data_pagamento,
    data_ultimo_reset: cliente.data_pagamento,
    pin_criacao: cliente.pin_criacao,
    cortes_restantes: cliente.cortes_restantes ?? 3,
    cortes_bonus: cliente.cortes_bonus ?? 0,
    ativo: true
  }, true);
  return result.data.id;
};

export const updateCliente = async (id: string, updates: Partial<Cliente>): Promise<void> => {
  await dbOp('update_cliente', { id, updates }, true);
};

export const deleteCliente = async (id: string): Promise<void> => {
  await dbOp('delete_cliente', { id }, true);
};

export const deleteAllClientes = async (): Promise<void> => {
  await dbOp('delete_all', {}, true);
};

export const registrarCorte = async (clienteId: string): Promise<void> => {
  // All logic is now handled server-side in the edge function
  await dbOp('registrar_corte', {
    cliente_id: clienteId,
  });
};

export const adicionarCorte = async (clienteId: string): Promise<void> => {
  const cliente = await getClienteById(clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  await updateCliente(clienteId, {
    cortes_restantes: cliente.cortes_restantes + 1,
    cortes_bonus: (cliente.cortes_bonus || 0) + 1
  });
};

export const registrarPagamento = async (
  clienteId: string,
  valor: number,
  dataPagamento?: string
): Promise<void> => {
  const cliente = await getClienteById(clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  const codigoConfirmacao = gerarCodigoConfirmacao();

  const pagamentoData: any = {
    cliente_id: clienteId,
    valor,
    confirmacao: codigoConfirmacao
  };

  if (dataPagamento) {
    pagamentoData.data = dataPagamento;
  }

  await dbOp('registrar_pagamento', pagamentoData, true);

  // Lógica de Pagamento Cumulativo
  let novaDataPagamento: Date;
  const dataPagamentoEfetivo = dataPagamento ? new Date(dataPagamento) : new Date();
  dataPagamentoEfetivo.setHours(12, 0, 0, 0);

  if (podeFazerCheckin(cliente)) {
    novaDataPagamento = new Date(cliente.data_pagamento);
    if (!cliente.data_pagamento.includes('T')) {
      novaDataPagamento = new Date(`${cliente.data_pagamento}T12:00:00Z`);
    }

    const diaOriginal = novaDataPagamento.getUTCDate();
    novaDataPagamento.setUTCMonth(novaDataPagamento.getUTCMonth() + 1);

    if (novaDataPagamento.getUTCDate() !== diaOriginal) {
      novaDataPagamento.setUTCDate(0);
    }
  } else {
    novaDataPagamento = dataPagamentoEfetivo;
  }

  const cortesDoPlano = PLANOS[cliente.plano as keyof typeof PLANOS]?.cortes ?? 3;

  await updateCliente(clienteId, {
    data_pagamento: novaDataPagamento.toISOString().split('T')[0],
    data_ultimo_reset: novaDataPagamento.toISOString().split('T')[0],
    cortes_restantes: cortesDoPlano,
    cortes_bonus: 0
  });
};

const gerarCodigoConfirmacao = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const calcularVencimento = (dataPagamento: string): Date => {
  const isoString = dataPagamento.includes('T') ? dataPagamento : `${dataPagamento}T12:00:00Z`;
  const vencimento = new Date(isoString);

  const diaOriginal = vencimento.getUTCDate();
  vencimento.setUTCMonth(vencimento.getUTCMonth() + 1);

  if (vencimento.getUTCDate() !== diaOriginal) {
    vencimento.setUTCDate(0);
  }

  return vencimento;
};

export const podeFazerCheckin = (cliente: Cliente): boolean => {
  if (!cliente.ativo) return false;
  if (!cliente.data_pagamento) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vencimento = calcularVencimento(cliente.data_pagamento);
  vencimento.setUTCHours(23, 59, 59, 999);

  return hoje.getTime() <= vencimento.getTime();
};

export const calcularProximoReset = (dataPagamento: string): Date => {
  return calcularVencimento(dataPagamento);
};

export const verificarEResetarCortes = async (): Promise<void> => {
  const clientes = await getAllClientes();
  if (!clientes) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (const cliente of clientes) {
    const dataBase = cliente.data_ultimo_reset
      ? new Date(cliente.data_ultimo_reset)
      : new Date(cliente.data_pagamento);

    const proximoReset = new Date(dataBase);
    proximoReset.setDate(proximoReset.getDate() + 31);
    proximoReset.setHours(0, 0, 0, 0);

    if (hoje >= proximoReset) {
      await updateCliente(cliente.id, {
        cortes_restantes: PLANOS[cliente.plano].cortes,
        cortes_bonus: 0,
        data_ultimo_reset: hoje.toISOString().split('T')[0]
      });
    }
  }
};

export const getHistoricoCortes = async (clienteId: string): Promise<CorteHistorico[]> => {
  const result = await dbOp('get_historico_cortes', { cliente_id: clienteId });
  return result.data as CorteHistorico[];
};

export const getHistoricoPagamentos = async (clienteId: string): Promise<PagamentoHistorico[]> => {
  const result = await dbOp('get_historico_pagamentos', { cliente_id: clienteId });
  return result.data as PagamentoHistorico[];
};

// Bulk fetch helpers for admin dashboard
export const getAllPagamentos = async (clienteIds: string[]) => {
  const result = await dbOp('get_all_pagamentos', { cliente_ids: clienteIds });
  return result.data || [];
};

export const getAllCortes = async (clienteIds: string[]) => {
  const result = await dbOp('get_all_cortes', { cliente_ids: clienteIds });
  return result.data || [];
};
