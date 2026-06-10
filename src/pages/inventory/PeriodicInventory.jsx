import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { getWarehouseStock } from "@/utils/inventoryEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ClipboardList, RefreshCw, CheckCircle2, TrendingUp, TrendingDown,
  Minus, AlertTriangle, Download, Printer, Search, Package,
  Play, ChevronLeft, FileText, BarChart3, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import ExportButtons from "@/components/shared/ExportButtons";

// ─── Diff Badge ───────────────────────────────────────────────────────────────
function DiffBadge({ diff }) {
  if (diff === null || diff === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  if (diff === 0) return <Badge className="bg-green-100 text-green-700 border-0 gap-1"><CheckCircle2 className="h-3 w-3" />مطابق</Badge>;
  if (diff > 0) return <Badge className="bg-blue-100 text-blue-700 border-0 gap-1"><TrendingUp className="h-3 w-3" />فائض +{diff}</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-0 gap-1"><TrendingDown className="h-3 w-3" />عجز {diff}</Badge>;
}

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = ["اختيار المستودع", "إدخال الكميات الفعلية", "مراجعة الفروقات", "اعتماد وتسجيل"];

export default function PeriodicInventory() {
  const [step, setStep] = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [countDate, setCountDate] = useState(new Date().toISOString().split("T")[0]);
  const [countNotes, setCountNotes] = useState("");
  const [items, setItems] = useState([]); // [{product_id, product_name, book_qty, actual_qty}]
  const [search, setSearch] = useState("");
  const [filterDiff, setFilterDiff] = useState("all"); // all | surplus | deficit | matched | uncounted
  const [savedCount, setSavedCount] = useState(null); // the created InventoryCount record

  useEffect(() => { loadWarehouses(); }, []);

  async function loadWarehouses() {
    const w = await base44.entities.Warehouse.list().catch(() => []);
    setWarehouses(w);
    setLoading(false);
  }

  async function handleWarehouseSelect(warehouseId) {
    const w = warehouses.find(x => x.id === warehouseId);
    setSelectedWarehouse(w);
    setItems([]);
    setStep(0);
  }

  async function loadWarehouseStock() {
    if (!selectedWarehouse) return;
    setLoadingStock(true);
    try {
      const stock = await getWarehouseStock(selectedWarehouse.id);
      const filtered = stock.filter(p => !p.is_service);
      setItems(filtered.map(p => ({
        product_id: p.id,
        product_name: p.name,
        product_code: p.item_code || "",
        book_qty: p.available_qty || 0,
        actual_qty: "",  // فارغ = لم يُجرَد بعد
      })));
      toast.success(`تم تحميل ${filtered.length} صنف من المستودع`);
      setStep(1);
    } catch (e) {
      toast.error("خطأ في جلب بيانات المخزون");
    }
    setLoadingStock(false);
  }

  function updateActual(idx, value) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, actual_qty: value } : item));
  }

  function setAllToBook() {
    setItems(prev => prev.map(item => ({ ...item, actual_qty: item.book_qty })));
    toast.success("تم ضبط جميع الكميات الفعلية مساوية للكميات الدفترية");
  }

  // المؤشرات
  const stats = useMemo(() => {
    const counted = items.filter(i => i.actual_qty !== "");
    const surplus = counted.filter(i => parseFloat(i.actual_qty) > i.book_qty);
    const deficit = counted.filter(i => parseFloat(i.actual_qty) < i.book_qty);
    const matched = counted.filter(i => parseFloat(i.actual_qty) === i.book_qty);
    return {
      total: items.length,
      counted: counted.length,
      surplus: surplus.length,
      deficit: deficit.length,
      matched: matched.length,
      uncounted: items.length - counted.length,
      totalSurplusQty: surplus.reduce((s, i) => s + (parseFloat(i.actual_qty) - i.book_qty), 0),
      totalDeficitQty: deficit.reduce((s, i) => s + (i.book_qty - parseFloat(i.actual_qty)), 0),
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.product_name?.toLowerCase().includes(q) || i.product_code?.toLowerCase().includes(q));
    }
    if (filterDiff === "surplus") result = result.filter(i => i.actual_qty !== "" && parseFloat(i.actual_qty) > i.book_qty);
    if (filterDiff === "deficit") result = result.filter(i => i.actual_qty !== "" && parseFloat(i.actual_qty) < i.book_qty);
    if (filterDiff === "matched") result = result.filter(i => i.actual_qty !== "" && parseFloat(i.actual_qty) === i.book_qty);
    if (filterDiff === "uncounted") result = result.filter(i => i.actual_qty === "");
    return result;
  }, [items, search, filterDiff]);

  async function handleApproveAndRecord() {
    if (stats.uncounted > 0) {
      const confirm = window.confirm(`تنبيه: ${stats.uncounted} صنف لم يُجرَد بعد. هل تريد المتابعة واعتبار الكميات الفارغة مساوية للكمية الدفترية؟`);
      if (!confirm) return;
    }

    setSaving(true);

    // بناء بنود المحضر
    const finalItems = items.map(item => {
      const actual = item.actual_qty === "" ? item.book_qty : parseFloat(item.actual_qty) || 0;
      const diff = actual - item.book_qty;
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        book_quantity: item.book_qty,
        actual_quantity: actual,
        surplus: Math.max(0, diff),
        deficit: Math.max(0, -diff),
      };
    });

    const counts = await base44.entities.InventoryCount.list().catch(() => []);
    const countNumber = `PERIODIC-${String(counts.length + 1).padStart(4, "0")}-${countDate}`;

    try {
      const record = await base44.entities.InventoryCount.create({
        count_number: countNumber,
        date: countDate,
        warehouse_id: selectedWarehouse.id,
        warehouse_name: selectedWarehouse.name,
        type: "محضر جرد",
        status: "معتمد",
        notes: countNotes || `جرد دوري بتاريخ ${countDate}`,
        items: finalItems,
      });

      setSavedCount({ ...record, count_number: countNumber, items: finalItems });
      setStep(3);
      toast.success("✅ تم اعتماد محضر الجرد وتسجيل الفروقات", { duration: 5000 });
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
    setSaving(false);
  }

  function printReport() {
    const win = window.open("", "_blank", "width=900,height=700");
    const surplus = items.filter(i => i.actual_qty !== "" && parseFloat(i.actual_qty) > i.book_qty);
    const deficit = items.filter(i => i.actual_qty !== "" && parseFloat(i.actual_qty) < i.book_qty);
    const rows = items.map((item, i) => {
      const actual = item.actual_qty === "" ? "—" : item.actual_qty;
      const diff = item.actual_qty !== "" ? parseFloat(item.actual_qty) - item.book_qty : null;
      return `
        <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"};${diff !== null && diff < 0 ? "background:#fff1f2;" : diff !== null && diff > 0 ? "background:#eff6ff;" : ""}">
          <td style="padding:7px 10px;font-size:11px;">${item.product_code || "—"}</td>
          <td style="padding:7px 10px;font-size:11px;font-weight:600;">${item.product_name}</td>
          <td style="padding:7px 10px;font-size:11px;text-align:center;font-family:monospace;">${item.book_qty}</td>
          <td style="padding:7px 10px;font-size:11px;text-align:center;font-family:monospace;">${actual}</td>
          <td style="padding:7px 10px;font-size:11px;text-align:center;font-weight:700;color:${diff === null ? "#94a3b8" : diff > 0 ? "#1d4ed8" : diff < 0 ? "#dc2626" : "#16a34a"};">
            ${diff === null ? "—" : diff === 0 ? "✓" : diff > 0 ? `+${diff}` : diff}
          </td>
          <td style="padding:7px 10px;font-size:11px;text-align:center;">
            ${diff === null ? "لم يُجرَد" : diff === 0 ? "مطابق" : diff > 0 ? "فائض" : "عجز"}
          </td>
        </tr>`;
    }).join("");

    win.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"/>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Tajawal',Arial,sans-serif;color:#1e293b;background:#fff;direction:rtl;}
        .page{width:210mm;margin:0 auto;padding:12mm;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
      </style></head>
      <body><div class="page">
        <div style="background:#1d4ed8;color:white;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:18px;font-weight:900;">محضر الجرد الدوري</div>
            <div style="font-size:11px;opacity:.8;">المستودع: ${selectedWarehouse?.name}</div>
          </div>
          <div style="text-align:left;">
            <div style="font-size:12px;">التاريخ: ${countDate}</div>
            <div style="font-size:10px;opacity:.8;">الحالة: معتمد</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;text-align:center;">
            <div style="font-size:10px;color:#15803d;">مطابق</div>
            <div style="font-size:18px;font-weight:900;color:#16a34a;">${stats.matched}</div>
          </div>
          <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:10px;text-align:center;">
            <div style="font-size:10px;color:#1d4ed8;">فائض</div>
            <div style="font-size:18px;font-weight:900;color:#1d4ed8;">${stats.surplus}</div>
          </div>
          <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px;text-align:center;">
            <div style="font-size:10px;color:#dc2626;">عجز</div>
            <div style="font-size:18px;font-weight:900;color:#dc2626;">${stats.deficit}</div>
          </div>
          <div style="background:#fafafa;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center;">
            <div style="font-size:10px;color:#64748b;">إجمالي الأصناف</div>
            <div style="font-size:18px;font-weight:900;color:#334155;">${stats.total}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#1d4ed8;">
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:right;">الرمز</th>
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:right;">الصنف</th>
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:center;">دفتري</th>
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:center;">فعلي</th>
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:center;">الفرق</th>
              <th style="padding:8px 10px;color:white;font-size:11px;text-align:center;">الحالة</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:30px;">
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;">
            <p style="font-size:11px;font-weight:700;margin-bottom:8px;">توقيع أمين المخزن</p>
            <div style="height:40px;border-bottom:1px solid #cbd5e1;"></div>
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;">
            <p style="font-size:11px;font-weight:700;margin-bottom:8px;">توقيع المعتمد</p>
            <div style="height:40px;border-bottom:1px solid #cbd5e1;"></div>
          </div>
        </div>
        <div style="margin-top:14px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;">
          طُبع بتاريخ: ${new Date().toLocaleDateString("ar-EG")}
        </div>
      </div></body></html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          الجرد الدوري للمخازن
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          مقارنة الرصيد الفعلي بالرصيد الدفتري وتسجيل الفروقات تلقائياً
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-1 shrink-0">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              step === i ? "bg-primary text-white shadow-sm" :
              step > i ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
            )}>
              {step > i ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="w-4 h-4 rounded-full border border-current text-center leading-4 flex items-center justify-center text-[10px]">{i + 1}</span>}
              {s}
            </div>
            {i < STEPS.length - 1 && <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>

      {/* ── STEP 0: اختيار المستودع ── */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">إعداد جلسة الجرد</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label className="text-xs mb-1 block">المستودع المراد جرده *</Label>
                <Select value={selectedWarehouse?.id || ""} onValueChange={handleWarehouseSelect}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="اختر المستودع..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} {w.branch_name ? `— ${w.branch_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">تاريخ الجرد</Label>
                <Input type="date" value={countDate} onChange={e => setCountDate(e.target.value)} className="h-10" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ملاحظات</Label>
              <Input value={countNotes} onChange={e => setCountNotes(e.target.value)} placeholder="سبب الجرد أو ملاحظات إضافية..." className="h-9" />
            </div>

            {selectedWarehouse && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={loadWarehouseStock} disabled={loadingStock} className="gap-2 flex-1">
                  {loadingStock ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {loadingStock ? "جاري تحميل أصناف المستودع..." : "بدء جلسة الجرد"}
                </Button>
              </div>
            )}

            {!selectedWarehouse && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">اختر المستودع لبدء عملية الجرد</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── STEP 1: إدخال الكميات الفعلية ── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "إجمالي الأصناف", val: stats.total, color: "bg-slate-100 text-slate-700" },
              { label: "تم جردها", val: `${stats.counted}/${stats.total}`, color: "bg-blue-100 text-blue-700" },
              { label: "مطابق", val: stats.matched, color: "bg-green-100 text-green-700" },
              { label: "فائض", val: stats.surplus, color: "bg-blue-100 text-blue-700" },
              { label: "عجز", val: stats.deficit, color: "bg-red-100 text-red-700" },
            ].map((s, i) => (
              <Card key={i} className={cn("border-0", s.color)}>
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-black">{s.val}</p>
                  <p className="text-[11px] font-medium">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input className="h-9 pr-8" placeholder="بحث بالصنف..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterDiff} onValueChange={setFilterDiff}>
              <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل ({stats.total})</SelectItem>
                <SelectItem value="uncounted">لم يُجرَد ({stats.uncounted})</SelectItem>
                <SelectItem value="surplus">فائض ({stats.surplus})</SelectItem>
                <SelectItem value="deficit">عجز ({stats.deficit})</SelectItem>
                <SelectItem value="matched">مطابق ({stats.matched})</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={setAllToBook}>
              <Minus className="h-3.5 w-3.5" /> تطابق الكل
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => { setStep(0); setItems([]); }}>
              <RefreshCw className="h-3.5 w-3.5" /> إعادة تحميل
            </Button>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-primary rounded-full transition-all"
              style={{ width: `${stats.total > 0 ? (stats.counted / stats.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            تقدم الجرد: {stats.counted} من {stats.total} صنف ({stats.total > 0 ? Math.round((stats.counted / stats.total) * 100) : 0}%)
          </p>

          {/* Items Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground w-16">#</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">الصنف</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">الكمية الدفترية</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">الكمية الفعلية</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">الفرق</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredItems.map((item, displayIdx) => {
                      const realIdx = items.findIndex(i => i.product_id === item.product_id);
                      const actual = item.actual_qty === "" ? null : parseFloat(item.actual_qty);
                      const diff = actual !== null ? actual - item.book_qty : null;
                      return (
                        <tr key={item.product_id} className={cn(
                          "hover:bg-muted/10 transition-colors",
                          diff !== null && diff < 0 ? "bg-red-50/40" :
                          diff !== null && diff > 0 ? "bg-blue-50/40" :
                          diff === 0 ? "bg-green-50/20" : ""
                        )}>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{displayIdx + 1}</td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium">{item.product_name}</p>
                            {item.product_code && <p className="text-[10px] text-muted-foreground font-mono">{item.product_code}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="font-mono font-bold text-muted-foreground">{item.book_qty}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex justify-center">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className={cn(
                                  "h-8 w-28 text-center font-mono font-bold text-sm",
                                  item.actual_qty === "" ? "border-dashed border-orange-300 bg-orange-50/50" :
                                  diff < 0 ? "border-red-300 bg-red-50" :
                                  diff > 0 ? "border-blue-300 bg-blue-50" :
                                  "border-green-300 bg-green-50"
                                )}
                                placeholder="أدخل الكمية"
                                value={item.actual_qty}
                                onChange={e => updateActual(realIdx, e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn(
                              "font-mono font-bold",
                              diff === null ? "text-muted-foreground" :
                              diff > 0 ? "text-blue-600" :
                              diff < 0 ? "text-red-600" : "text-green-600"
                            )}>
                              {diff === null ? "—" : diff === 0 ? "✓" : diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <DiffBadge diff={diff} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3 justify-end flex-wrap">
            <Button variant="outline" onClick={() => setStep(0)}>رجوع</Button>
            <Button onClick={printReport} variant="outline" className="gap-1.5">
              <Printer className="h-4 w-4" /> طباعة تقرير
            </Button>
            <Button onClick={() => setStep(2)} className="gap-1.5" disabled={stats.counted === 0}>
              مراجعة الفروقات
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: مراجعة الفروقات ── */}
      {step === 2 && (
        <div className="space-y-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800 text-sm">مراجعة الفروقات قبل الاعتماد</p>
                <p className="text-xs text-orange-700 mt-0.5">
                  سيتم تسجيل هذه الفروقات في محضر الجرد المعتمد. الفوائض والعجوز المسجلة تؤثر على الأرصدة الدفترية.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-green-200"><CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-green-700">{stats.matched}</p>
              <p className="text-xs text-green-600">أصناف مطابقة</p>
            </CardContent></Card>
            <Card className="border-blue-200"><CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-blue-700">{stats.surplus}</p>
              <p className="text-xs text-blue-600">أصناف فائضة</p>
              <p className="text-[10px] text-muted-foreground">إجمالي: +{stats.totalSurplusQty}</p>
            </CardContent></Card>
            <Card className="border-red-200"><CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-red-600">{stats.deficit}</p>
              <p className="text-xs text-red-600">أصناف عجز</p>
              <p className="text-[10px] text-muted-foreground">إجمالي: -{stats.totalDeficitQty}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-black text-slate-700">{stats.uncounted}</p>
              <p className="text-xs text-muted-foreground">لم يُجرَد</p>
            </CardContent></Card>
          </div>

          {/* Diff items only */}
          {(stats.surplus > 0 || stats.deficit > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  الأصناف التي بها فروقات ({stats.surplus + stats.deficit} صنف)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">الصنف</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">دفتري</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">فعلي</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">الفرق</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">النوع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.filter(i => i.actual_qty !== "" && parseFloat(i.actual_qty) !== i.book_qty).map((item, i) => {
                      const actual = parseFloat(item.actual_qty);
                      const diff = actual - item.book_qty;
                      return (
                        <tr key={i} className={diff > 0 ? "bg-blue-50/40" : "bg-red-50/40"}>
                          <td className="px-4 py-2.5 font-medium">{item.product_name}</td>
                          <td className="px-4 py-2.5 text-center font-mono text-muted-foreground">{item.book_qty}</td>
                          <td className="px-4 py-2.5 text-center font-mono font-bold">{actual}</td>
                          <td className="px-4 py-2.5 text-center font-mono font-black text-lg">
                            <span className={diff > 0 ? "text-blue-600" : "text-red-600"}>
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge className={diff > 0 ? "bg-blue-100 text-blue-700 border-0" : "bg-red-100 text-red-700 border-0"}>
                              {diff > 0 ? "فائض" : "عجز"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {stats.surplus === 0 && stats.deficit === 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-green-700 font-bold">الجرد مطابق تماماً!</p>
                <p className="text-green-600 text-sm">لا توجد أي فروقات بين الرصيد الدفتري والفعلي</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 justify-end flex-wrap">
            <Button variant="outline" onClick={() => setStep(1)}>رجوع للتعديل</Button>
            <Button variant="outline" onClick={printReport} className="gap-1.5">
              <Printer className="h-4 w-4" /> طباعة
            </Button>
            <Button onClick={handleApproveAndRecord} disabled={saving} className="gap-1.5 bg-green-600 hover:bg-green-700">
              <Zap className="h-4 w-4" />
              {saving ? "جاري الاعتماد..." : "اعتماد وتسجيل الفروقات تلقائياً"}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: تم ── */}
      {step === 3 && savedCount && (
        <Card className="border-green-300">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-green-700">تم اعتماد محضر الجرد</h2>
              <p className="text-muted-foreground text-sm mt-1">
                رقم المحضر: <span className="font-mono font-bold">{savedCount.count_number}</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-lg font-black text-green-700">{stats.matched}</p>
                <p className="text-xs text-green-600">مطابق</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-lg font-black text-blue-700">{stats.surplus}</p>
                <p className="text-xs text-blue-600">فائض</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-lg font-black text-red-600">{stats.deficit}</p>
                <p className="text-xs text-red-600">عجز</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={printReport} className="gap-1.5">
                <Printer className="h-4 w-4" /> طباعة المحضر
              </Button>
              <ExportButtons
                columns={[
                  { key: "product_name", label: "الصنف" },
                  { key: "book_quantity", label: "الكمية الدفترية" },
                  { key: "actual_quantity", label: "الكمية الفعلية" },
                  { key: "surplus", label: "الفائض" },
                  { key: "deficit", label: "العجز" },
                ]}
                data={savedCount.items || []}
                title={`محضر جرد ${savedCount.count_number}`}
                filename={`inventory-count-${savedCount.count_number}`}
              />
              <Button onClick={() => {
                setStep(0); setItems([]); setSavedCount(null); setSelectedWarehouse(null);
                setCountNotes(""); setSearch(""); setFilterDiff("all");
              }} className="gap-1.5">
                <ClipboardList className="h-4 w-4" /> جرد جديد
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}