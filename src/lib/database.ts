import Dexie, { Table } from 'dexie';

export type PlanoType = 'COPA_BRASIL' | 'UEFA_CL';

export interface Cliente {
  id?: number;
  nome: string;
  sobrenome: string;
  cpf: string;
  plano: PlanoType;
  dataPagamento: string;
  cortesRestantes: number;
  cortesBonus: number;
  historicoCortes: CorteHistorico[];
  historicoPagamentos: PagamentoHistorico[];
  dataUltimoReset: string;
  ativo: boolean;
}

export interface CorteHistorico {
  data: string;
  hora: string;
  tipo?: 'normal' | 'admin';
}

export interface PagamentoHistorico {
  valor: number;
  data: string;
  hora: string;
  confirmacao: string;
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

class BarberDatabase extends Dexie {
  clientes!: Table<Cliente>;

  constructor() {
    super('BarberClubDB');
    this.version(1).stores({
      clientes: '++id, nome, sobrenome, cpf, ativo'
    });
  }
}

export const db = new BarberDatabase();

// Funções auxiliares
export const getClienteByCpf = async (cpf: string): Promise<Cliente | undefined> => {
  return await db.clientes.where('cpf').equals(cpf).and(cliente => cliente.ativo).first();
};

export const getClienteByCredentials = async (
  nome: string,
  sobrenome: string,
  cpf: string
): Promise<Cliente | undefined> => {
  return await db.clientes
    .where('cpf').equals(cpf)
    .and(cliente =>
      cliente.nome.toLowerCase() === nome.toLowerCase() &&
      cliente.sobrenome.toLowerCase() === sobrenome.toLowerCase() &&
      cliente.ativo
    )
    .first();
};

export const getAllClientes = async (): Promise<Cliente[]> => {
  return await db.clientes.filter(cliente => cliente.ativo === true).toArray();
};

export const addCliente = async (cliente: Omit<Cliente, 'id'>): Promise<number> => {
  return await db.clientes.add(cliente);
};

export const updateCliente = async (id: number, updates: Partial<Cliente>): Promise<number> => {
  return await db.clientes.update(id, updates);
};

export const deleteCliente = async (id: number): Promise<void> => {
  await db.clientes.update(id, { ativo: false });
};

export const registrarCorte = async (clienteId: number): Promise<void> => {
  const cliente = await db.clientes.get(clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  if (cliente.cortesRestantes <= 0) {
    throw new Error('Sem cortes disponíveis');
  }

  const agora = new Date();
  const usandoBonus = (cliente.cortesBonus || 0) > 0;
  
  const novoCorte: CorteHistorico = {
    data: agora.toLocaleDateString('pt-BR'),
    hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    tipo: usandoBonus ? 'admin' : 'normal'
  };

  await db.clientes.update(clienteId, {
    cortesRestantes: cliente.cortesRestantes - 1,
    cortesBonus: usandoBonus ? cliente.cortesBonus - 1 : (cliente.cortesBonus || 0),
    historicoCortes: [...cliente.historicoCortes, novoCorte]
  });
};

export const adicionarCorte = async (clienteId: number): Promise<void> => {
  const cliente = await db.clientes.get(clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  await db.clientes.update(clienteId, {
    cortesRestantes: cliente.cortesRestantes + 1,
    cortesBonus: (cliente.cortesBonus || 0) + 1
  });
};

export const registrarPagamento = async (
  clienteId: number,
  valor: number
): Promise<void> => {
  const cliente = await db.clientes.get(clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  const agora = new Date();
  const novoPagamento: PagamentoHistorico = {
    valor,
    data: agora.toLocaleDateString('pt-BR'),
    hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    confirmacao: `PAG-${Date.now()}`
  };

  await db.clientes.update(clienteId, {
    historicoPagamentos: [...cliente.historicoPagamentos, novoPagamento]
  });
};

export const calcularProximoReset = (dataPagamento: string): Date => {
  const [dia, mes, ano] = dataPagamento.split('/').map(Number);
  const dataBase = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataBase.setHours(0, 0, 0, 0);

  let proximoReset = new Date(dataBase);
  
  // Sempre adiciona 31 dias pelo menos uma vez
  proximoReset.setDate(proximoReset.getDate() + 31);
  
  // Se ainda estiver no passado, continua adicionando 31 dias
  while (proximoReset <= hoje) {
    proximoReset.setDate(proximoReset.getDate() + 31);
  }

  return proximoReset;
};

export const verificarEResetarCortes = async (): Promise<void> => {
  const clientes = await db.clientes.filter(cliente => cliente.ativo).toArray();
  const hoje = new Date();

  for (const cliente of clientes) {
    const proximoReset = calcularProximoReset(cliente.dataPagamento);
    const dataUltimoReset = new Date(cliente.dataUltimoReset);

    if (hoje >= proximoReset && hoje > dataUltimoReset) {
      const planoInfo = PLANOS[cliente.plano];
      await db.clientes.update(cliente.id!, {
        cortesRestantes: planoInfo.cortes,
        cortesBonus: 0,
        dataUltimoReset: hoje.toISOString()
      });
    }
  }
};
