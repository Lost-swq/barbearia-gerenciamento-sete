-- Remover a constraint única antiga do CPF
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_cpf_key;

-- Adicionar uma constraint única parcial que só se aplica a clientes ativos
-- Isso permite que CPFs sejam reutilizados quando o cliente anterior estiver inativo
CREATE UNIQUE INDEX clientes_cpf_ativo_unique ON clientes(cpf) WHERE ativo = true;