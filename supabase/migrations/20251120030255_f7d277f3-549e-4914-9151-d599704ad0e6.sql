-- Remover a constraint UNIQUE global do CPF
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_cpf_key;

-- Criar índice único parcial apenas para clientes ativos
CREATE UNIQUE INDEX IF NOT EXISTS clientes_cpf_ativo_unique 
ON public.clientes(cpf) 
WHERE ativo = true;