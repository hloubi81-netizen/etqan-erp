import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Printer, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function SlipRow({ label, value, className = "" }) {
  return (
    <div className={`flex justify-between items-center py-1.5 border-b last:border-0 ${className}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${className}`}>{value}</span>
    </div>
  );
}

function PaySlipView({ record, companyName = "الشركة" }) {
  if (!record) return null;
  const totalAdditions = (record.basic_salary || 0) + (record.allowances || 0) + (record.overtime || 0);
  const totalDeductions = (record.deductions || 0) + (record.absence_deduction || 0);

  return (
    <div className="border rounded-xl overflow-hidden text-sm font-cairo" id="payslip-print">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 text-center">
        <h2 className="text-lg font-bold">{companyName}</h2>
        <p className="text-primary-foreground/80 text-xs mt-0.5">قسيمة الراتب — {record.period}</p>
      </div>

      {/* Employee Info */}
      <div className="bg-muted/30 grid grid-cols-2 gap-x-6 gap-y-1 px-4 py-3 text-xs">
        <div><span className="text-muted-foreground">الاسم: </span><strong>{record.employee_name}</strong></div>
        <div><span className="text-muted-foreground">الرقم: </span><strong>{record.employee_number || "—"}</strong></div>
        <div><span className="text-muted-foreground">القسم: </span><strong>{record.department || "—"}</strong></div>
        <div><span className="text-muted-foreground">مركز التكلفة: </span><strong>{record.cost_center_name || "—"}</strong></div>
        <div><span className="text-muted-foreground">أيام العمل: </span><strong>{record.work_days || "—"}</strong></div>
        <div><span className="text-muted-foreground">أيام الغياب: </span><strong className="text-red-600">{record.absence_days || 0}</strong></div>
      </div>

      {/* Two Columns */}
      <div className="grid grid-cols-2 divide-x divide-x-reverse border-t">
        {/* الإضافات */}
        <div className="p-4">
          <h3 className="font-semibold text-green-700 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>الإضافات
          </h3>
          <SlipRow label="الراتب الأساسي" value={(record.basic_salary || 0).toLocaleString("ar-SA")} />
          {record.allowances_detail?.length > 0
            ? record.allowances_detail.map((a, i) => (
                <SlipRow key={i} label={a.name} value={`+${(a.amount || 0).toLocaleString("ar-SA")}`} className="text-green-700" />
              ))
            : (record.allowances || 0) > 0 && (
                <SlipRow label="البدلات" value={`+${(record.allowances || 0).toLocaleString("ar-SA")}`} className="text-green-700" />
              )}
          {(record.overtime || 0) > 0 && (
            <SlipRow label={`وقت إضافي (${record.overtime_hours || ""}س)`} value={`+${(record.overtime).toLocaleString("ar-SA")}`} className="text-blue-600" />
          )}
          <div className="flex justify-between items-center pt-2 mt-1 border-t font-bold text-green-700">
            <span className="text-xs">إجمالي الإضافات</span>
            <span>{totalAdditions.toLocaleString("ar-SA")}</span>
          </div>
        </div>

        {/* الاستقطاعات */}
        <div className="p-4">
          <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>الاستقطاعات
          </h3>
          {record.deductions_detail?.length > 0
            ? record.deductions_detail.map((d, i) => (
                <SlipRow key={i} label={d.name} value={`-${(d.amount || 0).toLocaleString("ar-SA")}`} className="text-red-600" />
              ))
            : (record.deductions || 0) > 0 && (
                <SlipRow label="الاستقطاعات الثابتة" value={`-${(record.deductions || 0).toLocaleString("ar-SA")}`} className="text-red-600" />
              )}
          {(record.absence_deduction || 0) > 0 && (
            <SlipRow label={`خصم الغياب (${record.absence_days} يوم)`} value={`-${(record.absence_deduction).toLocaleString("ar-SA")}`} className="text-orange-600" />
          )}
          <div className="flex justify-between items-center pt-2 mt-1 border-t font-bold text-red-600">
            <span className="text-xs">إجمالي الاستقطاعات</span>
            <span>{totalDeductions.toLocaleString("ar-SA")}</span>
          </div>
        </div>
      </div>

      {/* Net Salary */}
      <div className="bg-primary p-4 text-center text-primary-foreground">
        <p className="text-xs opacity-80 mb-0.5">صافي الراتب المستحق</p>
        <p className="text-3xl font-bold">{(record.net_salary || 0).toLocaleString("ar-SA")}</p>
      </div>

      {/* Footer */}
      <div className="p-3 bg-muted/20 text-xs text-muted-foreground flex justify-between flex-wrap gap-2">
        <span>طريقة الصرف: <strong>{record.payment_method || "—"}</strong></span>
        {record.payment_date && <span>تاريخ الصرف: <strong>{record.payment_date}</strong></span>}
        <span>الحالة: <strong className={record.status === "مدفوع" ? "text-green-600" : "text-orange-600"}>{record.status}</strong></span>
      </div>
    </div>
  );
}

export default function PayrollSlip({ records, employees }) {
  const [open, setOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filterEmp, setFilterEmp] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState(new Date().toISOString().slice(0, 7));

  const filtered = records.filter(r =>
    (filterEmp === "all" || r.employee_id === filterEmp) &&
    (!filterPeriod || r.period === filterPeriod)
  );

  function printSlip() {
    const content = document.getElementById("payslip-print");
    if (!content) return;
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>قسيمة راتب</title>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
  * { box-sizing: border-box; }
</style>
</head><body>${content.innerHTML}<script>window.print();</script></body></html>`);
    win.document.close();
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input type="month" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="h-9 w-40" />
        <Select value={filterEmp} onValueChange={setFilterEmp}>
          <SelectTrigger className="h-9 w-52"><SelectValue placeholder="الموظف" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الموظفين</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Records List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>لا توجد سجلات رواتب للفترة المحددة</p>
          </div>
        ) : filtered.map(r => (
          <Card
            key={r.id}
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/30"
            onClick={() => { setSelectedRecord(r); setOpen(true); }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.employee_name}</p>
                  <p className="text-xs text-muted-foreground">{r.department || "—"} • {r.period}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.status === "مدفوع" ? "bg-green-100 text-green-700" :
                  r.status === "معتمد" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-700"}`}>{r.status}</span>
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">الصافي</span>
                <span className="font-bold text-primary text-base">{(r.net_salary || 0).toLocaleString("ar-SA")}</span>
              </div>
              <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                <span className="text-green-600">+{((r.allowances||0)+(r.overtime||0)).toLocaleString()}</span>
                <span className="text-red-500">-{((r.deductions||0)+(r.absence_deduction||0)).toLocaleString()}</span>
                {(r.absence_days || 0) > 0 && <span className="text-orange-500">{r.absence_days} يوم غياب</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Slip Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>قسيمة الراتب</DialogTitle>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={printSlip}>
                <Printer className="h-4 w-4" /> طباعة
              </Button>
            </div>
          </DialogHeader>
          <PaySlipView record={selectedRecord} />
        </DialogContent>
      </Dialog>
    </div>
  );
}