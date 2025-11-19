import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scissors, UserCog } from "lucide-react";
import { useEffect } from "react";
import { verificarEResetarCortes } from "@/lib/database";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar e resetar cortes ao abrir o app
    verificarEResetarCortes();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-card border-2 border-primary/20 shadow-lg flex items-center justify-center p-2">
              <img
                src="/logo.png"
                alt="7BC Barber Club Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            7BC Barber Club
          </h1>
          <p className="text-muted-foreground text-lg">
            Bem-vindo ao seu clube de barbearia
          </p>
        </div>

        <Card className="p-6 space-y-4 border-2 border-border bg-card shadow-green">
          <Button
            onClick={() => navigate("/login")}
            className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all hover:scale-[1.02]"
          >
            <Scissors className="w-5 h-5 mr-2" />
            Sou Cliente
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            onClick={() => navigate("/admin-login")}
            variant="outline"
            className="w-full h-14 text-lg font-semibold border-2 border-primary text-foreground hover:bg-primary/10 transition-all hover:scale-[1.02]"
          >
            <UserCog className="w-5 h-5 mr-2" />
            Sou Admin
          </Button>
        </Card>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p className="text-foreground font-medium">Planos disponíveis:</p>
          <p className="font-semibold text-primary">Copa do Brasil - R$ 54,90 (3 cortes)</p>
          <p className="font-semibold text-primary">UEFA Champions League - R$ 95,00 (3 cortes)</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
