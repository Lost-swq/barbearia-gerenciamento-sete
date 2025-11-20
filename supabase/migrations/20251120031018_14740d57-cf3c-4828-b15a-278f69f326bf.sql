-- Ajustar políticas de pagamentos_historico
DROP POLICY IF EXISTS "Admins have full access to pagamentos_historico" ON public.pagamentos_historico;
DROP POLICY IF EXISTS "Customers can view own payment history" ON public.pagamentos_historico;

CREATE POLICY "Permitir leitura de pagamentos" 
ON public.pagamentos_historico 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de pagamentos" 
ON public.pagamentos_historico 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de pagamentos" 
ON public.pagamentos_historico 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir exclusão de pagamentos" 
ON public.pagamentos_historico 
FOR DELETE 
USING (true);

-- Ajustar políticas de cortes_historico
DROP POLICY IF EXISTS "Admins have full access to cortes_historico" ON public.cortes_historico;
DROP POLICY IF EXISTS "Customers can view own cortes history" ON public.cortes_historico;

CREATE POLICY "Permitir leitura de cortes" 
ON public.cortes_historico 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de cortes" 
ON public.cortes_historico 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de cortes" 
ON public.cortes_historico 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir exclusão de cortes" 
ON public.cortes_historico 
FOR DELETE 
USING (true);