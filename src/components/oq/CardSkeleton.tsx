import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function CardSkeleton() {
  return (
    <div className="paper-card flex-1 flex flex-col overflow-hidden mb-[230px] md:mb-[250px] animate-pulse">
      <div className="flex-1 px-6 md:px-9 pt-8 pb-6 md:pb-9 space-y-6">
        <div className="flex justify-between items-center mb-8">
          <div className="h-6 w-3/4 bg-muted rounded-lg" />
          <div className="h-8 w-8 bg-muted rounded-full" />
        </div>
        
        <div className="space-y-4">
          <div className="h-4 w-full bg-muted/60 rounded" />
          <div className="h-4 w-5/6 bg-muted/60 rounded" />
          <div className="h-4 w-4/6 bg-muted/60 rounded" />
        </div>

        <div className="grid grid-cols-1 gap-3 pt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-full bg-muted/40 rounded-xl border border-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
