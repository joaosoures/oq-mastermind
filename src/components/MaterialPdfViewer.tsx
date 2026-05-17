import { useEffect, useRef, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ZoomIn, ZoomOut, Highlighter, Trash2, Eraser, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Configura worker do PDF.js via CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface HighlightRect {
  x: number; // %
  y: number; // %
  w: number; // %
  h: number; // %
}

interface Highlight {
  id: string;
  page_number: number;
  highlighted_text: string;
  color: string;
  position: { rects: HighlightRect[] };
}

interface MaterialPdfViewerProps {
  fileUrl: string;
  materialId: string;
  fallbackUrl?: string;
}

export default function MaterialPdfViewer({ fileUrl, materialId, fallbackUrl }: MaterialPdfViewerProps) {
  const { user } = useAuth();
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.2);
  const [isMobile, setIsMobile] = useState(false);
  const [tool, setTool] = useState<"none" | "highlight" | "eraser">("none");
  const [highlightColor, setHighlightColor] = useState<"yellow" | "green" | "pink">("yellow");
  const [showColorMenu, setShowColorMenu] = useState(false);
  const undoStackRef = useRef<string[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFileUrl, setActiveFileUrl] = useState(fileUrl);
  const [triedFallback, setTriedFallback] = useState(false);
  const [selectionTip, setSelectionTip] = useState<{
    x: number;
    y: number;
    pageNumber: number;
    text: string;
    rects: HighlightRect[];
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    setActiveFileUrl(fileUrl);
    setTriedFallback(false);
    setError(false);
    setLoading(true);
    setNumPages(0);
  }, [fileUrl]);

  const handleLoadError = useCallback((e: unknown) => {
    console.error("PDF load error:", e);
    if (fallbackUrl && !triedFallback) {
      setTriedFallback(true);
      setActiveFileUrl(fallbackUrl);
      setLoading(true);
      toast.warning("Tentando abrir o PDF por um caminho alternativo...");
      return;
    }
    setError(true);
    setLoading(false);
  }, [fallbackUrl, triedFallback]);

  // Medir container e detectar mobile
  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setContainerWidth(width);
        const mobile = width < 768;
        setIsMobile(mobile);
        
        // Se for mobile e escala for 1, aumentamos um pouco para facilitar a leitura inicial
        setScale(s => (s === 1 && mobile) ? 1.4 : s);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Carregar marcações existentes
  const loadHighlights = useCallback(async () => {
    if (!user || !materialId) return;
    const { data, error: err } = await supabase
      .from("material_highlights")
      .select("*")
      .eq("user_id", user.id)
      .eq("material_id", materialId);
    if (err) {
      console.error("Erro ao carregar marcações:", err);
      return;
    }
    setHighlights((data as any) || []);
  }, [user, materialId]);

  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  // Detecta seleção de texto
  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelectionTip(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text) {
        setSelectionTip(null);
        return;
      }

      // Descobre em qual página está a seleção
      const range = sel.getRangeAt(0);
      const node = range.startContainer.parentElement;
      const pageEl = node?.closest("[data-pdf-page]") as HTMLElement | null;
      if (!pageEl) return;
      const pageNumber = parseInt(pageEl.dataset.pdfPage || "0", 10);
      if (!pageNumber) return;

      const pageRect = pageEl.getBoundingClientRect();
      const clientRects = Array.from(range.getClientRects());
      if (clientRects.length === 0) return;

      // Normaliza posições como % da página
      const rects: HighlightRect[] = clientRects.map((r) => ({
        x: ((r.left - pageRect.left) / pageRect.width) * 100,
        y: ((r.top - pageRect.top) / pageRect.height) * 100,
        w: (r.width / pageRect.width) * 100,
        h: (r.height / pageRect.height) * 100,
      }));

      // Posição do tooltip
      const last = clientRects[clientRects.length - 1];
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setSelectionTip({
        x: last.left + last.width / 2 - containerRect.left,
        y: last.bottom - containerRect.top + 8,
        pageNumber,
        text,
        rects,
      });
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, []);

  const saveHighlight = async (color: string = "yellow") => {
    if (!selectionTip || !user) return;
    const { data, error: err } = await supabase
      .from("material_highlights")
      .insert([{
        user_id: user.id,
        material_id: materialId,
        page_number: selectionTip.pageNumber,
        highlighted_text: selectionTip.text,
        color,
        position: { rects: selectionTip.rects } as any,
      }])
      .select()
      .single();

    if (err) {
      toast.error("Erro ao salvar marcação");
      return;
    }
    setHighlights((prev) => [...prev, data as any]);
    window.getSelection()?.removeAllRanges();
    setSelectionTip(null);
    toast.success("Marcação salva");
  };

  const deleteHighlight = async (id: string) => {
    const { error: err } = await supabase
      .from("material_highlights")
      .delete()
      .eq("id", id);
    if (err) {
      toast.error("Erro ao remover");
      return;
    }
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 4));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.4));

  // Pinch-to-zoom no mobile
  const pinchRef = useRef<{ dist: number; startScale: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), startScale: scale };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / pinchRef.current.dist;
      const newScale = Math.max(0.4, Math.min(4, pinchRef.current.startScale * ratio));
      setScale(newScale);
    }
  };
  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  const pageWidth = containerWidth > 0 ? (isMobile ? containerWidth - 4 : Math.min(containerWidth - 16, 900)) : 600;

  return (
    <div className="relative w-full h-full bg-neutral-900 overflow-hidden">
      {/* Controles de Zoom flutuantes */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-1 py-1 border border-white/10 shadow-xl">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-white/10 text-white"
          onClick={zoomOut}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-[10px] font-black text-white/80 tabular-nums min-w-[34px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-white/10 text-white"
          onClick={zoomIn}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full overflow-auto py-3 px-2"
        style={{ touchAction: "pan-x pan-y" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-white/70 gap-3 p-8 text-center">
            <p className="font-bold">Não foi possível carregar o PDF.</p>
            <p className="text-xs">Verifique o link do material ou tente novamente.</p>
          </div>
        ) : (
          <Document
            file={activeFileUrl}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              setLoading(false);
            }}
            onLoadError={handleLoadError}
            loading={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              </div>
            }
            className="flex flex-col items-center gap-4"
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
              <div
                key={p}
                data-pdf-page={p}
                ref={(el) => (pageRefs.current[p] = el)}
                className="relative shadow-2xl bg-white"
              >
                <Page
                  pageNumber={p}
                  width={pageWidth * scale}
                  renderTextLayer
                  renderAnnotationLayer={false}
                />
                {/* Marcações sobrepostas */}
                {highlights
                  .filter((h) => h.page_number === p)
                  .map((h) =>
                    h.position?.rects?.map((r, idx) => (
                      <div
                        key={`${h.id}-${idx}`}
                        className="absolute pointer-events-auto cursor-pointer group"
                        style={{
                          left: `${r.x}%`,
                          top: `${r.y}%`,
                          width: `${r.w}%`,
                          height: `${r.h}%`,
                          backgroundColor:
                            h.color === "yellow"
                              ? "rgba(253,224,71,0.45)"
                              : h.color === "green"
                              ? "rgba(74,222,128,0.4)"
                              : "rgba(244,114,182,0.4)",
                          mixBlendMode: "multiply",
                        }}
                        onDoubleClick={() => deleteHighlight(h.id)}
                        title="Duplo clique para remover"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHighlight(h.id);
                          }}
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white items-center justify-center hidden group-hover:flex shadow-lg"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))
                  )}
              </div>
            ))}
          </Document>
        )}

        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        )}
      </div>

      {/* Tooltip de marcação ao selecionar texto */}
      {selectionTip && (
        <div
          className="absolute z-40 flex items-center gap-1 bg-black/90 backdrop-blur-md rounded-full p-1 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95"
          style={{
            left: Math.max(8, Math.min(selectionTip.x - 90, (containerRef.current?.clientWidth || 300) - 200)),
            top: selectionTip.y,
          }}
        >
          <button
            onClick={() => saveHighlight("yellow")}
            className="h-7 w-7 rounded-full bg-yellow-300 hover:scale-110 transition-transform flex items-center justify-center"
            title="Grifar amarelo"
          >
            <Highlighter className="h-3.5 w-3.5 text-black" />
          </button>
          <button
            onClick={() => saveHighlight("green")}
            className="h-7 w-7 rounded-full bg-green-400 hover:scale-110 transition-transform"
            title="Grifar verde"
          />
          <button
            onClick={() => saveHighlight("pink")}
            className="h-7 w-7 rounded-full bg-pink-400 hover:scale-110 transition-transform"
            title="Grifar rosa"
          />
        </div>
      )}
    </div>
  );
}
