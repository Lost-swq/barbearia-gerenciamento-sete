-- Drop the handle_admin_user trigger that allows privilege escalation
-- via user-controlled signup metadata (is_admin in raw_user_meta_data)
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
DROP FUNCTION IF EXISTS public.handle_admin_user();