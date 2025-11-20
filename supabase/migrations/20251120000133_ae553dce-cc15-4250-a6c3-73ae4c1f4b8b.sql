-- Criar enum para tipos de plano
CREATE TYPE public.plano_type AS ENUM ('COPA_BRASIL', 'UEFA_CL');

-- Criar tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  sobrenome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  plano plano_type NOT NULL,
  data_pagamento DATE NOT NULL,
  pin_criacao TEXT NOT NULL,
  cortes_restantes INTEGER NOT NULL DEFAULT 3,
  cortes_bonus INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_ultimo_reset DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_clientes_cpf ON public.clientes(cpf) WHERE ativo = true;
CREATE INDEX idx_clientes_ativo ON public.clientes(ativo);

-- Criar tabela de histórico de cortes
CREATE TABLE public.cortes_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tipo TEXT CHECK (tipo IN ('normal', 'admin')) DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_cortes_cliente ON public.cortes_historico(cliente_id);
CREATE INDEX idx_cortes_data ON public.cortes_historico(data);

-- Criar tabela de histórico de pagamentos
CREATE TABLE public.pagamentos_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  valor DECIMAL(10, 2) NOT NULL,
  data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmacao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagamentos_cliente ON public.pagamentos_historico(cliente_id);
CREATE INDEX idx_pagamentos_data ON public.pagamentos_historico(data);

-- Habilitar RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cortes_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_historico ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Permitir leitura pública (qualquer pessoa pode visualizar)
CREATE POLICY "Permitir leitura de clientes" 
ON public.clientes 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir leitura de histórico de cortes" 
ON public.cortes_historico 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir leitura de histórico de pagamentos" 
ON public.pagamentos_historico 
FOR SELECT 
USING (true);

-- Políticas RLS - Permitir inserção/atualização/exclusão pública (admin faz via app)
CREATE POLICY "Permitir inserção de clientes" 
ON public.clientes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de clientes" 
ON public.clientes 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de clientes" 
ON public.clientes 
FOR DELETE 
USING (true);

CREATE POLICY "Permitir inserção de cortes" 
ON public.cortes_historico 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir inserção de pagamentos" 
ON public.pagamentos_historico 
FOR INSERT 
WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();