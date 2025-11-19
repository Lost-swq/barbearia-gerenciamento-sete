import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getClienteByCredentials } from "@/lib/database";

const ClientLogin = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !sobrenome || !cpf) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (!/^\d{5}$/.test(cpf)) {
      toast.error("CPF deve ter exatamente 5 dígitos numéricos");
      return;
    }

    if (nome.length < 2 || sobrenome.length < 2) {
      toast.error("Nome e sobrenome devem ter pelo menos 2 caracteres");
      return;
    }

    setLoading(true);

    try {
      const cliente = await getClienteByCredentials(nome, sobrenome, cpf);

      if (!cliente) {
        toast.error("Conta não encontrada. Peça ao dono da barbearia para cadastrá-lo.");
        setLoading(false);
        return;
      }

      // Salvar no sessionStorage
      sessionStorage.setItem("clienteId", cliente.id!.toString());
      sessionStorage.setItem("clienteNome", `${cliente.nome} ${cliente.sobrenome}`);

      toast.success("Login realizado com sucesso!");
      navigate("/cliente");
    } catch (error) {
      toast.error("Erro ao fazer login. Tente novamente.");
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
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-card border-2 border-primary/20 shadow-lg flex items-center justify-center p-2">
              <img src="/logo.png" alt="7BC Barber Club Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Login Cliente</h1>
          <p className="text-muted-foreground">
            Entre com suas credenciais
          </p>
        </div>

        <Card className="p-6 border-2 border-border bg-card shadow-green">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-foreground">Nome</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Digite seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sobrenome" className="text-foreground">Sobrenome</Label>
              <Input
                id="sobrenome"
                type="text"
                placeholder="Digite seu sobrenome"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf" className="text-foreground">CPF (5 primeiros dígitos)</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="12345"
                maxLength={5}
                value={cpf}
                onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                className="bg-input border-border text-foreground"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ClientLogin;
