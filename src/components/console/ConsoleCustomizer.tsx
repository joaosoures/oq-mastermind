import { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ScrollWheel from "./ScrollWheel";
import NeonHintLamp from "./NeonHintLamp";
import TactileButton from "./TactileButton";
import { MoveHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { feedback } from "@/lib/sensory";

type ComponentType = "scroll" | "hint" | "confirm";

export default function ConsoleCustomizer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const s = useSettings();
  const [layout, setLayout] = useState<ComponentType[]>(s.consoleLayout);
  const [draggedItem, setDraggedItem] = useState<ComponentType | null>(null);

  const handleDrop = (index: number) => {
    if (draggedItem === null) return;
    const newLayout = [...layout];
    const currentIndex = newLayout.indexOf(draggedItem);
    
    // Swap items
    const temp = newLayout[index];
    newLayout[index] = draggedItem;
    if (currentIndex !== -1) {
      newLayout[currentIndex] = temp;
    }
    
    setLayout(newLayout);
    setDraggedItem(null);
    feedback("tick");
  };

  const save = () => {
    s.set("consoleLayout", layout);
    onOpenChange(false);
    feedback("success");
  };

  const renderComponent = (type: ComponentType, isPreview = false) => {
    switch (type) {
      case "scroll":
        return <ScrollWheel size={isPreview ? 60 : 70} label="" color="blue" className="pointer-events-none" />;
      case "hint":
        return <NeonHintLamp used={1} onClick={() => {}} disabled className="pointer-events-none scale-75" />;
      case "confirm":
        return <TactileButton variant="primary" size="sm" className="pointer-events-none text-[10px] h-10 px-4">Confirmar</TactileButton>;
    }
  };

  const labels = {
    scroll: "Navegação",
    hint: "Dicas/Pistas",
    confirm: "Confirmação"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[hsl(var(--background))] border-none shadow-2xl p-0 overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-black tracking-tight">Personalizar Painel</DialogTitle>
            <p className="text-muted-foreground text-sm">Arraste os ícones para mudar a posição ou selecione o estilo visual.</p>
          </DialogHeader>

          {/* Preview Area */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-widest font-black text-muted-foreground px-1">Layout do Console</h3>
            <div className="console-surface p-6 rounded-[2.5rem] flex items-center justify-between gap-4 bg-[hsl(var(--background))] border border-white/10 shadow-inner">
              {layout.map((type, i) => (
                <div
                  key={`${type}-${i}`}
                  draggable
                  onDragStart={() => setDraggedItem(type)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-3xl transition-all duration-300 border-2 border-transparent cursor-grab active:cursor-grabbing",
                    draggedItem === type ? "opacity-30 scale-90" : "hover:border-[hsl(var(--accent)/0.3)] hover:bg-white/5"
                  )}
                >
                  <div className="relative group">
                    <MoveHorizontal className="absolute -top-6 left-1/2 -translate-x-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    {renderComponent(type, true)}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">{labels[type]}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between px-8 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              <span>Esquerda</span>
              <span>Centro</span>
              <span>Direita</span>
            </div>
          </div>

          {/* Styles Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estilo Scroll</label>
              <select 
                value={s.scrollStyle}
                onChange={(e) => s.set("scrollStyle", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm font-bold focus:ring-2 focus:ring-[hsl(var(--accent))]"
              >
                <option value="default">Padrão OQ</option>
                <option value="minimal">Minimalista</option>
                <option value="industrial">Industrial Heavy</option>
                <option value="classic">Clássico Click</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estilo Pistas</label>
              <select 
                value={s.hintStyle}
                onChange={(e) => s.set("hintStyle", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm font-bold focus:ring-2 focus:ring-[hsl(var(--accent))]"
              >
                <option value="default">Lâmpada Neon</option>
                <option value="led">LED Matrix</option>
                <option value="holo">Holograma</option>
                <option value="minimal">Ponto Zen</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estilo Botão</label>
              <select 
                value={s.confirmStyle}
                onChange={(e) => s.set("confirmStyle", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm font-bold focus:ring-2 focus:ring-[hsl(var(--accent))]"
              >
                <option value="default">Tátil Premium</option>
                <option value="flat">Flat Modern</option>
                <option value="glass">Glass Morph</option>
                <option value="retro">Retro Arcade</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
            <button
              onClick={() => { setLayout(["scroll", "hint", "confirm"]); feedback("tap"); }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Restaurar Padrão
            </button>
            <button
              onClick={save}
              className="flex-1 bg-[hsl(var(--accent))] text-white px-6 py-4 rounded-2xl font-black text-sm shadow-[0_8px_24px_hsl(var(--accent)/0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
