-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  sobrenome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Drop existing overly permissive policies on clientes
DROP POLICY IF EXISTS "Permitir leitura de clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir inserção de clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir atualização de clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir exclusão de clientes" ON public.clientes;

-- Create secure RLS policies for clientes table
CREATE POLICY "Customers can view own cliente record"
ON public.clientes FOR SELECT
TO authenticated
USING (
  id = (SELECT cliente_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins have full access to clientes"
ON public.clientes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing policies on cortes_historico
DROP POLICY IF EXISTS "Permitir leitura de histórico de cortes" ON public.cortes_historico;
DROP POLICY IF EXISTS "Permitir inserção de cortes" ON public.cortes_historico;

-- Create secure RLS policies for cortes_historico
CREATE POLICY "Customers can view own cortes history"
ON public.cortes_historico FOR SELECT
TO authenticated
USING (
  cliente_id = (SELECT cliente_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins have full access to cortes_historico"
ON public.cortes_historico FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing policies on pagamentos_historico
DROP POLICY IF EXISTS "Permitir leitura de histórico de pagamentos" ON public.pagamentos_historico;
DROP POLICY IF EXISTS "Permitir inserção de pagamentos" ON public.pagamentos_historico;

-- Create secure RLS policies for pagamentos_historico
CREATE POLICY "Customers can view own payment history"
ON public.pagamentos_historico FOR SELECT
TO authenticated
USING (
  cliente_id = (SELECT cliente_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins have full access to pagamentos_historico"
ON public.pagamentos_historico FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for profiles table
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for user_roles table
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to update profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup (creates profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, sobrenome, cpf)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'sobrenome', ''),
    NEW.raw_user_meta_data->>'cpf'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();