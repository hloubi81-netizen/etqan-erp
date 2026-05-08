import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Play, Star, StarOff, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const ENTITIES = {
  "Invoice": { label: "الفواتير", fields: ["invoice_number", "pattern_type", "date", "client_name", "total", "status"] },
  "Voucher": { label: "السندات", fields: ["voucher_number", "type", "date", "account_name", "amount", "status"] },
  "StockTransfer": { label: "المناقلات", fields: ["transfer_number", "date", "from_warehouse_name", "to_warehouse_name", "status"] },
  "Product": { label: "المنتجات", fields: ["item_code", "name", "cost_price", "retail_price", "wholesale_price"] },
  "Account": { label: "الحسابات", fields: ["account_number", "name", "balance", "account_nature"] },
  "Employee": { label: "الموظفون", fields: ["employee_number", "name", "department", "position", "salary", "status"] },
  "SalaryRecord": { label: "الرواتب", fields: ["employee_name", "period", "basic_salary", "net_salary", "status"] },
  "CostEntry": { label: "قيود التكلفة", fields: ["date", "description", "amount", "type", "status"] }
};

const FIELD_LABELS = {
  invoice_number: "رقم الفاتورة", pattern_type: "نوع الفاتورة", date: "التاريخ", client_name: "العميل",
  total: "الإجمالي", status: "الحالة", voucher_number: "رقم السند", type: "النوع", account_name: "الحساب",
  amount: "المبلغ", transfer_number: "رقم المناقلة", from_warehouse_name: "من مستودع", to_warehouse_name: "إلى مستودع",
  item_code: "رمز الصنف", name: "الاسم", cost_price: "سعر التكلفة", retail_price: "سعر التجزئة", wholesale_price: "سعر الجملة",
  account_number: "رقم الحساب", balance: "الرصيد", account_nature: "الطبيعة",
  employee_number: "رقم الموظف", department: "القسم", position: "المنصب", salary: "الراتب",
  employee_name: "اسم الموظف", period: "الفترة", basic_salary: "الراتب الأساسي", net_salary: "صافي الراتب",
  description: "الوصف"
};

const emptyForm = () => ({ name: "", description: "", entity: "Invoice", fields: [], filters: [], sort_by: "", sort_dir: "تنازلي", is_favorite: false });

export default function CustomReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [runningReport, setRunningReport] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const data = await base44.entities.CustomReport.list("-created_date");
    setReports(data); setLoading(false);
  }

  function toggleField(field) {
    setForm(f => {
      const fields = f.fields.includes(field) ? f.fields.filter(x => x !== field) : [...f.fields, field];
      return { ...f, fields };
    });
  }

  async function handleSave() {
    if (!form.name) return toast.error("ادخل اسم التقرير");
    if (form.fields.length === 0) return toast.error("اختر حقلاً واحداً على الأقل");
    if (editing) await base44.entities.CustomReport.update(editing.id, form);
    else await base44.entities.CustomReport.create(form);
    toast.success("تم الحفظ"); setDialogOpen(false); loadData();
  }

  async function runReport(r) {
    setRunning(true); setRunningReport(r);
    const data = await base44.entities[r.entity].list("-created_date", 200);
    setRunResult({ report: r, data });
    setRunning(false);
  }

  async function toggleFavorite(r) {
    await base44.entities.CustomReport.update(r.id, { ...r, is_favorite: !r.is_favorite });
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
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">منشئ التقارير المخصصة</h1>
          <p className="text-muted-foreground text-sm">أنشئ تقارير مخصصة من أي جدول في النظام</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); }}><Plus className="h-4 w-4 ml-1" />تقرير جديد</Button>
      </div>

      {/* Results Area */}
      {runResult && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">نتائج: {runResult.report.name}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportToExcel}><Download className="h-4 w-4 ml-1" />تصدير Excel</Button>
                <Button size="sm" variant="ghost" onClick={() => setRunResult(null)}>إغلاق</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>{runResult.report.fields.map(f => <th key={f} className="p-2 text-right whitespace-nowrap">{FIELD_LABELS[f] || f}</th>)}</tr>
                </thead>
                <tbody>
                  {runResult.data.slice(0, 100).map((row, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/50">
                      {runResult.report.fields.map(f => <td key={f} className="p-2 whitespace-nowrap">{row[f] ?? "-"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {runResult.data.length === 0 && <p className="text-center py-6 text-muted-foreground">لا توجد بيانات</p>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{runResult.data.length} سجل</p>
          </CardContent>
        </Card>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <Card key={r.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{ENTITIES[r.entity]?.label || r.entity}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleFavorite(r)}>
                  {r.is_favorite ? <Star className="h-4 w-4 text-warning fill-warning" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              {r.description && <p className="text-xs text-muted-foreground mb-2">{r.description}</p>}
              <div className="flex flex-wrap gap-1 mb-3">
                {(r.fields || []).slice(0, 4).map(f => <Badge key={f} variant="secondary" className="text-xs">{FIELD_LABELS[f] || f}</Badge>)}
                {(r.fields || []).length > 4 && <Badge variant="outline" className="text-xs">+{r.fields.length - 4}</Badge>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" disabled={running && runningReport?.id === r.id} onClick={() => runReport(r)}>
                  {running && runningReport?.id === r.id ? "جاري التشغيل..." : <><Play className="h-3.5 w-3.5 ml-1" />تشغيل</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing(r); setForm({ ...r }); setDialogOpen(true); }}>تعديل</Button>
                <Button size="sm" variant="ghost" className="text-destructive px-2" onClick={async () => { await base44.entities.CustomReport.delete(r.id); loadData(); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {reports.length === 0 && <p className="col-span-3 text-center py-16 text-muted-foreground">لا توجد تقارير مخصصة بعد</p>}
      </div>

      {/* Build Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل التقرير" : "بناء تقرير جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>اسم التقرير *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div>
                <Label>الجدول *</Label>
                <Select value={form.entity} onValueChange={v => setForm(f => ({ ...f, entity: v, fields: [] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ENTITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>الوصف</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>

            <div>
              <Label className="mb-2 block">الحقول المطلوبة</Label>
              <div className="flex flex-wrap gap-2 border rounded-lg p-3">
                {(ENTITIES[form.entity]?.fields || []).map(field => (
                  <button
                    key={field}
                    onClick={() => toggleField(field)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${form.fields.includes(field) ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:bg-muted"}`}
                  >
                    {FIELD_LABELS[field] || field}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الترتيب حسب</Label>
                <Select value={form.sort_by} onValueChange={v => setForm(f => ({ ...f, sort_by: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر حقل" /></SelectTrigger>
                  <SelectContent>{(ENTITIES[form.entity]?.fields || []).map(field => <SelectItem key={field} value={field}>{FIELD_LABELS[field] || field}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>الاتجاه</Label>
                <Select value={form.sort_dir} onValueChange={v => setForm(f => ({ ...f, sort_dir: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="تنازلي">تنازلي (الأحدث أولاً)</SelectItem>
                    <SelectItem value="تصاعدي">تصاعدي (الأقدم أولاً)</SelectItem>
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