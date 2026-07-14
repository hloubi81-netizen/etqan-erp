import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Printer, FileSpreadsheet, FileText, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { aggregatePayslip, buildSlipHTML, printPayslip, exportPayslipExcel } from "@/utils/payslipExport";
import { toast } from "sonner";

export default function PayrollSlipGenerator({ department, companyName = "الشركة" }) {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [employeeId, setEmployeeId] = useState("");
  const [slip, setSlip] = useState(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [emp, recs] = await Promise.all([
      base44.entities.Employee.list(),
      base44.entities.SalaryRecord.list("-period"),
    ]);
    const filtered = department ? emp.filter(e => (e.department || "").includes(department) || (e.department || "") === department) : emp;
    setEmployees(filtered);
    setRecords(recs);
    setLoading(false);
  }

  async function generate() {
    if (!employeeId || !period) { toast.error("اختر الموظف والفترة"); return; }
    setBusy(true);
    try {
      const { record, employee } = await aggregatePayslip(employeeId, period);
      setSlip({ record, employee });
      setPreview(true);
    } catch (e) { toast.error("تعذّر تجميع كشف الراتب"); }
    setBusy(false);
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const periodRecords = records.filter(r => r.period === period);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-sm">الموظف</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
            <SelectContent>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm">الفترة</Label>
          <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-40" />
        </div>
        <Button onClick={generate} disabled={busy || !employeeId}>
          <Eye className="h-4 w-4" /> {busy ? "جارٍ التجميع..." : "إنشاء كشف الراتب"}
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 text-sm font-medium">سجلات رواتب الفترة الجاهزة للطباعة ({periodRecords.length})</div>
        <div className="divide-y max-h-72 overflow-y-auto">
          {periodRecords.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">لا توجد سجلات لهذه الفترة</div>}
          {periodRecords.map(r => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium text-sm">{r.employee_name}</div>
                <div className="text-xs text-muted-foreground">أيام: {r.work_days} · مكافآت: {(r.bonuses || 0).toLocaleString()} · خصومات: {(r.deductions || 0).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{(r.net_salary || 0).toLocaleString()}</span>
                <Badge variant={r.status === "مدفوع" ? "success" : "secondary"} className="text-[10px]">{r.status}</Badge>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => { setEmployeeId(r.employee_id); const emp = employees.find(e => e.id === r.employee_id); setSlip({ record: r, employee: emp }); setPreview(true); }}>عرض الكشف</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => printPayslip(r, companyName)}><Printer className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => exportPayslipExcel(r, companyName)}><FileSpreadsheet className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>كشف راتب — {slip?.record?.employee_name}</DialogTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => slip && printPayslip(slip.record, companyName)}><Printer className="h-4 w-4" /> طباعة / PDF</Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => slip && exportPayslipExcel(slip.record, companyName)}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
              </div>
            </div>
          </DialogHeader>
          {slip && (
            <div className="border rounded-lg overflow-hidden">
              <iframe title="payslip" className="w-full h-[520px] border-0" srcDoc={buildSlipHTML(slip.record, companyName)} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {periodRecords.length === 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-4 w-4" /> إن لم يوجد سجل راتب للفترة، سيقوم النظام بتجميع الأيام والمكافآت والخصومات تلقائيًا من سجل الموظف عند إنشاء الكشف.
        </p>
      )}
    </div>
  );
}