import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminSignupSchema, clientSignupSchema, loginSchema } from "@/lib/validations";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Admin signup state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminNome, setAdminNome] = useState("");
  const [adminSobrenome, setAdminSobrenome] = useState("");

  // Client signup state
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [clientNome, setClientNome] = useState("");
  const [clientSobrenome, setClientSobrenome] = useState("");
  const [clientCpf, setClientCpf] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (error: any) {
      toast.error(error.errors[0]?.message || "Dados inválidos");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      toast.success("Login realizado com sucesso!");
      
      // Check if admin and redirect accordingly
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("role", "admin")
        .maybeSingle();

      if (roleData) {
        navigate("/admin");
      } else {
        navigate("/cliente");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      adminSignupSchema.parse({
        email: adminEmail,
        password: adminPassword,
        nome: adminNome,
        sobrenome: adminSobrenome,
      });
    } catch (error: any) {
      toast.error(error.errors[0]?.message || "Dados inválidos");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nome: adminNome,
            sobrenome: adminSobrenome,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Erro ao criar usuário");

      // Assign admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: data.user.id,
          role: "admin",
        });

      if (roleError) throw roleError;

      toast.success("Admin criado com sucesso! Faça login.");
      setAdminEmail("");
      setAdminPassword("");
      setAdminNome("");
      setAdminSobrenome("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar admin");
    } finally {
      setLoading(false);
    }
  };

  const handleClientSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      clientSignupSchema.parse({
        email: clientEmail,
        password: clientPassword,
        nome: clientNome,
        sobrenome: clientSobrenome,
        cpf: clientCpf,
      });
    } catch (error: any) {
      toast.error(error.errors[0]?.message || "Dados inválidos");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: clientEmail,
        password: clientPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nome: clientNome,
            sobrenome: clientSobrenome,
            cpf: clientCpf,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Erro ao criar usuário");

      // Assign customer role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: data.user.id,
          role: "customer",
        });

      if (roleError) throw roleError;

      toast.success("Conta criada com sucesso! Faça login.");
      setClientEmail("");
      setClientPassword("");
      setClientNome("");
      setClientSobrenome("");
      setClientCpf("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-foreground hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Autenticação</h1>
          <p className="text-muted-foreground">
            Entre ou crie sua conta
          </p>
        </div>

        <Card className="p-6 border-2 border-border bg-card shadow-green">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup-admin">Admin</TabsTrigger>
              <TabsTrigger value="signup-client">Cliente</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup-admin" className="space-y-4">
              <form onSubmit={handleAdminSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@email.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Senha</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-nome">Nome</Label>
                  <Input
                    id="admin-nome"
                    type="text"
                    placeholder="Nome"
                    value={adminNome}
                    onChange={(e) => setAdminNome(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-sobrenome">Sobrenome</Label>
                  <Input
                    id="admin-sobrenome"
                    type="text"
                    placeholder="Sobrenome"
                    value={adminSobrenome}
                    onChange={(e) => setAdminSobrenome(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Criando..." : "Criar Admin"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup-client" className="space-y-4">
              <form onSubmit={handleClientSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-password">Senha</Label>
                  <Input
                    id="client-password"
                    type="password"
                    placeholder="••••••••"
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-nome">Nome</Label>
                  <Input
                    id="client-nome"
                    type="text"
                    placeholder="Nome"
                    value={clientNome}
                    onChange={(e) => setClientNome(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-sobrenome">Sobrenome</Label>
                  <Input
                    id="client-sobrenome"
                    type="text"
                    placeholder="Sobrenome"
                    value={clientSobrenome}
                    onChange={(e) => setClientSobrenome(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-cpf">CPF (5 primeiros dígitos)</Label>
                  <Input
                    id="client-cpf"
                    type="text"
                    placeholder="12345"
                    maxLength={5}
                    value={clientCpf}
                    onChange={(e) => setClientCpf(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Criando..." : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;