-- Drop all permissive policies on clientes
DROP POLICY IF EXISTS "Permitir leitura de clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir inserção de clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir atualização de clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir exclusão de clientes" ON public.clientes;

-- Drop all permissive policies on cortes_historico
DROP POLICY IF EXISTS "Permitir leitura de cortes" ON public.cortes_historico;
DROP POLICY IF EXISTS "Permitir inserção de cortes" ON public.cortes_historico;
DROP POLICY IF EXISTS "Permitir atualização de cortes" ON public.cortes_historico;
DROP POLICY IF EXISTS "Permitir exclusão de cortes" ON public.cortes_historico;

-- Drop all permissive policies on pagamentos_historico
DROP POLICY IF EXISTS "Permitir leitura de pagamentos" ON public.pagamentos_historico;
DROP POLICY IF EXISTS "Permitir inserção de pagamentos" ON public.pagamentos_historico;
DROP POLICY IF EXISTS "Permitir atualização de pagamentos" ON public.pagamentos_historico;
DROP POLICY IF EXISTS "Permitir exclusão de pagamentos" ON public.pagamentos_historico;

-- No new permissive policies needed: the edge function uses the service_role key
-- which bypasses RLS entirely. The anon key can no longer read/write these tables.