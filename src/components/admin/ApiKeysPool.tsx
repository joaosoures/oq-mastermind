import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Trash2, Key, CheckCircle2, XCircle, 
  AlertTriangle, RefreshCw, Layers 
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApiKey {
  id: string;
  provider: string;
  key_value: string;
  label: string;
  is_active: boolean;
  priority: number;
  last_used_at: string | null;
  error_count: number;
  last_error: string | null;
}

export default function ApiKeysPool() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newProvider, setNewProvider] = useState("lovable_gateway");
  const [newPriority, setNewPriority] = useState("0");

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("api_keys_pool")
        .select("*")
        .order("priority", { ascending: true });
      
      if (error) throw error;
      setKeys(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar chaves:", error);
      toast.error("Erro ao carregar pool de chaves");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAddKey = async () => {
    if (!newKey || !newLabel) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const { error } = await supabase.from("api_keys_pool").insert({
        label: newLabel,
        key_value: newKey,
        provider: newProvider,
        priority: parseInt(newPriority) || 0,
      });

      if (error) throw error;
      
      toast.success("Chave adicionada com sucesso");
      setIsAdding(false);
      setNewLabel("");
      setNewKey("");
      fetchKeys();
    } catch (error: any) {
      toast.error("Erro ao adicionar chave: " + error.message);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from("api_keys_pool")
        .update({ is_active: !current, error_count: 0 })
        .eq("id", id);
      
      if (error) throw error;
      toast.success(current ? "Chave desativada" : "Chave ativada");
      fetchKeys();
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta chave?")) return;
    
    try {
      const { error } = await supabase.from("api_keys_pool").delete().eq("id", id);
      if (error) throw error;
      toast.success("Chave removida");
      fetchKeys();
    } catch (error: any) {
      toast.error("Erro ao excluir chave");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Layers size={18} className="text-primary" /> Pool de Chaves de IA
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure chaves de reserva para garantir que o app nunca fique sem IA.
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} size="sm" variant={isAdding ? "outline" : "default"}>
          {isAdding ? "Cancelar" : <><Plus size={16} className="mr-1" /> Adicionar Chave</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-4 glass border-primary/20 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Nome Identificador</label>
              <Input placeholder="Ex: OpenAI Reserva 1" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Provedor</label>
              <Select value={newProvider} onValueChange={setNewProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lovable_gateway">Lovable Gateway</SelectItem>
                  <SelectItem value="openai">OpenAI (Direto)</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Chave de API (Secret)</label>
              <Input type="password" placeholder="sk-..." value={newKey} onChange={e => setNewKey(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Prioridade (0 = Maior)</label>
              <div className="flex gap-2">
                <Input type="number" value={newPriority} onChange={e => setNewPriority(e.target.value)} />
                <Button onClick={handleAddKey}>Salvar</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-primary" /></div>
        ) : keys.length === 0 ? (
          <Card className="p-8 text-center bg-card/20 border-dashed border-border/50">
            <Key size={32} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhuma chave reserva configurada.</p>
          </Card>
        ) : (
          keys.map(key => (
            <Card key={key.id} className={`p-4 glass transition-all ${key.is_active ? 'border-border/40' : 'border-red-500/20 opacity-70'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${key.is_active ? 'bg-primary/10' : 'bg-red-500/10'}`}>
                    <Key size={20} className={key.is_active ? 'text-primary' : 'text-red-400'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{key.label}</span>
                      <Badge variant="outline" className="text-[10px]">{key.provider}</Badge>
                      <Badge variant="secondary" className="text-[10px]">Prioridade: {key.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs font-mono text-muted-foreground">••••••••{key.key_value.slice(-4)}</p>
                      {key.last_used_at && (
                        <span className="text-[10px] text-muted-foreground">Uso: {new Date(key.last_used_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {key.error_count > 0 && (
                    <div className="flex items-center gap-1 mr-4 group relative">
                      <AlertTriangle size={14} className="text-amber-500" />
                      <span className="text-xs text-amber-500 font-bold">{key.error_count} erros</span>
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-background border border-border rounded text-[10px] whitespace-nowrap z-50">
                        Último erro: {key.last_error || "Desconhecido"}
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={key.is_active ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-green-400 hover:text-green-300 hover:bg-green-500/10"}
                    onClick={() => handleToggleActive(key.id, key.is_active)}
                  >
                    {key.is_active ? <><XCircle size={14} className="mr-1" /> Desativar</> : <><CheckCircle2 size={14} className="mr-1" /> Ativar</>}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white" onClick={() => handleDeleteKey(key.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
