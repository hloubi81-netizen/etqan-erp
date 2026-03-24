import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../../components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function CashFlow() {
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [filters, setFilters] = useState({ date_from: "", date_to: "" });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [inv, v] = await Promise.all([
      base44.entities.Invoice.list(),
      base44.entities.Voucher.list(),
    ]);
    setInvoices(inv); setVouchers(v);
    setLoading(false);
  }

  function generateReport() {
    let cashFromCustomers = 0;
    let cashToSuppliers = 0;
    let cashReceipts = 0;
    let cashPayments = 0;

    invoices.forEach((inv) => {
      if (filters.date_from && inv.date < filters.date_from) return;
      if (filters.date_to && inv.date > filters.date_to) return;

      if (inv.pattern_type === "مبيعات" && inv.payment_method === "نقداً") {
        cashFromCustomers += inv.total || 0;
      }
      if (inv.pattern_type === "مبيعات" && inv.paid_amount > 0) {
        cashFromCustomers += inv.paid_amount || 0;
      }
      if (inv.pattern_type === "مشتريات" && inv.payment_method === "نقداً") {
        cashToSuppliers += inv.total || 0;
      }
      if (inv.pattern_type === "مشتريات" && inv.paid_amount > 0) {
        cashToSuppliers += inv.paid_amount || 0;
      }
    });

    vouchers.forEach((v) => {
      if (filters.date_from && v.date < filters.date_from) return;
      if (filters.date_to && v.date > filters.date_to) return;

      if (v.type === "سند قبض") {
        cashReceipts += v.amount || 0;
      }
      if (v.type === "سند دفع") {
        cashPayments += v.amount || 0;
      }
    });

    const operatingCashFlow = cashFromCustomers + cashReceipts - cashToSuppliers - cashPayments;
    const investingCashFlow = 0; // Simplified
    const financingCashFlow = 0; // Simplified
    const netChange = operatingCashFlow + investingCashFlow + financingCashFlow;

    setReport({
      cashFromCustomers,
      cashToSuppliers,
      cashReceipts,
      cashPayments,
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      netChange,
    });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="قائمة التدفقات النقدية" subtitle="تتبع حركة النقد الفعلية (وفق IAS 7)" />

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
            <div><Label className="text-xs">من تاريخ</Label><Input className="h-9" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></div>
            <div><Label className="text-xs">إلى تاريخ</Label><Input className="h-9" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></div>
            <Button size="sm" onClick={generateReport}><Search className="h-4 w-4 ml-1" /> إعداد القائمة</Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-6">
          {/* Operating Activities */}
          <Card>
            <CardHeader className="border-b bg-blue-50/50">
              <CardTitle className="text-base text-blue-800">1. التدفقات النقدية من الأنشطة التشغيلية</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <FlowLine label="(+) النقد المحصل من العملاء" value={report.cashFromCustomers} positive />
              <FlowLine label="(+) سندات القبض" value={report.cashReceipts} positive />
              <FlowLine label="(-) النقد المدفوع للموردين" value={-report.cashToSuppliers} />
              <FlowLine label="(-) سندات الدفع" value={-report.cashPayments} />
              <div className="flex justify-between pt-3 text-base font-bold border-t-2">
                <span>صافي التدفقات التشغيلية</span>
                <span className={report.operatingCashFlow >= 0 ? "text-green-600" : "text-red-500"}>
                  {report.operatingCashFlow.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Investing Activities */}
          <Card>
            <CardHeader className="border-b bg-purple-50/50">
              <CardTitle className="text-base text-purple-800">2. التدفقات النقدية من الأنشطة الاستثمارية</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد حركات استثمارية مسجلة</p>
              <div className="flex justify-between pt-3 text-base font-bold border-t-2">
                <span>صافي التدفقات الاستثمارية</span>
                <span>0</span>
              </div>
            </CardContent>
          </Card>

          {/* Financing Activities */}
          <Card>
            <CardHeader className="border-b bg-green-50/50">
              <CardTitle className="text-base text-green-800">3. التدفقات النقدية من الأنشطة التمويلية</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد حركات تمويلية مسجلة</p>
              <div className="flex justify-between pt-3 text-base font-bold border-t-2">
                <span>صافي التدفقات التمويلية</span>
                <span>0</span>
              </div>
            </CardContent>
          </Card>

          {/* Net Change */}
          <Card>
            <CardContent className="p-6">
              <div className={`flex items-center justify-between p-5 rounded-xl ${report.netChange >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <div className="flex items-center gap-3">
                  {report.netChange >= 0 ? <TrendingUp className="h-6 w-6 text-green-600" /> : <TrendingDown className="h-6 w-6 text-red-500" />}
                  <span className="text-lg font-bold">صافي التغير في النقدية</span>
                </div>
                <span className={`text-2xl font-bold ${report.netChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {report.netChange.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function FlowLine({ label, value, positive }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span>{label}</span>
      <span className={`font-medium ${value >= 0 ? "text-green-600" : "text-red-500"}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}