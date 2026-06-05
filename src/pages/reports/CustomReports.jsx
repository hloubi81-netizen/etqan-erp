import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Play, Star, StarOff, Trash2, Download, FileText, Filter, BarChart2, RefreshCw, X, ChevronDown, ChevronUp, Search, Printer } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ============================================================
// ENTITIES DEFINITION
// ============================================================
const ENTITIES = {
  Invoice: {
    label: "الفواتير", icon: "🧾",
    fields: ["invoice_number","pattern_type","date","client_name","total","discount_value","tax_amount","status","payment_method","notes","warehouse_name"]
  },
  Voucher: {
    label: "السندات المحاسبية", icon: "📋",
    fields: ["voucher_number","type","date","account_name","counter_account_name","amount","currency","notes","status"]
  },
  StockTransfer: {
    label: "مناقلات المخزون", icon: "🔄",
    fields: ["transfer_number","date","from_warehouse_name","to_warehouse_name","notes","status"]
  },
  Product: {
    label: "المنتجات / الأصناف", icon: "📦",
    fields: ["item_code","name","origin","color","size","cost_price","last_purchase_price","wholesale_price","retail_price","avg_purchase_price","barcode","branch_name"]
  },
  Account: {
    label: "دليل الحسابات", icon: "📊",
    fields: ["account_number","name","balance","debit_balance","credit_balance","account_nature","final_account","financial_statement","currency","branch_name"]
  },
  Employee: {
    label: "الموظفون", icon: "👤",
    fields: ["employee_number","name","department","position","hire_date","salary","branch_name","status","phone","national_id"]
  },
  SalaryRecord: {
    label: "سجلات الرواتب", icon: "💰",
    fields: ["employee_name","period","basic_salary","total_allowances","total_deductions","net_salary","status"]
  },
  Attendance: {
    label: "سجلات الحضور", icon: "📅",
    fields: ["employee_name","date","type","check_in","check_out","hours","notes"]
  },
  LeaveRequest: {
    label: "طلبات الإجازات", icon: "🏖️",
    fields: ["employee_name","type","start_date","end_date","days","status","notes"]
  },
  PurchaseOrder: {
    label: "أوامر الشراء", icon: "🛒",
    fields: ["order_number","type","date","client_name","warehouse_name","subtotal","discount_value","tax_amount","total","expected_date","status"]
  },
  GoodsReceipt: {
    label: "طلبات الاستلام", icon: "📥",
    fields: ["receipt_number","purchase_order_number","date","supplier_name","warehouse_name","subtotal","total","status","match_status"]
  },
  InventoryCount: {
    label: "محاضر الجرد", icon: "🔢",
    fields: ["count_number","date","warehouse_name","type","status","notes"]
  },
  CostEntry: {
    label: "قيود التكلفة", icon: "💲",
    fields: ["entry_number","date","cost_center_name","cost_type","account_name","description","quantity","unit","unit_cost","total_cost","branch_name","period","status"]
  },
  FixedAsset: {
    label: "الأصول الثابتة", icon: "🏢",
    fields: ["asset_number","name","category","purchase_date","purchase_cost","useful_life_years","annual_depreciation","accumulated_depreciation","net_book_value","location","branch_name","status"]
  },
  JournalEntry: {
    label: "القيود اليومية", icon: "📒",
    fields: ["entry_number","date","source_type","source_number","debit_account_name","credit_account_name","amount","currency","notes"]
  },
  CRMContact: {
    label: "جهات الاتصال (CRM)", icon: "📇",
    fields: ["name","company","email","phone","type","status","source","notes"]
  },
  Promotion: {
    label: "العروض والخصومات", icon: "🎁",
    fields: ["name","type","discount_percent","discount_amount","applies_to","product_name","start_date","end_date","applicable_to","is_active","usage_count"]
  },
  Budget: {
    label: "الميزانيات", icon: "📐",
    fields: ["name","year","period_type","period_label","cost_center_name","total_budgeted","total_actual","status","notes"]
  },
};

const FIELD_LABELS = {
  invoice_number:"رقم الفاتورة", pattern_type:"نوع الفاتورة", date:"التاريخ", client_name:"العميل/المورد",
  total:"الإجمالي", discount_value:"قيمة الخصم", tax_amount:"الضريبة", status:"الحالة",
  payment_method:"طريقة الدفع", notes:"ملاحظات", warehouse_name:"المستودع",
  voucher_number:"رقم السند", type:"النوع", account_name:"الحساب", counter_account_name:"الحساب المقابل",
  amount:"المبلغ", currency:"العملة",
  transfer_number:"رقم المناقلة", from_warehouse_name:"من مستودع", to_warehouse_name:"إلى مستودع",
  item_code:"رمز الصنف", name:"الاسم", origin:"المنشأ", color:"اللون", size:"القياس",
  cost_price:"سعر التكلفة", last_purchase_price:"آخر سعر شراء", wholesale_price:"سعر الجملة",
  retail_price:"سعر التجزئة", avg_purchase_price:"متوسط سعر الشراء", barcode:"الباركود", branch_name:"الفرع",
  account_number:"رقم الحساب", balance:"الرصيد", debit_balance:"رصيد مدين", credit_balance:"رصيد دائن",
  account_nature:"الطبيعة", final_account:"الحساب الختامي", financial_statement:"القائمة المالية",
  employee_number:"رقم الموظف", department:"القسم", position:"المنصب", hire_date:"تاريخ التعيين",
  salary:"الراتب", phone:"الهاتف", national_id:"رقم الهوية",
  employee_name:"اسم الموظف", period:"الفترة", basic_salary:"الراتب الأساسي",
  total_allowances:"إجمالي البدلات", total_deductions:"إجمالي الاستقطاعات", net_salary:"صافي الراتب",
  check_in:"وقت الدخول", check_out:"وقت الخروج", hours:"ساعات العمل",
  start_date:"تاريخ البداية", end_date:"تاريخ النهاية", days:"الأيام",
  order_number:"رقم الأمر", subtotal:"المجموع", expected_date:"تاريخ الاستلام المتوقع",
  receipt_number:"رقم الاستلام", purchase_order_number:"رقم أمر الشراء", supplier_name:"المورد",
  match_status:"حالة المطابقة",
  count_number:"رقم الجرد",
  entry_number:"رقم القيد", cost_center_name:"مركز التكلفة", cost_type:"نوع التكلفة",
  description:"الوصف", quantity:"الكمية", unit:"الوحدة", unit_cost:"تكلفة الوحدة", total_cost:"إجمالي التكلفة",
  asset_number:"رقم الأصل", category:"التصنيف", purchase_date:"تاريخ الشراء", purchase_cost:"تكلفة الشراء",
  useful_life_years:"العمر الإنتاجي", annual_depreciation:"الإهلاك السنوي",
  accumulated_depreciation:"الإهلاك المتراكم", net_book_value:"القيمة الدفترية الصافية", location:"الموقع",
  source_type:"نوع المصدر", source_number:"رقم المصدر", debit_account_name:"الحساب المدين", credit_account_name:"الحساب الدائن",
  company:"الشركة", email:"البريد الإلكتروني", source:"المصدر",
  discount_percent:"نسبة الخصم %", discount_amount:"مبلغ الخصم", applies_to:"ينطبق على",
  product_name:"المنتج", applicable_to:"يُطبَّق في", is_active:"نشط", usage_count:"عدد الاستخدام",
  year:"السنة", period_type:"نوع الفترة", period_label:"الفترة", total_budgeted:"إجمالي الميزانية", total_actual:"الفعلي",
};

// Filter operators
const FILTER_OPS = [
  { value: "eq", label: "يساوي" },
  { value: "neq", label: "لا يساوي" },
  { value: "contains", label: "يحتوي على" },
  { value: "gt", label: "أكبر من" },
  { value: "lt", label: "أقل من" },
  { value: "gte", label: "أكبر من أو يساوي" },
  { value: "lte", label: "أقل من أو يساوي" },
];

function applyFilter(row, filter) {
  const val = String(row[filter.field] ?? "").toLowerCase();
  const fval = String(filter.value ?? "").toLowerCase();
  const num = parseFloat(row[filter.field]);
  const fnum = parseFloat(filter.value);
  switch (filter.op) {
    case "eq": return val === fval;
    case "neq": return val !== fval;
    case "contains": return val.includes(fval);
    case "gt": return !isNaN(num) && !isNaN(fnum) ? num > fnum : val > fval;
    case "lt": return !isNaN(num) && !isNaN(fnum) ? num < fnum : val < fval;
    case "gte": return !isNaN(num) && !isNaN(fnum) ? num >= fnum : val >= fval;
    case "lte": return !isNaN(num) && !isNaN(fnum) ? num <= fnum : val <= fval;
    default: return true;
  }
}

function applyFilters(data, filters) {
  return data.filter(row => filters.every(f => !f.field || !f.value || applyFilter(row, f)));
}

function sortData(data, sort_by, sort_dir) {
  if (!sort_by) return data;
  return [...data].sort((a, b) => {
    const av = a[sort_by], bv = b[sort_by];
    const n1 = parseFloat(av), n2 = parseFloat(bv);
    const compare = !isNaN(n1) && !isNaN(n2) ? n1 - n2 : String(av ?? "").localeCompare(String(bv ?? ""));
    return sort_dir === "تنازلي" ? -compare : compare;
  });
}

const emptyForm = () => ({
  name: "", description: "", entity: "Invoice", fields: [],
  filters: [{ field: "", op: "eq", value: "" }],
  sort_by: "", sort_dir: "تنازلي", is_favorite: false,
  date_from: "", date_to: "", date_field: "date", limit: "500"
});

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CustomReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterFav, setFilterFav] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const printRef = useRef();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const data = await base44.entities.CustomReport.list("-created_date");
    setReports(data); setLoading(false);
  }

  function toggleField(field) {
    setForm(f => ({
      ...f,
      fields: f.fields.includes(field) ? f.fields.filter(x => x !== field) : [...f.fields, field]
    }));
  }

  function selectAllFields() {
    setForm(f => ({ ...f, fields: [...(ENTITIES[f.entity]?.fields || [])] }));
  }

  function addFilter() {
    setForm(f => ({ ...f, filters: [...(f.filters || []), { field: "", op: "eq", value: "" }] }));
  }

  function updateFilter(idx, key, val) {
    setForm(f => {
      const filters = [...(f.filters || [])];
      filters[idx] = { ...filters[idx], [key]: val };
      return { ...f, filters };
    });
  }

  function removeFilter(idx) {
    setForm(f => ({ ...f, filters: f.filters.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.name) return toast.error("ادخل اسم التقرير");
    if (form.fields.length === 0) return toast.error("اختر حقلاً واحداً على الأقل");
    if (editing) await base44.entities.CustomReport.update(editing.id, form);
    else await base44.entities.CustomReport.create(form);
    toast.success("تم الحفظ"); setDialogOpen(false); loadData();
  }

  async function runReport(r) {
    setRunning(true); setRunningId(r.id);
    try {
      const limit = parseInt(r.limit) || 500;
      let data = await base44.entities[r.entity].list("-created_date", limit);

      // date range filter
      if (r.date_from || r.date_to) {
        data = data.filter(row => {
          const d = row[r.date_field || "date"];
          if (!d) return true;
          if (r.date_from && d < r.date_from) return false;
          if (r.date_to && d > r.date_to) return false;
          return true;
        });
      }

      // custom filters
      if (r.filters && r.filters.length > 0) data = applyFilters(data, r.filters);

      // sort
      data = sortData(data, r.sort_by, r.sort_dir);

      setRunResult({ report: r, data });
      setActiveTab("result");
    } finally {
      setRunning(false); setRunningId(null);
    }
  }

  async function toggleFavorite(r) {
    await base44.entities.CustomReport.update(r.id, { is_favorite: !r.is_favorite });
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

  function printReport() {
    const printWin = window.open("", "_blank");
    const entity = ENTITIES[runResult.report.entity];
    const rows = runResult.data.map(row =>
      `<tr>${runResult.report.fields.map(f => `<td style="border:1px solid #ddd;padding:6px 10px;">${row[f] ?? "-"}</td>`).join("")}</tr>`
    ).join("");
    const headers = runResult.report.fields.map(f =>
      `<th style="background:#1e3a5f;color:white;padding:8px 10px;border:1px solid #ddd;">${FIELD_LABELS[f] || f}</th>`
    ).join("");
    printWin.document.write(`
      <html dir="rtl"><head><meta charset="UTF-8"><title>${runResult.report.name}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;direction:rtl;}table{width:100%;border-collapse:collapse;}
      h2{text-align:center;margin-bottom:4px;}p{text-align:center;color:#666;margin-bottom:12px;}</style></head>
      <body>
        <h2>${runResult.report.name}</h2>
        <p>${entity?.label || runResult.report.entity} — ${runResult.data.length} سجل — ${new Date().toLocaleDateString("ar-EG")}</p>
        <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
      </body></html>
    `);
    printWin.document.close();
    printWin.print();
  }

  function exportCSV() {
    if (!runResult) return;
    const headers = runResult.report.fields.map(f => FIELD_LABELS[f] || f).join(",");
    const rows = runResult.data.map(row =>
      runResult.report.fields.map(f => `"${String(row[f] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${runResult.report.name}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير CSV");
  }

  // Compute column stats for numeric fields
  function getStats() {
    if (!runResult) return {};
    const stats = {};
    runResult.report.fields.forEach(f => {
      const vals = runResult.data.map(r => parseFloat(r[f])).filter(v => !isNaN(v));
      if (vals.length > 0) {
        stats[f] = {
          sum: vals.reduce((a, b) => a + b, 0),
          avg: vals.reduce((a, b) => a + b, 0) / vals.length,
          min: Math.min(...vals),
          max: Math.max(...vals),
        };
      }
    });
    return stats;
  }

  const filtered = reports.filter(r =>
    (!filterFav || r.is_favorite) &&
    (!searchQ || r.name.includes(searchQ) || ENTITIES[r.entity]?.label.includes(searchQ))
  );

  const stats = getStats();
  const numericFields = runResult ? runResult.report.fields.filter(f => stats[f]) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">منشئ التقارير المخصصة</h1>
          <p className="text-muted-foreground text-sm">استخرج تقارير مفصّلة من جميع عمليات النظام</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 ml-1" />تقرير جديد
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list"><FileText className="h-4 w-4 ml-1" />التقارير المحفوظة ({reports.length})</TabsTrigger>
          {runResult && <TabsTrigger value="result"><BarChart2 className="h-4 w-4 ml-1" />النتائج: {runResult.report.name}</TabsTrigger>}
        </TabsList>

        {/* SAVED REPORTS LIST */}
        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pr-8" placeholder="بحث في التقارير..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
            <Button variant={filterFav ? "default" : "outline"} size="sm" onClick={() => setFilterFav(f => !f)}>
              <Star className="h-3.5 w-3.5 ml-1" />المفضلة فقط
            </Button>
            <Button variant="ghost" size="sm" onClick={loadData}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(r => (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xl mt-0.5">{ENTITIES[r.entity]?.icon || "📊"}</span>
                        <div>
                          <p className="font-semibold text-sm">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{ENTITIES[r.entity]?.label || r.entity}</p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleFavorite(r)}>
                        {r.is_favorite ? <Star className="h-4 w-4 text-warning fill-warning" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mb-2">{r.description}</p>}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(r.fields || []).slice(0, 4).map(f => <Badge key={f} variant="secondary" className="text-xs">{FIELD_LABELS[f] || f}</Badge>)}
                      {(r.fields || []).length > 4 && <Badge variant="outline" className="text-xs">+{r.fields.length - 4} حقل</Badge>}
                    </div>
                    {(r.filters || []).some(f => f.field && f.value) && (
                      <div className="flex items-center gap-1 mb-2 text-xs text-blue-600">
                        <Filter className="h-3 w-3" />
                        <span>{r.filters.filter(f => f.field && f.value).length} فلتر نشط</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" disabled={running && runningId === r.id} onClick={() => runReport(r)}>
                        {running && runningId === r.id
                          ? <><RefreshCw className="h-3.5 w-3.5 ml-1 animate-spin" />جاري...</>
                          : <><Play className="h-3.5 w-3.5 ml-1" />تشغيل</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditing(r); setForm({ ...r, filters: r.filters?.length ? r.filters : [{ field: "", op: "eq", value: "" }] }); setDialogOpen(true); }}>تعديل</Button>
                      <Button size="sm" variant="ghost" className="text-destructive px-2" onClick={async () => { await base44.entities.CustomReport.delete(r.id); loadData(); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-3 text-center py-16 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد تقارير مخصصة بعد</p>
                  <p className="text-sm mt-1">أنشئ تقريرك الأول بالضغط على "تقرير جديد"</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* RESULTS TAB */}
        {runResult && (
          <TabsContent value="result" className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{ENTITIES[runResult.report.entity]?.icon}</span>
                <div>
                  <h2 className="font-semibold">{runResult.report.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {ENTITIES[runResult.report.entity]?.label} — {runResult.data.length} سجل
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={exportToExcel}><Download className="h-4 w-4 ml-1" />Excel</Button>
                <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4 ml-1" />CSV</Button>
                <Button size="sm" variant="outline" onClick={printReport}><Printer className="h-4 w-4 ml-1" />طباعة</Button>
                <Button size="sm" variant="ghost" onClick={() => { setRunResult(null); setActiveTab("list"); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Numeric Stats */}
            {numericFields.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {numericFields.slice(0, 4).map(f => (
                  <Card key={f} className="bg-primary/5 border-primary/20">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{FIELD_LABELS[f] || f}</p>
                      <p className="font-bold text-lg">{stats[f].sum.toLocaleString("ar-EG", { maximumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted-foreground">
                        متوسط: {stats[f].avg.toLocaleString("ar-EG", { maximumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[60vh]" ref={printRef}>
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr>
                        <th className="p-2 text-right text-muted-foreground font-medium w-10 border-b">#</th>
                        {runResult.report.fields.map(f => (
                          <th key={f} className="p-2 text-right whitespace-nowrap border-b font-medium">{FIELD_LABELS[f] || f}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runResult.data.map((row, idx) => (
                        <tr key={idx} className={`border-b ${idx % 2 === 0 ? "bg-background" : "bg-muted/30"} hover:bg-primary/5`}>
                          <td className="p-2 text-muted-foreground text-xs">{idx + 1}</td>
                          {runResult.report.fields.map(f => (
                            <td key={f} className="p-2 whitespace-nowrap">
                              {typeof row[f] === "boolean"
                                ? (row[f] ? "✅" : "❌")
                                : (row[f] ?? <span className="text-muted-foreground/50">—</span>)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {numericFields.length > 0 && (
                      <tfoot>
                        <tr className="bg-muted/60 font-semibold">
                          <td className="p-2 text-xs text-muted-foreground">إجمالي</td>
                          {runResult.report.fields.map(f => (
                            <td key={f} className="p-2 text-sm">
                              {stats[f] ? stats[f].sum.toLocaleString("ar-EG", { maximumFractionDigits: 2 }) : ""}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  {runResult.data.length === 0 && (
                    <p className="text-center py-10 text-muted-foreground">لا توجد بيانات تطابق الفلاتر المحددة</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* BUILD / EDIT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل التقرير" : "بناء تقرير جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>اسم التقرير *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثل: مبيعات الشهر الحالي" />
              </div>
              <div>
                <Label>مصدر البيانات *</Label>
                <Select value={form.entity} onValueChange={v => setForm(f => ({ ...f, entity: v, fields: [], sort_by: "" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENTITIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>الوصف (اختياري)</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف مختصر للتقرير" />
              </div>
            </div>

            {/* Date Range */}
            <div className="border rounded-lg p-3 space-y-3">
              <Label className="flex items-center gap-2 font-semibold"><Filter className="h-4 w-4" />فلتر التاريخ</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">حقل التاريخ</Label>
                  <Select value={form.date_field || "date"} onValueChange={v => setForm(f => ({ ...f, date_field: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(ENTITIES[form.entity]?.fields || []).filter(f => f.includes("date") || f === "period").map(f => (
                        <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>
                      ))}
                      <SelectItem value="date">التاريخ (الافتراضي)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">من تاريخ</Label>
                  <Input type="date" className="h-8 text-sm" value={form.date_from || ""} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">إلى تاريخ</Label>
                  <Input type="date" className="h-8 text-sm" value={form.date_to || ""} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Fields */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">الحقول المطلوبة *</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={selectAllFields}>تحديد الكل</Button>
              </div>
              <div className="flex flex-wrap gap-2 border rounded-lg p-3 min-h-[60px]">
                {(ENTITIES[form.entity]?.fields || []).map(field => (
                  <button
                    key={field}
                    onClick={() => toggleField(field)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      form.fields.includes(field)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-muted-foreground/30 hover:bg-muted"
                    }`}
                  >
                    {FIELD_LABELS[field] || field}
                  </button>
                ))}
              </div>
              {form.fields.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{form.fields.length} حقل محدد</p>
              )}
            </div>

            {/* Custom Filters */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 font-semibold"><Filter className="h-4 w-4" />فلاتر مخصصة</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addFilter}><Plus className="h-3 w-3 ml-1" />إضافة فلتر</Button>
              </div>
              {(form.filters || []).map((filter, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                  <Select value={filter.field || "__none"} onValueChange={v => updateFilter(idx, "field", v === "__none" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر حقلاً" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">-- اختر حقلاً --</SelectItem>
                      {(ENTITIES[form.entity]?.fields || []).map(f => (
                        <SelectItem key={f} value={f}>{FIELD_LABELS[f] || f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filter.op} onValueChange={v => updateFilter(idx, "op", v)}>
                    <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FILTER_OPS.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="h-8 text-xs" placeholder="القيمة" value={filter.value} onChange={e => updateFilter(idx, "value", e.target.value)} />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeFilter(idx)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Sort & Limit */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>الترتيب حسب</Label>
                <Select value={form.sort_by || "__none"} onValueChange={v => setForm(f => ({ ...f, sort_by: v === "__none" ? "" : v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="اختر حقل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">الترتيب الافتراضي</SelectItem>
                    {(ENTITIES[form.entity]?.fields || []).map(field => (
                      <SelectItem key={field} value={field}>{FIELD_LABELS[field] || field}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الاتجاه</Label>
                <Select value={form.sort_dir} onValueChange={v => setForm(f => ({ ...f, sort_dir: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="تنازلي">تنازلي (الأحدث أولاً)</SelectItem>
                    <SelectItem value="تصاعدي">تصاعدي (الأقدم أولاً)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الحد الأقصى للسجلات</Label>
                <Select value={String(form.limit || "500")} onValueChange={v => setForm(f => ({ ...f, limit: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 سجل</SelectItem>
                    <SelectItem value="500">500 سجل</SelectItem>
                    <SelectItem value="1000">1000 سجل</SelectItem>
                    <SelectItem value="2000">2000 سجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ التقرير</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}