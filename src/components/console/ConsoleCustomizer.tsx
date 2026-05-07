import { useState, useRef, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ScrollWheel from "./ScrollWheel";
import NeonHintLamp from "./NeonHintLamp";
import TactileButton from "./TactileButton";
import { MoveHorizontal, RotateCcw, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { feedback } from "@/lib/sensory";

type ComponentType = "scroll" | "hint" | "confirm";

const COMPONENT_VARIANTS = {
  scroll: ["default", "minimal", "industrial", "classic"],
  hint: ["default", "led", "holo", "minimal"],
  confirm: ["default", "flat", "glass", "retro"],
};

export default function ConsoleCustomizer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const s = useSettings();
  const [layout, setLayout] = useState<(ComponentType | null)[]>(
    s.consoleLayout.length === 3 ? s.consoleLayout : [...s.consoleLayout, ...Array(3 - s.consoleLayout.length).fill(null)]
  );
  
  // Custom styles for each position/type
  const [styles, setStyles] = useState({
    scroll: s.scrollStyle,
    hint: s.hintStyle,
    confirm: s.confirmStyle,
  });

  const [draggedItem, setDraggedItem] = useState<{ type: ComponentType; variant: string; fromSource?: boolean; fromIndex?: number } | null>(null);

  const handleDrop = (index: number) => {
    if (!draggedItem) return;

    const newLayout = [...layout];
    
    // If dragging from another slot, clear that slot
    if (draggedItem.fromIndex !== undefined) {
      newLayout[draggedItem.fromIndex] = null;
    }

    // Check if the component already exists in the layout (and we're not just moving it)
    const existingIndex = newLayout.indexOf(draggedItem.type);
    if (existingIndex !== -1 && existingIndex !== index) {
      newLayout[existingIndex] = null;
    }

    newLayout[index] = draggedItem.type;
    
    // Update the style for this component type
    setStyles(prev => ({ ...prev, [draggedItem.type]: draggedItem.variant }));
    
    setLayout(newLayout);
    setDraggedItem(null);
    feedback("tick");
  };

  const removeComponent = (index: number) => {
    const newLayout = [...layout];
    newLayout[index] = null;
    setLayout(newLayout);
    feedback("error");
  };

  const save = () => {
    const filteredLayout = layout.filter((item): item is ComponentType => item !== null);
    s.set("consoleLayout", filteredLayout);
    s.set("scrollStyle", styles.scroll);
    s.set("hintStyle", styles.hint);
    s.set("confirmStyle", styles.confirm);
    
    // Auto-enable native scroll if no scroll wheel is present
    const hasScroll = filteredLayout.includes("scroll");
    s.set("useNativeScroll", !hasScroll);
    
    onOpenChange(false);
    feedback("success");
  };

  const renderComponent = (type: ComponentType, variant: string, isPreview = false) => {
    const size = isPreview ? (window.innerWidth < 640 ? 50 : 60) : 65;
    switch (type) {
      case "scroll":
        return <ScrollWheel size={size} label="" variant={variant} className="pointer-events-none" />;
      case "hint":
        return <NeonHintLamp used={1} onClick={() => {}} variant={variant} disabled className={cn("pointer-events-none", isPreview ? "scale-75" : "scale-90")} />;
      case "confirm":
        return <TactileButton variant="primary" styleVariant={variant} size="sm" className="pointer-events-none text-[9px] h-9 px-3">Confirmar</TactileButton>;
    }
  };

  const labels = {
    scroll: "Scroll",
    hint: "Dicas",
    confirm: "Confirmar"
  };

  // Touch Support
  const handleTouchStart = (e: React.TouchEvent, item: { type: ComponentType; variant: string; fromSource?: boolean; fromIndex?: number }) => {
    setDraggedItem(item);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] bg-[hsl(var(--background))] border-none shadow-2xl p-0 overflow-y-auto max-h-[90vh] sm:max-h-none rounded-[2rem] sm:rounded-3xl">
        <div className="p-4 md:p-8 space-y-4 md:space-y-8">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display text-xl md:text-3xl font-black tracking-tight">Personalizar Painel</DialogTitle>
            <p className="text-muted-foreground text-[10px] md:text-sm">Arraste os componentes dos estilos abaixo para os slots do console.</p>
          </DialogHeader>

          {/* Preview Area */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-widest font-black text-muted-foreground px-1">Layout do Console</h3>
            <div className="console-surface p-3 md:p-6 rounded-[2rem] flex items-center justify-between gap-2 md:gap-4 bg-[hsl(var(--background))] border border-white/10 shadow-inner min-h-[120px] md:min-h-[160px]">
              {layout.map((type, i) => (
                <div
                  key={i}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  // Touch drop simulation
                  onTouchEnd={() => draggedItem && handleDrop(i)}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-2 p-2 md:p-4 rounded-2xl transition-all duration-300 border-2 border-dashed relative group min-h-[80px]",
                    type 
                      ? "border-transparent bg-white/5 cursor-grab active:cursor-grabbing" 
                      : "border-white/10 hover:border-[hsl(var(--accent)/0.3)] hover:bg-white/5"
                  )}
                  draggable={!!type}
                  onDragStart={() => type && setDraggedItem({ type, variant: styles[type], fromIndex: i })}
                  onTouchStart={(e) => type && handleTouchStart(e, { type, variant: styles[type], fromIndex: i })}
                >
                  {type ? (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeComponent(i); }}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="relative">
                        {renderComponent(type, styles[type], true)}
                      </div>
                      <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-tighter opacity-50">{labels[type]}</span>
                    </>
                  ) : (
                    <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-tighter opacity-20">Vazio</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between px-4 md:px-8 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              <span>Esq</span>
              <span>Centro</span>
              <span>Dir</span>
            </div>
          </div>

          {/* Style Selector Grid - Draggable Source */}
          <div className="space-y-6 overflow-x-hidden">
            {(Object.keys(COMPONENT_VARIANTS) as ComponentType[]).map((type) => (
              <div key={type} className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{labels[type]} - Arraste um estilo</h4>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {COMPONENT_VARIANTS[type].map((variant) => (
                    <div
                      key={variant}
                      draggable
                      onDragStart={() => setDraggedItem({ type, variant, fromSource: true })}
                      onTouchStart={(e) => handleTouchStart(e, { type, variant, fromSource: true })}
                      className={cn(
                        "flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/5 cursor-grab active:cursor-grabbing transition-all hover:bg-white/10",
                        draggedItem?.type === type && draggedItem?.variant === variant ? "ring-2 ring-[hsl(var(--accent))]" : ""
                      )}
                    >
                      {renderComponent(type, variant)}
                      <span className="text-[8px] font-medium opacity-50 capitalize">{variant}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
            <button
              onClick={() => { setLayout(["scroll", "hint", "confirm"]); setStyles({ scroll: "default", hint: "default", confirm: "default" }); feedback("tap"); }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Restaurar
            </button>
            <button
              onClick={save}
              className="flex-1 bg-[hsl(var(--accent))] text-white px-6 py-4 rounded-2xl font-black text-sm shadow-[0_8px_24px_hsl(var(--accent)/0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Salvar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
