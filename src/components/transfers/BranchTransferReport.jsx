import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ArrowRightLeft, Package, Download } from "lucide-react";

export default function BranchTransferReport({ transfers, branches, warehouses, products }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() => {
    return transfers.filter(t => {
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterBranch !== "all" && t.from_branch_id !== filterBranch && t.to_branch_id !== filterBranch) return false;
      if (filterProduct !== "all" && !t.items?.some(i => i.product_id === filterProduct)) return false;
      return true;
    });
  }, [transfers, dateFrom, dateTo, filterBranch, filterProduct, filterStatus]);

  // حركة بين كل زوج من الفروع
  const branchPairStats = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      const from = t.from_branch_name || t.from_warehouse_name || "غير محدد";
      const to = t.to_branch_name || t.to_warehouse_name || "غير محدد";
      const key = `${from} ← ${to}`;
      if (!map[key]) map[key] = { from, to, count: 0, items: 0, products: {} };
      map[key].count++;
      t.items?.forEach(item => {
        map[key].items += item.quantity || 0;
        if (item.product_name) {
          map[key].products[item.product_name] = (map[key].products[item.product_name] || 0) + (item.quantity || 0);
        }
      });
    });
    return Object.entries(map).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // حركة المنتجات
  const productStats = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      t.items?.forEach(item => {
        if (!item.product_name) return;
        if (!map[item.product_name]) map[item.product_name] = { name: item.product_name, total_qty: 0, transfers: 0 };
        map[item.product_name].total_qty += item.quantity || 0;
        map[item.product_name].transfers++;
      });
    });
    return Object.values(map).sort((a, b) => b.total_qty - a.total_qty).slice(0, 10);
  }, [filtered]);

  // بيانات الرسم البياني - حركة الفروع
  const branchChartData = useMemo(() => {
    const sent = {}, received = {};
    filtered.forEach(t => {
      const from = t.from_branch_name || t.from_warehouse_name || "غير محدد";
      const to = t.to_branch_name || t.to_warehouse_name || "غير محدد";
      const qty = t.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
      sent[from] = (sent[from] || 0) + qty;
      received[to] = (received[to] || 0) + qty;
    });
    const allKeys = new Set([...Object.keys(sent), ...Object.keys(received)]);
    return [...allKeys].map(k => ({ name: k, صادر: sent[k] || 0, وارد: received[k] || 0 }));
  }, [filtered]);

  const totalQty = filtered.reduce((s, t) => s + (t.items?.reduce((ss, i) => ss + (i.quantity || 0), 0) || 0), 0);

  const exportCSV = () => {
    const rows = [["رقم المناقلة", "التاريخ", "من الفرع", "من المستودع", "إلى الفرع", "إلى المستودع", "الصنف", "الكمية", "الوحدة", "الحالة"]];
    filtered.forEach(t => {
      if (!t.items?.length) {
        rows.push([t.transfer_number, t.date, t.from_branch_name || "", t.from_warehouse_name || "", t.to_branch_name || "", t.to_warehouse_name || "", "", "", "", t.status || ""]);
      } else {
        t.items.forEach(item => {
          rows.push([t.transfer_number, t.date, t.from_branch_name || "", t.from_warehouse_name || "", t.to_branch_name || "", t.to_warehouse_name || "", item.product_name || "", item.quantity || 0, item.unit || "", t.status || ""]);
        });
      }
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "branch-transfers.csv"; a.click();
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">من تاريخ</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الفرع</label>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفروع</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الصنف</label>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأصناف</SelectItem>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الحالة</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="مسودة">مسودة</SelectItem>
                  <SelectItem value="معتمد">معتمد</SelectItem>
                  <SelectItem value="مكتمل">مكتمل</SelectItem>
                  <SelectItem value="ملغى">ملغى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المناقلات", value: filtered.length, color: "text-blue-600" },
          { label: "إجمالي الكميات المحوَّلة", value: totalQty.toLocaleString(), color: "text-green-600" },
          { label: "مسارات فريدة", value: branchPairStats.length, color: "text-purple-600" },
          { label: "أصناف محوَّلة", value: productStats.length, color: "text-orange-600" },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Chart */}
      {branchChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">الحركة الصادرة والواردة لكل فرع</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={branchChartData} margin={{ right: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="صادر" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="وارد" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Branch Pair Stats */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> حركة بين الفروع</CardTitle>
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> تصدير CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {branchPairStats.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">لا توجد بيانات</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">المسار</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">المناقلات</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">الكمية</th>
                  </tr>
                </thead>
                <tbody>
                  {branchPairStats.map((r, i) => (
                    <tr key={i} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <div className="text-xs">
                          <span className="font-medium text-red-600">{r.from}</span>
                          <span className="mx-1.5 text-muted-foreground">→</span>
                          <span className="font-medium text-green-600">{r.to}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {Object.entries(r.products).slice(0, 2).map(([name, qty]) => `${name}: ${qty}`).join(" | ")}
                          {Object.keys(r.products).length > 2 && " ..."}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center font-semibold">{r.count}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-blue-700">{r.items.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Product Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" /> أكثر الأصناف تحويلاً</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {productStats.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">لا توجد بيانات</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">الصنف</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">مرات التحويل</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">إجمالي الكمية</th>
                  </tr>
                </thead>
                <tbody>
                  {productStats.map((p, i) => (
                    <tr key={i} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium">{p.name}</td>
                      <td className="px-4 py-2.5 text-center">{p.transfers}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-blue-700">{p.total_qty.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">تفصيل جميع المناقلات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">رقم المناقلة</th>
                  <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                  <th className="px-4 py-3 text-right font-medium">من</th>
                  <th className="px-4 py-3 text-right font-medium">إلى</th>
                  <th className="px-4 py-3 text-right font-medium">الأصناف</th>
                  <th className="px-4 py-3 text-center font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد نتائج</td></tr>
                ) : filtered.map(t => (
                  <tr key={t.id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-semibold">{t.transfer_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.date}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-red-700">{t.from_branch_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{t.from_warehouse_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-green-700">{t.to_branch_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{t.to_warehouse_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.items?.slice(0, 3).map((item, i) => (
                          <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {item.product_name} ({item.quantity} {item.unit || ""})
                          </span>
                        ))}
                        {(t.items?.length || 0) > 3 && <span className="text-xs text-muted-foreground">+{t.items.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={
                        t.status === "مكتمل" ? "bg-green-100 text-green-700" :
                        t.status === "معتمد" ? "bg-blue-100 text-blue-700" :
                        t.status === "ملغى" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }>{t.status || "مسودة"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}