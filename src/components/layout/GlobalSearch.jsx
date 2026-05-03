import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, X, Receipt, Package, FileText, Users, Landmark } from "lucide-react";

const CATEGORIES = [
  { label: "فواتير", icon: Receipt, color: "text-blue-500", path: (r) => `/invoices/${r.pattern_type === "مبيعات" ? "sales" : "purchases"}`, key: "invoice_number", sub: (r) => r.client_name },
  { label: "منتجات", icon: Package, color: "text-orange-500", path: () => "/products", key: "name", sub: (r) => r.item_code },
  { label: "موظفون", icon: Users, color: "text-purple-500", path: () => "/hr/employees", key: "name", sub: (r) => r.department },
  { label: "أصول ثابتة", icon: Landmark, color: "text-green-500", path: () => "/assets", key: "name", sub: (r) => r.asset_number },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const [invoices, products, employees, assets] = await Promise.all([
        base44.entities.Invoice.list("-date", 200),
        base44.entities.Product.list(),
        base44.entities.Employee.list(),
        base44.entities.FixedAsset.list(),
      ]);
      const q = query.toLowerCase();
      const found = [];
      const match = (val) => val?.toString().toLowerCase().includes(q);

      invoices.filter(r => match(r.invoice_number) || match(r.client_name)).slice(0, 4).forEach(r =>
        found.push({ ...r, _cat: 0 }));
      products.filter(r => match(r.name) || match(r.item_code)).slice(0, 4).forEach(r =>
        found.push({ ...r, _cat: 1 }));
      employees.filter(r => match(r.name) || match(r.department)).slice(0, 3).forEach(r =>
        found.push({ ...r, _cat: 2 }));
      assets.filter(r => match(r.name) || match(r.asset_number)).slice(0, 3).forEach(r =>
        found.push({ ...r, _cat: 3 }));

      setResults(found);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function go(result) {
    const cat = CATEGORIES[result._cat];
    navigate(cat.path(result));
    setOpen(false);
    setQuery("");
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">بحث شامل...</span>
      <kbd className="hidden sm:inline text-[10px] bg-background border border-border rounded px-1.5 py-0.5">Ctrl K</kbd>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50" onClick={() => setOpen(false)}>
      <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن فواتير، منتجات، موظفين..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          {query && <button onClick={() => setQuery("")}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>}
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {loading && <p className="text-center text-sm text-muted-foreground py-6">جاري البحث...</p>}
          {!loading && query && results.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">لا توجد نتائج لـ "{query}"</p>}
          {results.map((r, i) => {
            const cat = CATEGORIES[r._cat];
            const Icon = cat.icon;
            return (
              <button key={i} onClick={() => go(r)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-right transition-colors">
                <Icon className={`h-4 w-4 shrink-0 ${cat.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r[cat.key]}</p>
                  {cat.sub(r) && <p className="text-xs text-muted-foreground truncate">{cat.sub(r)} • {cat.label}</p>}
                </div>
              </button>
            );
          })}
          {!query && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              ابدأ الكتابة للبحث في الفواتير والمنتجات والموظفين...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}