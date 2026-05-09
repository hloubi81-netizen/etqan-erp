import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Users, BarChart3, Settings2 } from "lucide-react";
import PayrollList from "@/components/hr/PayrollList";
import PayrollBulkGenerate from "@/components/hr/PayrollBulkGenerate";
import PayrollCostCenterReport from "@/components/hr/PayrollCostCenterReport";
import { Card, CardContent } from "@/components/ui/card";

export default function Payroll() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [r, e, cc, att] = await Promise.all([
      base44.entities.SalaryRecord.list("-created_date"),
      base44.entities.Employee.list(),
      base44.entities.CostCenter.list(),
      base44.entities.Attendance.list("-date", 500),
    ]);
    setRecords(r); setEmployees(e); setCostCenters(cc); setAttendance(att);
    setLoading(false);
  }

  const totalNet = records.filter(r => r.status === "مدفوع").reduce((s, r) => s + (r.net_salary || 0), 0);
  const pending = records.filter(r => r.status !== "مدفوع").length;
  const activeEmp = employees.filter(e => e.status === "نشط").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const sharedProps = { records, employees, costCenters, attendance, onRefresh: loadAll };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">نظام إدارة الرواتب</h1>
        <p className="text-sm text-muted-foreground">حساب الرواتب مع البدلات والاستقطاعات الآلية ومراكز التكلفة</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "موظفون نشطون", value: activeEmp, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "إجمالي المدفوع", value: totalNet.toLocaleString(), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
          { label: "رواتب معلقة", value: pending, icon: DollarSign, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "مراكز التكلفة", value: costCenters.length, icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-xl p-4 flex items-center gap-3`}>
            <k.icon className={`h-8 w-8 ${k.color}`} />
            <div><p className={`text-2xl font-bold ${k.color}`}>{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="list" dir="rtl">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="list" className="gap-1.5"><DollarSign className="h-4 w-4" /> سجلات الرواتب</TabsTrigger>
          <TabsTrigger value="generate" className="gap-1.5"><Settings2 className="h-4 w-4" /> توليد الرواتب</TabsTrigger>
          <TabsTrigger value="cost-centers" className="gap-1.5"><BarChart3 className="h-4 w-4" /> تقرير مراكز التكلفة</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4"><PayrollList {...sharedProps} /></TabsContent>
        <TabsContent value="generate" className="mt-4"><PayrollBulkGenerate {...sharedProps} /></TabsContent>
        <TabsContent value="cost-centers" className="mt-4"><PayrollCostCenterReport {...sharedProps} /></TabsContent>
      </Tabs>
    </div>
  );
}