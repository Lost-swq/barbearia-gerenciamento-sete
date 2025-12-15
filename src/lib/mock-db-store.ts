import { Cliente, CorteHistorico, PagamentoHistorico, PLANOS } from "./database";

// Seed Data
const MOCK_CLIENTES: Cliente[] = [
    {
        id: "1",
        nome: "Cliente",
        sobrenome: "Teste",
        cpf: "12345",
        plano: "COPA_BRASIL",
        data_pagamento: new Date().toISOString().split("T")[0],
        pin_criacao: "97531",
        cortes_restantes: 3,
        cortes_bonus: 0,
        data_ultimo_reset: null,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "2",
        nome: "João",
        sobrenome: "Silva",
        cpf: "67890",
        plano: "UEFA_CL",
        data_pagamento: new Date().toISOString().split("T")[0],
        pin_criacao: "97531",
        cortes_restantes: 1,
        cortes_bonus: 0,
        data_ultimo_reset: null,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
];

const MOCK_PAGAMENTOS: PagamentoHistorico[] = [
    {
        id: "1",
        cliente_id: "1",
        valor: 54.90,
        data: new Date().toISOString(),
        confirmacao: "ABC123",
        created_at: new Date().toISOString()
    }
];

const MOCK_CORTES: CorteHistorico[] = [];

class MockDBStore {
    clientes = [...MOCK_CLIENTES];
    pagamentos_historico = [...MOCK_PAGAMENTOS];
    cortes_historico = [...MOCK_CORTES];

    constructor() {
        console.log("MockDBStore initialized with seed data");
    }

    getTable(tableName: string): any[] {
        if (tableName === 'clientes') return this.clientes;
        if (tableName === 'pagamentos_historico') return this.pagamentos_historico;
        if (tableName === 'cortes_historico') return this.cortes_historico;
        return [];
    }

    insert(tableName: string, data: any) {
        const table = this.getTable(tableName);
        const newItem = {
            ...data,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
        };
        table.push(newItem);
        return newItem;
    }

    update(tableName: string, id: string, updates: any) {
        const table = this.getTable(tableName);
        const index = table.findIndex(item => item.id === id);
        if (index !== -1) {
            table[index] = { ...table[index], ...updates, updated_at: new Date().toISOString() };
            return table[index];
        }
        return null;
    }

    delete(tableName: string, id: string) {
        const table = this.getTable(tableName);
        const index = table.findIndex(item => item.id === id);
        if (index !== -1) {
            table.splice(index, 1);
            return true;
        }
        return false;
    }
}

export const mockDB = new MockDBStore();
