import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_CREDENTIALS } from "@/lib/database";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !sobrenome || !pin) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);

    // Simular delay de validação
    setTimeout(() => {
      if (
        nome.toLowerCase() === ADMIN_CREDENTIALS.nome.toLowerCase() &&
        sobrenome.toLowerCase() === ADMIN_CREDENTIALS.sobrenome.toLowerCase() &&
        pin === ADMIN_CREDENTIALS.pin
      ) {
        sessionStorage.setItem("adminAuthenticated", "true");
        toast.success("Bem-vindo, Admin!");
        navigate("/admin");
      } else {
        toast.error("Acesso negado. Use o login de administrador correto.");
      }
      setLoading(false);
    }, 500);
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
          <div className="flex justify-center mb-4">
            <ShieldCheck className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Login Admin</h1>
          <p className="text-muted-foreground">
            Acesso restrito ao administrador
          </p>
        </div>

        <Card className="p-6 border-2 border-primary bg-card shadow-green">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-nome" className="text-foreground">Nome</Label>
              <Input
                id="admin-nome"
                type="text"
                placeholder="Digite o nome do admin"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-sobrenome" className="text-foreground">Sobrenome</Label>
              <Input
                id="admin-sobrenome"
                type="text"
                placeholder="Digite o sobrenome do admin"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-pin" className="text-foreground">PIN do Admin</Label>
              <Input
                id="admin-pin"
                type="password"
                placeholder="Digite o PIN"
                maxLength={5}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="bg-input border-border text-foreground"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              {loading ? "Verificando..." : "Entrar como Admin"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
