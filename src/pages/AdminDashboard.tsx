import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LogOut, UserPlus, Users, DollarSign, Scissors, Edit, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  getAllClientes, 
  addCliente, 
  Cliente, 
  PlanoType, 
  PLANOS, 
  CLIENT_CREATION_PIN,
  registrarPagamento,
  calcularProximoReset,
  verificarEResetarCortes,
  updateCliente,
  deleteCliente,
  adicionarCorte,
  getHistoricoPagamentos,
  getHistoricoCortes,
  getClienteByCpf
} from "@/lib/database";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [pagamentosPorCliente, setPagamentosPorCliente] = useState<Record<string, any[]>>({});
  const [cortesPorCliente, setCortesPorCliente] = useState<Record<string, any[]>>({});

  // Form states
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [cpf, setCpf] = useState("");
  const [plano, setPlano] = useState<PlanoType>("COPA_BRASIL");
  const [dataPagamento, setDataPagamento] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0]; // yyyy-mm-dd
  });
  const [pin, setPin] = useState("");
  const [valorPagamento, setValorPagamento] = useState("");

  const loadClientes = async () => {
    try {
      await verificarEResetarCortes();
      const data = await getAllClientes();
      setClientes(data);
      
      // Carregar histórico de pagamentos e cortes para cada cliente
      const pagamentosMap: Record<string, any[]> = {};
      const cortesMap: Record<string, any[]> = {};
      
      for (const cliente of data) {
        const pagamentos = await getHistoricoPagamentos(cliente.id);
        const cortes = await getHistoricoCortes(cliente.id);
        pagamentosMap[cliente.id] = pagamentos;
        cortesMap[cliente.id] = cortes;
      }
      
      setPagamentosPorCliente(pagamentosMap);
      setCortesPorCliente(cortesMap);
    } catch (error) {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("adminAuthenticated");
    if (!isAdmin) {
      navigate("/admin-login");
      return;
    }
    loadClientes();

    // Configurar realtime para cortes
    const channel = supabase
      .channel('admin_cortes_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cortes_historico'
        },
        () => {
          // Recarregar dados quando um novo corte for registrado
          loadClientes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuthenticated");
    toast.success("Logout realizado");
    navigate("/");
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin !== CLIENT_CREATION_PIN) {
      toast.error("PIN inválido — somente o dono pode criar clientes.");
      return;
    }

    if (!nome || !sobrenome || !cpf || !dataPagamento) {
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

    try {
      // Verifica se já existe cliente com esse CPF
      const clienteExistente = await getClienteByCpf(cpf);
      
      if (clienteExistente) {
        toast.error("Já existe um cliente cadastrado com este CPF");
        return;
      }

      // Data já está em formato yyyy-mm-dd correto para o banco
      const valorPlano = PLANOS[plano].valor;

      const clienteId = await addCliente({
        nome,
        sobrenome,
        cpf,
        plano,
        data_pagamento: dataPagamento, // Formato yyyy-mm-dd para o banco
        pin_criacao: pin,
        cortes_restantes: PLANOS[plano].cortes,
        cortes_bonus: 0
      });

      // Registrar o primeiro pagamento com a data escolhida
      await registrarPagamento(clienteId, valorPlano, dataPagamento);
      toast.success("Cliente criado! Primeiro pagamento registrado automaticamente.");
      
      // Reset form
      setNome("");
      setSobrenome("");
      setCpf("");
      setPlano("COPA_BRASIL");
      setDataPagamento(() => {
        const hoje = new Date();
        return hoje.toISOString().split('T')[0];
      });
      setPin("");
      setDialogOpen(false);
      
      await loadClientes();
    } catch (error) {
      toast.error("Erro ao criar cliente");
    }
  };

  const handleRegistrarPagamento = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteSelecionado || !valorPagamento) {
      toast.error("Preencha o valor do pagamento");
      return;
    }

    const valor = parseFloat(valorPagamento);
    if (isNaN(valor) || valor <= 0) {
      toast.error("Valor inválido");
      return;
    }

    try{
      await registrarPagamento(clienteSelecionado.id, valor);
      toast.success("Pagamento registrado com sucesso!");
      setValorPagamento("");
      setPagamentoDialogOpen(false);
      setClienteSelecionado(null);
      await loadClientes();
    } catch (error) {
      toast.error("Erro ao registrar pagamento");
    }
  };

  const handleEditClient = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setNome(cliente.nome);
    setSobrenome(cliente.sobrenome);
    setCpf(cliente.cpf);
    setPlano(cliente.plano);
    // Converte data de dd/mm/yyyy para yyyy-mm-dd se necessário
    const dataFormatada = cliente.data_pagamento.includes('-')
      ? cliente.data_pagamento
      : (() => {
          const [dia, mes, ano] = cliente.data_pagamento.split('/').map(Number);
          return `${ano}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
        })();
    setDataPagamento(dataFormatada);
    setEditDialogOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteSelecionado) return;

    if (!nome || !sobrenome || !cpf || !dataPagamento) {
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

    try {
      // Verifica se o CPF já existe em outro cliente (se foi alterado)
      if (cpf !== clienteSelecionado.cpf) {
        const { getClienteByCpf } = await import("@/lib/database");
        const clienteExistente = await getClienteByCpf(cpf);
        
        if (clienteExistente && clienteExistente.id !== clienteSelecionado.id) {
          toast.error("Já existe outro cliente cadastrado com este CPF");
          return;
        }
      }

      // Data já está em formato yyyy-mm-dd correto para o banco

      await updateCliente(clienteSelecionado.id, {
        nome,
        sobrenome,
        cpf,
        plano,
        data_pagamento: dataPagamento
      });
      
      toast.success("Cliente atualizado com sucesso!");
      
      // Reset form
      setNome("");
      setSobrenome("");
      setCpf("");
      setPlano("COPA_BRASIL");
      setDataPagamento(() => {
        const hoje = new Date();
        return hoje.toISOString().split('T')[0]; // yyyy-mm-dd
      });
      setEditDialogOpen(false);
      setClienteSelecionado(null);
      
      await loadClientes();
    } catch (error) {
      toast.error("Erro ao atualizar cliente");
    }
  };

  const handleDeleteClient = async (cliente: Cliente) => {
    try {
      await deleteCliente(cliente.id!);
      toast.success("Cliente excluído com sucesso!");
      await loadClientes();
    } catch (error) {
      toast.error("Erro ao excluir cliente");
    }
  };

  const handleAdicionarCorte = async (cliente: Cliente) => {
    if (!cliente.id) return;
    
    try {
      await adicionarCorte(cliente.id);
      toast.success("Corte adicionado com sucesso!");
      await loadClientes();
    } catch (error) {
      toast.error("Erro ao adicionar corte");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Painel Admin</h1>
            <p className="text-muted-foreground">Gerencie seus clientes</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-2 border-border max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Criar Novo Cliente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateClient} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-nome" className="text-foreground">Nome</Label>
                    <Input
                      id="create-nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-sobrenome" className="text-foreground">Sobrenome</Label>
                    <Input
                      id="create-sobrenome"
                      value={sobrenome}
                      onChange={(e) => setSobrenome(e.target.value)}
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-cpf" className="text-foreground">CPF (5 primeiros dígitos)</Label>
                    <Input
                      id="create-cpf"
                      maxLength={5}
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-plano" className="text-foreground">Plano</Label>
                    <Select value={plano} onValueChange={(value) => setPlano(value as PlanoType)}>
                      <SelectTrigger className="bg-input border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COPA_BRASIL">
                          Copa do Brasil - R$ {PLANOS.COPA_BRASIL.valor.toFixed(2)}
                        </SelectItem>
                        <SelectItem value="UEFA_CL">
                          UEFA CL - R$ {PLANOS.UEFA_CL.valor.toFixed(2)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-data" className="text-foreground">Data do Pagamento</Label>
                    <Input
                      id="create-data"
                      type="date"
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-pin" className="text-foreground">PIN de Criação</Label>
                    <Input
                      id="create-pin"
                      type="password"
                      maxLength={5}
                      placeholder="97531"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    Criar Cliente
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="bg-card border-2 border-border max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Editar Cliente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdateClient} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-nome" className="text-foreground">Nome</Label>
                    <Input
                      id="edit-nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-sobrenome" className="text-foreground">Sobrenome</Label>
                    <Input
                      id="edit-sobrenome"
                      value={sobrenome}
                      onChange={(e) => setSobrenome(e.target.value)}
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-cpf" className="text-foreground">CPF (5 primeiros dígitos)</Label>
                    <Input
                      id="edit-cpf"
                      maxLength={5}
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-plano" className="text-foreground">Plano</Label>
                    <Select value={plano} onValueChange={(value) => setPlano(value as PlanoType)}>
                      <SelectTrigger className="bg-input border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COPA_BRASIL">
                          Copa do Brasil - R$ {PLANOS.COPA_BRASIL.valor.toFixed(2)}
                        </SelectItem>
                        <SelectItem value="UEFA_CL">
                          UEFA CL - R$ {PLANOS.UEFA_CL.valor.toFixed(2)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-data" className="text-foreground">Data do Pagamento</Label>
                    <Input
                      id="edit-data"
                      type="date"
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    Atualizar Cliente
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border-border bg-card">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold text-foreground">{clientes.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Lista de Clientes */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Clientes Ativos
          </h2>

          {clientes.length === 0 ? (
            <Card className="p-8 border-border bg-card text-center">
              <p className="text-muted-foreground">Nenhum cliente cadastrado ainda</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {clientes.map((cliente) => {
                const planoInfo = PLANOS[cliente.plano];
                const proximoReset = calcularProximoReset(cliente.data_pagamento);
                
                return (
                  <Card key={cliente.id} className="p-6 border-2 border-border bg-card hover:border-primary transition-colors">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="text-xl font-bold text-foreground">
                            {cliente.nome} {cliente.sobrenome}
                          </h3>
                          <p className="text-sm text-muted-foreground">CPF: {cliente.cpf}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditClient(cliente)}
                            className="border-primary text-foreground hover:bg-primary/10"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-2 border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  Tem certeza de que deseja excluir o cliente <strong>{cliente.nome} {cliente.sobrenome}</strong>? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-border text-foreground hover:bg-muted">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteClient(cliente)}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAdicionarCorte(cliente)}
                            className="border-primary text-foreground hover:bg-primary/10"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar Corte
                          </Button>
                          <Dialog open={pagamentoDialogOpen && clienteSelecionado?.id === cliente.id}
                                onOpenChange={(open) => {
                                  setPagamentoDialogOpen(open);
                                  if (!open) setClienteSelecionado(null);
                                }}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setClienteSelecionado(cliente)}
                              className="border-primary text-foreground hover:bg-primary/10"
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Registrar Pagamento
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-2 border-border">
                            <DialogHeader>
                              <DialogTitle className="text-foreground">Registrar Pagamento</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleRegistrarPagamento} className="space-y-4">
                              <div className="space-y-2">
                                <Label className="text-foreground">Cliente</Label>
                                <p className="text-foreground font-semibold">
                                  {cliente.nome} {cliente.sobrenome}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="valor-pag" className="text-foreground">Valor (R$)</Label>
                                <Input
                                  id="valor-pag"
                                  type="number"
                                  step="0.01"
                                  placeholder="95.00"
                                  value={valorPagamento}
                                  onChange={(e) => setValorPagamento(e.target.value)}
                                  className="bg-input border-border text-foreground"
                                />
                              </div>
                              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                                Confirmar Pagamento
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Plano</p>
                          <p className="font-semibold text-primary">{planoInfo.nome}</p>
                          <p className="text-sm text-foreground">R$ {planoInfo.valor.toFixed(2)}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Data Pagamento</p>
                          <p className="font-semibold text-foreground">{new Date(cliente.data_pagamento).toLocaleDateString('pt-BR')}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Cortes Restantes</p>
                          <p className="font-semibold text-foreground flex items-center gap-1">
                            <Scissors className="w-4 h-4 text-primary" />
                            {cliente.cortes_restantes} de {planoInfo.cortes}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">Próximo Reset</p>
                          <p className="font-semibold text-foreground">
                            {proximoReset.toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-2">Cortes Totais</p>
                          {cortesPorCliente[cliente.id]?.length > 0 ? (
                            <div className="space-y-1">
                              {cortesPorCliente[cliente.id].slice(0, 3).map((corte, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="text-foreground">{new Date(corte.data).toLocaleString('pt-BR')}</span>
                                  {corte.tipo === 'admin' && (
                                    <span className="text-primary ml-1">(Bônus)</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Nenhum corte registrado</p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-foreground mb-2">Pagamentos Totais</p>
                          {pagamentosPorCliente[cliente.id]?.length > 0 ? (
                            <div className="space-y-1">
                              {pagamentosPorCliente[cliente.id].slice(0, 3).map((pag, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="text-foreground font-medium">R$ {pag.valor.toFixed(2)}</span>
                                  <span className="text-muted-foreground"> - {new Date(pag.data).toLocaleString('pt-BR')}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Nenhum pagamento registrado</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
