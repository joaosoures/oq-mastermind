import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, AlertCircle, BarChart3, ShieldCheck, Search, 
  ChevronRight, ChevronDown, CheckCircle2, Clock, XCircle,
  MoreVertical, ShieldAlert, Award, Star, TrendingUp, 
  DollarSign, UserPlus, UserMinus, MessageSquare, Phone,
  Calendar, ArrowUpRight, ArrowDownRight, CreditCard
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area, Legend 
} from 'recharts';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

type Report = {
  id: string;
  tipo: string;
  descricao: string;
  status: 'pendente' | 'em_analise' | 'resolvido' | 'arquivado';
  criado_em: string;
  cards?: { comando: string };
  profiles?: { nome: string; email: string };
};

type UserAdmin = {
  id: string;
  nome: string;
  email: string;
  foto_url: string;
  criado_em: string;
  role: string;
  plano_status: string;
  plano_tipo: string;
};

export default function Admin() {
  const [stats, setStats] = useState({ users: 0, cards: 0, reports: 0, activeSubs: 0 });
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uCount, cCount, rCount, sCount, rData, uData] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("cards").select("id", { count: "exact", head: true }),
        supabase.from("reports_erro").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("assinaturas").select("id", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("reports_erro").select(`
          *,
          cards(comando),
          profiles:usuario_id(nome, email)
        `).order("criado_em", { ascending: false }).limit(50),
        supabase.from("admin_users_view").select("*")
      ]);

      setStats({ 
        users: uCount.count ?? 0, 
        cards: cCount.count ?? 0, 
        reports: rCount.count ?? 0,
        activeSubs: sCount.count ?? 0
      });
      setReports(rData.data as any[] ?? []);
      setUsers(uData.data as UserAdmin[] ?? []);
    } catch (error) {
      console.error("Erro ao carregar dados admin:", error);
      toast.error("Erro ao carregar dados do painel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Painel do Administrador — OQ Falta?";
    fetchData();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: newRole as any }, { onConflict: 'user_id' });
    
    if (error) {
      toast.error("Erro ao atualizar função");
    } else {
      toast.success("Função atualizada com sucesso");
      fetchData();
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: string) => {
    const { error } = await supabase
      .from("reports_erro")
      .update({ status: status as any })
      .eq("id", reportId);
    
    if (error) {
      toast.error("Erro ao atualizar report");
    } else {
      toast.success("Status do report atualizado");
      fetchData();
    }
  };

  const filteredUsers = users.filter(u => 
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1"><ShieldAlert size={12}/> Admin</Badge>;
      case 'editor': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1">Editor</Badge>;
      case 'estudante_ouro': return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 gap-1"><Award size={12}/> Ouro</Badge>;
      case 'estudante_prata': return <Badge className="bg-slate-300/20 text-slate-300 border-slate-300/30 gap-1"><Star size={12}/> Prata</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">Bronze</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock className="text-yellow-500" size={16} />;
      case 'em_analise': return <Search className="text-blue-500" size={16} />;
      case 'resolvido': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'arquivado': return <XCircle className="text-muted-foreground" size={16} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Painel do Administrador
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerenciamento centralizado de usuários, permissões e reports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="glass">
            <Clock className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Usuários Totais", value: stats.users, icon: Users, color: "text-blue-400" },
          { label: "OQs no Banco", value: stats.cards, icon: BarChart3, color: "text-purple-400" },
          { label: "Reports Pendentes", value: stats.reports, icon: AlertCircle, color: "text-red-400" },
          { label: "Planos Ativos", value: stats.activeSubs, icon: ShieldCheck, color: "text-green-400" },
        ].map((item, i) => (
          <Card key={i} className="p-6 bg-card/40 border-border/50 backdrop-blur-md group hover:border-primary/30 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                <p className="text-3xl font-bold neon-text">{item.value}</p>
              </div>
              <div className={`p-2 rounded-xl bg-background/50 border border-border/50 ${item.color}`}>
                <item.icon size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-muted/30 border border-border/50 p-1 mb-6">
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary/20">
            <Users size={16} /> Usuários
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-primary/20">
            <AlertCircle size={16} /> Reports {stats.reports > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 flex items-center justify-center text-[10px]">{stats.reports}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2 data-[state=active]:bg-primary/20">
            <ShieldCheck size={16} /> Permissões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder="Buscar por nome ou e-mail..." 
                className="pl-10 glass focus:ring-primary/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Nenhum usuário encontrado.</p>
            ) : (
              filteredUsers.map((u) => (
                <Collapsible key={u.id} className="group">
                  <Card className="overflow-hidden bg-card/30 border-border/40 hover:border-primary/20 transition-all">
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                          {u.foto_url ? <img src={u.foto_url} alt="" className="w-full h-full object-cover" /> : <Users className="text-primary/40" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{u.nome || "Usuário sem nome"}</h3>
                            {getRoleBadge(u.role)}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Status Plano</p>
                          <Badge variant={u.plano_status === 'ativo' ? 'default' : 'secondary'} className={u.plano_status === 'ativo' ? 'bg-green-500/20 text-green-400' : ''}>
                            {u.plano_status || 'sem plano'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass">
                              <DropdownMenuItem onClick={() => handleUpdateRole(u.id, 'admin')}>Tornar Admin</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateRole(u.id, 'editor')}>Tornar Editor</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateRole(u.id, 'estudante_ouro')}>Plano Ouro</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateRole(u.id, 'estudante_bronze')}>Resetar p/ Bronze</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronDown className="group-data-[state=open]:rotate-180 transition-transform" size={16} />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="p-6 pt-0 border-t border-border/20 bg-muted/5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-6">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Estatísticas de Estudo</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total de Revisões</span>
                                <span className="font-mono font-bold">1,240</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Taxa de Acerto</span>
                                <span className="text-green-400 font-bold">84%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">OQs Criados</span>
                                <span className="font-mono">12</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Informações da Conta</h4>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Membro desde</span>
                                <span>{new Date(u.criado_em).toLocaleDateString("pt-BR")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Plano atual</span>
                                <span className="capitalize">{u.plano_tipo || 'Grátis'}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Ações Avançadas</h4>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="text-[10px] h-7">Ver Logs</Button>
                              <Button size="sm" variant="outline" className="text-[10px] h-7">Resetar Senha</Button>
                              <Button size="sm" variant="destructive" className="text-[10px] h-7 opacity-50 hover:opacity-100">Banir Usuário</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="bg-card/40 border-border/50">
            <div className="p-4 border-b border-border/50 flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2">
                <AlertCircle className="text-red-400" size={18} /> Reports Recentes
              </h2>
              <Badge variant="outline">{reports.length} reports</Badge>
            </div>
            <ScrollArea className="h-[600px]">
              {reports.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Nenhum report encontrado.</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {reports.map((r) => (
                    <div key={r.id} className="p-4 hover:bg-primary/5 transition-colors group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
                              {r.tipo.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock size={10} /> {new Date(r.criado_em).toLocaleDateString("pt-BR")} {new Date(r.criado_em).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm font-medium mt-1">"{r.descricao}"</p>
                          {r.cards && (
                            <div className="mt-2 p-2 bg-muted/40 rounded border border-border/30 text-xs">
                              <span className="text-primary font-bold">CARD:</span> {r.cards.comando}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                             <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                               {r.profiles?.nome?.[0] || 'U'}
                             </div>
                             <span className="text-[10px] text-muted-foreground">{r.profiles?.nome || r.profiles?.email || "Usuário anônimo"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2">
                                {getStatusIcon(r.status)}
                                <span className="capitalize">{r.status.replace('_', ' ')}</span>
                                <ChevronDown size={12} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass">
                              <DropdownMenuItem onClick={() => handleUpdateReportStatus(r.id, 'pendente')}>Pendente</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateReportStatus(r.id, 'em_analise')}>Em Análise</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateReportStatus(r.id, 'resolvido')}>Resolvido</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateReportStatus(r.id, 'arquivado')}>Arquivado</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary hover:underline">Ir para Card</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 bg-card/40 border-border/50">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
                <ShieldCheck className="text-primary" /> Matriz de Acesso
              </h2>
              <div className="space-y-4">
                {[
                  { label: "Estudante Ouro", desc: "Acesso total a materiais, áudios e geradores IA ilimitados.", active: true },
                  { label: "Estudante Prata", desc: "Acesso total a materiais, limite diário de IA.", active: true },
                  { label: "Estudante Bronze", desc: "Acesso a materiais básicos e banco de OQs.", active: true },
                  { label: "Admin/Editor", desc: "Acesso administrativo total ao sistema.", active: true },
                ].map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/30">
                    <div className="max-w-[80%]">
                      <p className="text-sm font-bold">{p.label}</p>
                      <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                    </div>
                    <Switch checked={p.active} disabled />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-card/40 border-border/50">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
                <ShieldAlert className="text-red-400" /> Logs de Segurança
              </h2>
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground italic">Integração com logs de auditoria em desenvolvimento.</p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

