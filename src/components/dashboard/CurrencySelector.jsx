import { useCurrency } from "@/hooks/useCurrency";
import { Coins } from "lucide-react";

export default function CurrencySelector() {
  const { currencies, selectedCurrencyId, setSelectedCurrencyId, localCurrency } = useCurrency();

  if (!currencies || currencies.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-sm">
      <Coins className="h-4 w-4 text-primary shrink-0" />
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">عملة التقارير:</span>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedCurrencyId("local")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedCurrencyId === "local"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {localCurrency?.symbol || "محلي"} {localCurrency?.name || "العملة المحلية"}
        </button>
        {currencies.filter(c => !c.is_local).map(cur => (
          <button
            key={cur.id}
            onClick={() => setSelectedCurrencyId(cur.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedCurrencyId === cur.id
                ? "bg-primary text-primary-foreground shadow"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cur.symbol} {cur.name}
          </button>
        ))}
      </div>
    </div>
  );
}