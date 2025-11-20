import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LogOut, Scissors, Calendar, History, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Cliente, registrarCorte, calcularProximoReset, PLANOS, verificarEResetarCortes, getClienteById, getHistoricoCortes, getHistoricoPagamentos } from "@/lib/database";

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [corteTimer, setCorteTimer] = useState(false);
  const [showTimerAlert, setShowTimerAlert] = useState(false);
  const [historicoCortes, setHistoricoCortes] = useState<any[]>([]);
  const [historicoPagamentos, setHistoricoPagamentos] = useState<any[]>([]);

  const loadCliente = async () => {
    const clienteId = sessionStorage.getItem("clienteId");

    if (!clienteId) {
      navigate("/login");
      return;
    }

    try {
      await verificarEResetarCortes();
      const clienteData = await getClienteById(clienteId);

      if (!clienteData) {
        toast.error("Cliente não encontrado");
        navigate("/login");
        return;
      }

      setCliente(clienteData);
      
      // Carregar históricos
      const cortes = await getHistoricoCortes(clienteId);
      const pagamentos = await getHistoricoPagamentos(clienteId);
      setHistoricoCortes(cortes);
      setHistoricoPagamentos(pagamentos);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCliente();
  }, [navigate]);

  useEffect(() => {
    if (corteTimer) {
      const timer = setTimeout(() => {
        setCorteTimer(false);
      }, 60000); // 1 minuto

      return () => clearTimeout(timer);
    }
  }, [corteTimer]);

  const handleLogout = () => {
    sessionStorage.removeItem("clienteId");
    sessionStorage.removeItem("clienteNome");
    toast.success("Logout realizado");
    navigate("/");
  };

  const handleRegistrarCorte = async () => {
    if (!cliente) return;

    if (corteTimer) {
      setShowTimerAlert(true);
      setTimeout(() => setShowTimerAlert(false), 3000);
      return;
    }

    // Verifica se há pelo menos um pagamento registrado no mês atual
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const temPagamentoMesAtual = historicoPagamentos.some(pagamento => {
      const dataPag = new Date(pagamento.data);
      return dataPag.getMonth() === mesAtual && dataPag.getFullYear() === anoAtual;
    });

    if (!temPagamentoMesAtual) {
      toast.error("Você precisa ter um pagamento registrado no mês atual para registrar cortes.");
      return;
    }

    if (cliente.cortes_restantes <= 0) {
      const proximoReset = calcularProximoReset(cliente.data_pagamento);
      toast.error(`Sem cortes disponíveis. Próximo reset em ${proximoReset.toLocaleDateString('pt-BR')}`);
      return;
    }

    try {
      await registrarCorte(cliente.id);
      toast.success("Corte registrado com sucesso!");
      setCorteTimer(true);
      await loadCliente();
    } catch (error) {
      toast.error("Erro ao registrar corte");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  if (!cliente) return null;

  const planoInfo = PLANOS[cliente.plano];
  const proximoReset = calcularProximoReset(cliente.data_pagamento);
  const cortesTotais = planoInfo.cortes;

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Olá, {cliente.nome}!
            </h1>
            <p className="text-muted-foreground">Seu painel de controle</p>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-foreground hover:text-destructive"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Plano Card */}
        <Card className="p-6 border-2 border-primary bg-card shadow-green">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Seu Plano</p>
                <h2 className="text-2xl font-bold text-primary">{planoInfo.nome}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {planoInfo.valor.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="h-px bg-border"></div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-foreground">Cortes Restantes</p>
                <p className="text-3xl font-bold text-primary">
                  {cliente.cortes_restantes} <span className="text-lg text-muted-foreground">de {cortesTotais}</span>
                </p>
              </div>

              <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(cliente.cortes_restantes / cortesTotais) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </Card>

        {/* Mensagem de Timer Ativo */}
        {showTimerAlert && (
          <Alert variant="destructive">
            <AlertDescription>
              Você precisa esperar 1 minuto entre cada registro de corte.
            </AlertDescription>
          </Alert>
        )}

        {/* Botão Registrar Corte */}
        <Button
          onClick={handleRegistrarCorte}
          disabled={cliente.cortes_restantes <= 0 || corteTimer}
          className="w-full h-16 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Scissors className="w-5 h-5 mr-2" />
          {corteTimer ? "Aguarde..." : "Registrar Corte"}
        </Button>

        {/* Próximo Reset */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Próximo Reset</p>
              <p className="text-foreground font-semibold">
                {proximoReset.toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </Card>

        {/* Histórico de Cortes */}
        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Histórico de Cortes</h3>
          </div>

          {historicoCortes.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum corte registrado ainda</p>
          ) : (
            <div className="space-y-2">
              {historicoCortes.slice(0, 10).map((corte, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{new Date(corte.data).toLocaleString('pt-BR')}</span>
                    {corte.tipo === 'admin' && (
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
                        Bônus
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Histórico de Pagamentos */}
        <Card className="p-6 border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Histórico de Pagamentos</h3>
          </div>

          {historicoPagamentos.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum pagamento registrado ainda</p>
          ) : (
            <div className="space-y-2">
              {historicoPagamentos.slice(0, 10).map((pagamento, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <p className="text-foreground font-semibold">
                    R$ {pagamento.valor.toFixed(2)}
                  </p>
                  <p className="text-foreground text-sm">
                    {new Date(pagamento.data).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
