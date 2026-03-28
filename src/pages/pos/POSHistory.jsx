import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Receipt, Search, TrendingUp, ShoppingCart, DollarSign } from "lucide-react";

export default function POSHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.POSSession.list("-created_date").then((s) => { setSessions(s); setLoading(false); });
  }, []);

  const filtered = sessions.filter(
    (s) => s.session_number?.includes(search) || s.client_name?.includes(search)
  );

  const totalSales = sessions.reduce((a, s) => a + (s.total || 0), 0);
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySales = sessions.filter((s) => s.date === todayStr).reduce((a, s) => a + (s.total || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">سجل مبيعات نقطة البيع</h1>
        <p className="text-sm text-muted-foreground mt-1">عرض جميع عمليات البيع</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center"><ShoppingCart className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-muted-foreground">إجمالي الفواتير</p><p className="text-xl font-bold">{sessions.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 bg-green-600 rounded-xl flex items-center justify-center"><DollarSign className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-muted-foreground">إجمالي المبيعات</p><p className="text-xl font-bold">{totalSales.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 bg-purple-600 rounded-xl flex items-center justify-center"><TrendingUp className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-muted-foreground">مبيعات اليوم</p><p className="text-xl font-bold">{todaySales.toLocaleString()}</p></div>
        </CardContent></Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? <div className="col-span-2 text-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></div> :
          filtered.length === 0 ? <div className="col-span-2 text-center text-muted-foreground py-12">لا توجد عمليات بيع</div> :
          filtered.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelected(selected?.id === s.id ? null : s)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span className="font-bold">#{s.session_number}</span>
                    <Badge variant={s.status === "مكتملة" ? "default" : "destructive"} className="text-xs">{s.status}</Badge>
                  </div>
                  <span className="text-lg font-bold text-primary">{(s.total || 0).toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>{s.date} • {s.payment_method}</p>
                  {s.client_name && <p>العميل: {s.client_name}</p>}
                  <p>{(s.items || []).length} منتج</p>
                </div>
                {selected?.id === s.id && (
                  <div className="mt-3 border-t border-border pt-3 space-y-1">
                    {(s.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span>{item.product_name} × {item.quantity}</span>
                        <span className="font-medium">{(item.total || 0).toLocaleString()}</span>
                      </div>
                    ))}
                    {s.discount > 0 && <div className="flex justify-between text-xs text-red-500"><span>خصم</span><span>- {s.discount.toLocaleString()}</span></div>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
}