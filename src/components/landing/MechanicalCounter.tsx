import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MechanicalCounterProps {
  initialValue: number;
  intervalMs?: number;
}

export default function MechanicalCounter({ initialValue, intervalMs = 5000 }: MechanicalCounterProps) {
  const [count, setCount] = useState(initialValue);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => prev + 1);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  const digits = count.toString().split("");

  return (
    <div className="inline-flex items-center gap-1 font-mono">
      {digits.map((digit, idx) => (
        <Digit key={`${digits.length - idx}-${digit}`} value={digit} />
      ))}
    </div>
  );
}

function Digit({ value }: { value: string }) {
  return (
    <div className="relative h-10 w-7 md:h-12 md:w-8 bg-[hsl(var(--primary))] rounded-md overflow-hidden flex items-center justify-center shadow-lg border border-white/10">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 20,
            duration: 0.4 
          }}
          className="text-white text-xl md:text-2xl font-bold"
        >
          {value}
        </motion.span>
      </AnimatePresence>
      {/* Linha horizontal no meio para o efeito de placar mecânico */}
      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/20 z-10" />
    </div>
  );
}
