import { useState } from "react";
import { Heart, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FavoritoBtn({ cardId, isFav, onToggle }: { cardId: string; isFav: boolean; onToggle: (b: boolean) => void }) {
  const { user } = useAuth();
  async function toggle() {
    if (!user) return;
    if (isFav) {
      await supabase.from("favoritos").delete().eq("usuario_id", user.id).eq("card_id", cardId);
      onToggle(false);
    } else {
      await supabase.from("favoritos").insert({ usuario_id: user.id, card_id: cardId });
      onToggle(true);
    }
  }
  return (
    <Button variant="ghost" size="icon" onClick={toggle} title="Favoritar">
      <Heart className={cn("h-5 w-5", isFav && "fill-primary text-primary")} />
    </Button>
  );
}

export function ReportBtn({ cardId }: { cardId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("conteudo_incorreto");
  const [comentario, setComentario] = useState("");

  async function enviar() {
    if (!user) return;
    const { error } = await supabase.from("reports_erro").insert({
      usuario_id: user.id, card_id: cardId, tipo: tipo as any,
      comentario: comentario.trim() || null,
    });
    if (error) { toast.error("Erro ao enviar"); return; }
    toast.success("Obrigado pelo report!");
    setOpen(false); setComentario("");
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Reportar erro">
        <Flag className="h-4 w-4 text-muted-foreground" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reportar erro neste OQ</DialogTitle></DialogHeader>
          <RadioGroup value={tipo} onValueChange={setTipo} className="space-y-2">
            {[
              ["conteudo_incorreto", "Conteúdo incorreto"],
              ["erro_digitacao", "Erro de digitação"],
              ["ambiguidade", "Ambiguidade"],
              ["outro", "Outro"],
            ].map(([v, l]) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem id={v} value={v} />
                <Label htmlFor={v}>{l}</Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea
            placeholder="Comentário (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={enviar}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
