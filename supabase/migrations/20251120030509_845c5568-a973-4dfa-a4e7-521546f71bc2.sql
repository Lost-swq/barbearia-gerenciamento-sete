-- Remover políticas atuais que exigem autenticação
DROP POLICY IF EXISTS "Admins have full access to clientes" ON public.clientes;
DROP POLICY IF EXISTS "Customers can view own cliente record" ON public.clientes;

-- Criar políticas que permitem operações para usuários anônimos
CREATE POLICY "Permitir leitura de clientes" 
ON public.clientes 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de clientes" 
ON public.clientes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de clientes" 
ON public.clientes 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir exclusão de clientes" 
ON public.clientes 
FOR DELETE 
USING (true);