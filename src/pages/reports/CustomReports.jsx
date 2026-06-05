import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Play, Star, StarOff, Trash2, Download, Filter, BarChart2,
  Table2, Search, Edit2, Copy, RefreshCw, X, TrendingUp, FileText, Layers
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

// ─── جداول النظام وحقولها ───────────────────────────────────────────────────
const ENTITIES = {
  Invoice:       { label: "الفواتير",         fields: ["invoice_number","pattern_type","date","client_name","total","paid_amount","remaining","status","payment_method","warehouse_name","notes"] },
  Voucher:       { label: "السندات",           fields: ["voucher_number","type","date","account_name","amount","currency","status","notes"] },
  StockTransfer: { label: "مناقلات المخزون",   fields: ["transfer_number","date","from_warehouse_name","to_warehouse_name","status","notes"] },
  Product:       { label: "الأصناف",           fields: ["item_code","name","group_id","branch_name","origin","cost_price","wholesale_price","retail_price","avg_purchase_price","barcode"] },
  Account:       { label: "الحسابات",          fields: ["account_number","name","branch_name","balance","debit_balance","credit_balance","account_nature","final_account","financial_statement","currency"] },
  Employee:      { label: "الموظفون",          fields: ["employee_number","name","department","position","branch_name","salary","status","hire_date","phone"] },
  SalaryRecord:  { label: "الرواتب",           fields: ["employee_name","period","basic_salary","total_allowances","total_deductions","net_salary","status","payment_date"] },
  CostEntry:     { label: "قيود التكلفة",     fields: ["date","description","cost_type","cost_center_name","branch_name","total_cost","period","status"] },
  JournalEntry:  { label: "القيود المحاسبية", fields: ["entry_number","date","source_type","source_number","debit_account_name","credit_account_name","amount","currency","notes"] },
  PurchaseOrder: { label: "أوامر الشراء",     fields: ["order_number","type","date","client_name","warehouse_name","subtotal","total","status"] },
  InventoryCount:{ label: "جرد المخزون",      fields: ["count_number","date","warehouse_name","type","status","notes"] },
  FixedAsset:    { label: "الأصول الثابتة",   fields: ["asset_number","name","category","purchase_date","purchase_cost","net_book_value","accumulated_depreciation","branch_name","status"] },
  Attendance:    { label: "الحضور والغياب",   fields: ["employee_name","date","type","check_in","check_out","hours","notes"] },
  CRMContact:    { label: "جهات الاتصال",     fields: ["name","company","email","phone","status","source","assigned_to","created_date"] },
};

const FIELD_LABELS = {
  invoice_number:"رقم الفاتورة", pattern_type:"نوع الفاتورة", date:"التاريخ", client_name:"العميل/المورد",
  total:"الإجمالي", paid_amount:"المدفوع", remaining:"المتبقي", status:"الحالة", payment_method:"طريقة الدفع",
  warehouse_name:"المستودع", notes:"ملاحظات", voucher_number:"رقم السند", type:"النوع", account_name:"الحساب",
  amount:"المبلغ", currency:"العملة", transfer_number:"رقم المناقلة", from_warehouse_name:"من مستودع",
  to_warehouse_name:"إلى مستودع", item_code:"رمز الصنف", name:"الاسم", group_id:"المجموعة",
  branch_name:"الفرع", origin:"المنشأ", cost_price:"سعر التكلفة", retail_price:"سعر التجزئة",
  wholesale_price:"سعر الجملة", avg_purchase_price:"متوسط الشراء", barcode:"الباركود",
  account_number:"رقم الحساب", balance:"الرصيد", debit_balance:"رصيد مدين", credit_balance:"رصيد دائن",
  account_nature:"الطبيعة", final_account:"الحساب الختامي", financial_statement:"القائمة المالية",
  employee_number:"رقم الموظف", department:"القسم", position:"المنصب", salary:"الراتب",
  hire_date:"تاريخ التعيين", phone:"الهاتف", employee_name:"اسم الموظف", period:"الفترة",
  basic_salary:"الراتب الأساسي", total_allowances:"إجمالي البدلات", total_deductions:"إجمالي الاستقطاعات",
  net_salary:"صافي الراتب", payment_date:"تاريخ الصرف", description:"الوصف", cost_type:"نوع التكلفة",
  cost_center_name:"مركز التكلفة", total_cost:"إجمالي التكلفة", entry_number:"رقم القيد",
  source_type:"نوع المصدر", source_number:"رقم المصدر", debit_account_name:"الحساب المدين",
  credit_account_name:"الحساب الدائن", order_number:"رقم الأمر", subtotal:"المجموع قبل الضريبة",
  count_number:"رقم محضر الجرد", asset_number:"رقم الأصل", category:"التصنيف",
  purchase_date:"تاريخ الشراء", purchase_cost:"تكلفة الشراء", net_book_value:"القيمة الدفترية",
  accumulated_depreciation:"الإهلاك المتراكم", check_in:"وقت الدخول", check_out:"وقت الخروج",
  hours:"ساعات العمل", company:"الشركة", email:"البريد الإلكتروني", source:"المصدر",
  assigned_to:"مُسنَد إلى", created_date:"تاريخ الإنشاء",
};

// حقول رقمية (للإحصاء والرسوم)
const NUMERIC_FIELDS = new Set([
  "total","paid_amount","remaining","amount","salary","basic_salary","total_allowances",
  "total_deductions","net_salary","balance","debit_balance","credit_balance","cost_price",
  "retail_price","wholesale_price","avg_purchase_price","total_cost","subtotal",
  "purchase_cost","net_book_value","accumulated_depreciation","hours",
]);

const CHART_COLORS = ["#2563eb","#16a34a","#ea580c","#9333ea","#0891b2","#dc2626","#d97706","#4f46e5"];

const emptyForm = () => ({
  name: "", description: "", entity: "Invoice", fields: [],
  filters: [], sort_by: "", sort_dir: "desc", is_favorite: false,
  date_from: "", date_to: "", status_filter: "",
});

// ─── مكوّن صغير: إحصاء ملخص ─────────────────────────────────────────────────
function SummaryBar({ data, fields }) {
  const numericFields = fields.filter(f => NUMERIC_FIELDS.has(f));
  if (numericFields.length === 0) return null;
  const sums = {};
  numericFields.forEach(f => { sums[f] = data.reduce((s, r) => s + (Number(r[f]) || 0), 0); });
  return (
    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
      <span className="text-xs text-muted-foreground self-center">الإجماليات:</span>
      {numericFields.map(f => (
        <Badge key={f} variant="outline" className="text-xs bg-primary/5">
          {FIELD_LABELS[f] || f}: <span className="font-bold mr-1">{sums[f].toLocaleString("ar-EG", { maximumFractionDigits: 2 })}</span>
        </Badge>
      ))}
    </div>
  );
}

// ─── الصفحة الرئيسية ────────────────────────────────────────────────────────
export default function CustomReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // table | chart
  const [chartField, setChartField] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFav, setFilterFav] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const data = await base44.entities.CustomReport.list("-created_date");
    setReports(data);
    setLoading(false);
  }

  function toggleField(field) {
    setForm(f => ({
      ...f,
      fields: f.fields.includes(field) ? f.fields.filter(x => x !== field) : [...f.fields, field],
    }));
  }

  async function handleSave() {
    if (!form.name) return toast.error("ادخل اسم التقرير");
    if (form.fields.length === 0) return toast.error("اختر حقلاً واحداً على الأقل");
    if (editing) await base44.entities.CustomReport.update(editing.id, form);
    else await base44.entities.CustomReport.create(form);
    toast.success("تم الحفظ");
    setDialogOpen(false);
    loadData();
  }

  async function runReport(r) {
    setRunning(true);
    setRunningId(r.id);
    setRunResult(null);
    let data = await base44.entities[r.entity].list("-created_date", 500);

    // تطبيق فلتر التاريخ
    if (r.date_from) data = data.filter(row => row.date >= r.date_from);
    if (r.date_to)   data = data.filter(row => row.date <= r.date_to);
    // تطبيق فلتر الحالة
    if (r.status_filter) data = data.filter(row => row.status === r.status_filter);

    // ترتيب
    if (r.sort_by) {
      data = [...data].sort((a, b) => {
        const av = a[r.sort_by] ?? "";
        const bv = b[r.sort_by] ?? "";
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return r.sort_dir === "asc" ? cmp : -cmp;
      });
    }

    // تعيين حقل الرسم البياني تلقائياً
    const firstNumeric = (r.fields || []).find(f => NUMERIC_FIELDS.has(f));
    setChartField(firstNumeric || "");
    setViewMode("table");
    setRunResult({ report: r, data });
    setRunning(false);
    setRunningId(null);
  }

  async function toggleFavorite(r) {
    await base44.entities.CustomReport.update(r.id, { ...r, is_favorite: !r.is_favorite });
    loadData();
  }

  async function duplicateReport(r) {
    const { id, created_date, updated_date, ...rest } = r;
    await base44.entities.CustomReport.create({ ...rest, name: `${r.name} (نسخة)` });
    toast.success("تم نسخ التقرير");
    loadData();
  }

  function exportToExcel() {
    if (!runResult) return;
    const rows = runResult.data.map(row => {
      const obj = {};
      runResult.report.fields.forEach(f => { obj[FIELD_LABELS[f] || f] = row[f] ?? ""; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير");
    XLSX.writeFile(wb, `${runResult.report.name}.xlsx`);
    toast.success("تم تصدير الملف");
  }

  // بيانات الرسم البياني
  function getChartData() {
    if (!runResult || !chartField) return [];
    // إذا كان الحقل نصياً نجمع بحسب القيمة
    const labelField = (runResult.report.fields || []).find(f => !NUMERIC_FIELDS.has(f)) || "date";
    const grouped = {};
    runResult.data.forEach(row => {
      const key = String(row[labelField] || "—").slice(0, 20);
      grouped[key] = (grouped[key] || 0) + (Number(row[chartField]) || 0);
    });
    return Object.entries(grouped).slice(0, 15).map(([name, value]) => ({ name, value }));
  }

  const displayedReports = reports
    .filter(r => !filterFav || r.is_favorite)
    .filter(r => !searchTerm || r.name.includes(searchTerm) || (r.description || "").includes(searchTerm));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            منشئ التقارير المخصصة
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            أنشئ تقارير مخصصة من {Object.keys(ENTITIES).length} جداول في النظام
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 ml-1" />تقرير جديد
        </Button>
      </div>

      {/* Results Area */}
      {runResult && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">نتائج: {runResult.report.name}</CardTitle>
                <Badge variant="secondary">{runResult.data.length} سجل</Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* تبديل العرض */}
                <div className="flex border rounded-md overflow-hidden">
                  <Button size="sm" variant={viewMode === "table" ? "default" : "ghost"} className="rounded-none h-8 px-3" onClick={() => setViewMode("table")}>
                    <Table2 className="h-3.5 w-3.5 ml-1" />جدول
                  </Button>
                  <Button size="sm" variant={viewMode === "chart" ? "default" : "ghost"} className="rounded-none h-8 px-3" onClick={() => setViewMode("chart")}>
                    <BarChart2 className="h-3.5 w-3.5 ml-1" />رسم بياني
                  </Button>
                </div>
                <Button size="sm" variant="outline" onClick={exportToExcel}>
                  <Download className="h-3.5 w-3.5 ml-1" />Excel
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRunResult(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* فلاتر الرسم البياني */}
            {viewMode === "chart" && (
              <div className="flex gap-3 flex-wrap mt-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">الحقل المرسوم:</Label>
                  <Select value={chartField} onValueChange={setChartField}>
                    <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="اختر حقلاً" /></SelectTrigger>
                    <SelectContent>
                      {(runResult.report.fields || []).filter(f => NUMERIC_FIELDS.has(f)).map(f => (
                        <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">نوع الرسم:</Label>
                  <Select value={chartType} onValueChange={setChartType}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">أعمدة</SelectItem>
                      <SelectItem value="pie">دائري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {viewMode === "table" ? (
              <>
                <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr>
                        <th className="p-2 text-right text-muted-foreground font-medium whitespace-nowrap">#</th>
                        {runResult.report.fields.map(f => (
                          <th key={f} className="p-2 text-right font-medium whitespace-nowrap border-r border-border/50 last:border-r-0">
                            {FIELD_LABELS[f] || f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runResult.data.slice(0, 200).map((row, idx) => (
                        <tr key={idx} className={`border-t ${idx % 2 === 0 ? "" : "bg-muted/30"} hover:bg-primary/5`}>
                          <td className="p-2 text-muted-foreground text-xs">{idx + 1}</td>
                          {runResult.report.fields.map(f => (
                            <td key={f} className="p-2 whitespace-nowrap border-r border-border/30 last:border-r-0">
                              {NUMERIC_FIELDS.has(f) && row[f] != null
                                ? Number(row[f]).toLocaleString("ar-EG", { maximumFractionDigits: 2 })
                                : (row[f] ?? "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {runResult.data.length === 0 && (
                    <p className="text-center py-10 text-muted-foreground">لا توجد بيانات تطابق الفلاتر</p>
                  )}
                </div>
                {runResult.data.length > 200 && (
                  <p className="text-xs text-muted-foreground mt-1">يعرض أول 200 سجل من {runResult.data.length}</p>
                )}
                <SummaryBar data={runResult.data} fields={runResult.report.fields} />
              </>
            ) : (
              <div>
                {!chartField ? (
                  <p className="text-center py-10 text-muted-foreground">اختر حقلاً رقمياً لعرض الرسم البياني</p>
                ) : chartType === "bar" ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => v.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} />
                      <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} name={FIELD_LABELS[chartField] || chartField} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={getChartData()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {getChartData().map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => v.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* شريط البحث والفلترة */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="ابحث في التقارير..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Button
          size="sm"
          variant={filterFav ? "default" : "outline"}
          onClick={() => setFilterFav(!filterFav)}
          className="gap-1"
        >
          <Star className="h-3.5 w-3.5" />المفضلة
        </Button>
        <Badge variant="secondary" className="text-xs">{displayedReports.length} تقرير</Badge>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedReports.map(r => (
          <Card key={r.id} className="hover:shadow-md transition-all hover:border-primary/30 group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Layers className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{ENTITIES[r.entity]?.label || r.entity}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => toggleFavorite(r)}>
                  {r.is_favorite
                    ? <Star className="h-4 w-4 text-warning fill-warning" />
                    : <StarOff className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                </Button>
              </div>

              {r.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{r.description}</p>}

              {/* عرض الفلاتر المضبوطة */}
              {(r.date_from || r.date_to || r.status_filter) && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {r.date_from && <Badge variant="outline" className="text-[10px]">من: {r.date_from}</Badge>}
                  {r.date_to && <Badge variant="outline" className="text-[10px]">إلى: {r.date_to}</Badge>}
                  {r.status_filter && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">{r.status_filter}</Badge>}
                </div>
              )}

              <div className="flex flex-wrap gap-1 mb-3">
                {(r.fields || []).slice(0, 3).map(f => (
                  <Badge key={f} variant="secondary" className="text-[10px]">{FIELD_LABELS[f] || f}</Badge>
                ))}
                {(r.fields || []).length > 3 && (
                  <Badge variant="outline" className="text-[10px]">+{r.fields.length - 3}</Badge>
                )}
              </div>

              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={running && runningId === r.id}
                  onClick={() => runReport(r)}
                >
                  {running && runningId === r.id
                    ? <><RefreshCw className="h-3.5 w-3.5 ml-1 animate-spin" />جاري...</>
                    : <><Play className="h-3.5 w-3.5 ml-1" />تشغيل</>}
                </Button>
                <Button size="sm" variant="outline" className="px-2" onClick={() => { setEditing(r); setForm({ ...r }); setDialogOpen(true); }}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="px-2" onClick={() => duplicateReport(r)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="px-2 text-destructive" onClick={async () => {
                  await base44.entities.CustomReport.delete(r.id);
                  toast.success("تم الحذف");
                  loadData();
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {displayedReports.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>{reports.length === 0 ? "لا توجد تقارير مخصصة بعد. أنشئ تقريرك الأول!" : "لا توجد نتائج مطابقة للبحث"}</p>
          </div>
        )}
      </div>

      {/* ─── Dialog بناء/تعديل التقرير ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل التقرير" : "بناء تقرير جديد"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">المعلومات الأساسية</TabsTrigger>
              <TabsTrigger value="fields" className="flex-1">الحقول</TabsTrigger>
              <TabsTrigger value="filters" className="flex-1">الفلاتر والترتيب</TabsTrigger>
            </TabsList>

            {/* تبويب 1: الأساسيات */}
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <Label>اسم التقرير *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="مثال: تقرير المبيعات الشهري"
                  />
                </div>
                <div>
                  <Label>الجدول (المصدر) *</Label>
                  <Select value={form.entity} onValueChange={v => setForm(f => ({ ...f, entity: v, fields: [], sort_by: "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ENTITIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>وصف التقرير</Label>
                  <Input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="وصف مختصر لهذا التقرير..."
                  />
                </div>
              </div>
            </TabsContent>

            {/* تبويب 2: الحقول */}
            <TabsContent value="fields" className="pt-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>اختر الحقول المطلوبة في التقرير</Label>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setForm(f => ({ ...f, fields: [...(ENTITIES[f.entity]?.fields || [])] }))}>
                      الكل
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setForm(f => ({ ...f, fields: [] }))}>
                      إلغاء الكل
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border rounded-lg p-3 min-h-[120px] bg-muted/20">
                  {(ENTITIES[form.entity]?.fields || []).map(field => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => toggleField(field)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        form.fields.includes(field)
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "border-muted-foreground/30 hover:bg-muted hover:border-primary/50"
                      }`}
                    >
                      {NUMERIC_FIELDS.has(field) ? "# " : ""}{FIELD_LABELS[field] || field}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {form.fields.length} حقل محدد • الحقول التي تبدأ بـ # هي حقول رقمية (تدعم الجمع والرسوم البيانية)
                </p>
              </div>
            </TabsContent>

            {/* تبويب 3: الفلاتر والترتيب */}
            <TabsContent value="filters" className="space-y-4 pt-4">
              <div>
                <Label className="flex items-center gap-1 mb-2"><Filter className="h-3.5 w-3.5" />فلتر التاريخ</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">من تاريخ</Label>
                    <Input type="date" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
                    <Input type="date" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="flex items-center gap-1 mb-2"><Filter className="h-3.5 w-3.5" />فلتر الحالة</Label>
                <Input
                  value={form.status_filter}
                  onChange={e => setForm(f => ({ ...f, status_filter: e.target.value }))}
                  placeholder="مثال: مرحَّل، معتمد، مسودة..."
                />
                <p className="text-xs text-muted-foreground mt-1">اتركه فارغاً لعرض جميع الحالات</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الترتيب حسب</Label>
                  <Select value={form.sort_by || "none"} onValueChange={v => setForm(f => ({ ...f, sort_by: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="بدون ترتيب" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون ترتيب</SelectItem>
                      {(ENTITIES[form.entity]?.fields || []).map(field => (
                        <SelectItem key={field} value={field}>{FIELD_LABELS[field] || field}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الاتجاه</Label>
                  <Select value={form.sort_dir} onValueChange={v => setForm(f => ({ ...f, sort_dir: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">تنازلي (الأكبر أولاً)</SelectItem>
                      <SelectItem value="asc">تصاعدي (الأصغر أولاً)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>
              {editing ? "حفظ التعديلات" : "إنشاء التقرير"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}