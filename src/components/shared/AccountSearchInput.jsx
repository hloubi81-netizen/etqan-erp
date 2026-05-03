import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AccountSearchInput({ accounts = [], value, onChange, placeholder = "ابحث عن الحساب..." }) {
  const selected = accounts.find((a) => a.id === value);
  const [query, setQuery] = useState(selected?.name || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // sync when external value changes
  useEffect(() => {
    const acc = accounts.find((a) => a.id === value);
    setQuery(acc?.name || "");
  }, [value, accounts]);

  const filtered = query.trim()
    ? accounts.filter((a) =>
        a.name.includes(query) || (a.account_number || "").includes(query)
      ).slice(0, 30)
    : accounts.slice(0, 30);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          className="pr-8 h-9 text-sm"
          placeholder={placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange("", "");
          }}
        />
        {value && (
          <button
            type="button"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { onChange("", ""); setQuery(""); setOpen(false); }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(a.id, a.name);
                setQuery(a.name);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-right hover:bg-accent transition-colors",
                a.id === value && "bg-accent font-medium"
              )}
            >
              <span className="truncate">{a.name}</span>
              {a.account_number && (
                <span className="text-xs text-muted-foreground shrink-0">{a.account_number}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && filtered.length === 0 && query.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg px-3 py-4 text-center text-sm text-muted-foreground">
          لا توجد نتائج
        </div>
      )}
    </div>
  );
}