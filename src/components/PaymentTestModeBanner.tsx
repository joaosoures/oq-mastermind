import { getPaddleEnvironment } from "@/lib/paddle";

export default function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div className="w-full bg-amber-100 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700 px-4 py-1.5 text-center text-xs text-amber-900 dark:text-amber-200">
      Modo de teste — pagamentos no preview não cobram dinheiro real.
    </div>
  );
}
