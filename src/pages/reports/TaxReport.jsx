import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download, FileText, Calculator, TrendingUp, ShoppingCart, AlertCircle, Printer, Percent } from "lucide-react";
import { Link } from "react-router-dom";

const COUNTRY_CONFIGS = {
  sa: {
    name: "المملكة العربية السعودية",
    taxName: "ضريبة القيمة المضافة (VAT)",
    taxRate: 15,
    currency: "ريال سعودي",
    currencyCode: "SAR",
    reportName: "الإقرار الضريبي — هيئة الزكاة والضريبة والجمارك",
    periods: ["شهري", "ربع سنوي"],
    showZakat: true,
    zakatRate: 2.5,
  },
  eg: {
    name: "مصر",
    taxName: "ضريبة القيمة المضافة (VAT)",
    taxRate: 14,
    currency: "جنيه مصري",
    currencyCode: "EGP",
    reportName: "الإقرار الضريبي — مصلحة الضرائب المصرية",
    periods: ["شهري", "ربع سنوي"],
    showZakat: false,
    stampTaxRate: 0.003,
  },
};

function KpiBox({ label, value, sub, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-4 border`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{typeof value === "number" ? value.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, value, indent = false, bold = false, separator = false, color = "" }) {
  return (
    <div className={`flex justify-between items-center py-2 ${separator ? "border-t-2 border-foreground/20 mt-1 pt-3" : "border-b border-border/40"} ${indent ? "pr-6" : ""}`}>
      <span className={`text-sm ${bold ? "font-bold" : "text-muted-foreground"}`}>{title}</span>
      <span className={`text-sm font-semibold tabular-nums ${color} ${bold ? "text-base" : ""}`}>
        {typeof value === "number" ? value.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
      </span>
    </div>
  );
}

export default function TaxReport() {
  const [invoices, setInvoices] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("sa");
  const [periodType, setPeriodType] = useState("ربع سنوي");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const cfg = COUNTRY_CONFIGS[country];

  useEffect(() => {
    Promise.all([
      base44.entities.Invoice.list("-date", 1000),
      base44.entities.TaxRate.filter({ is_active: true }),
    ]).then(([data, rates]) => {
      setInvoices(data);
      setTaxRates(rates);
      setLoading(false);
    });
  }, []);

  // فلترة الفواتير المرحّلة فقط
  const filtered = useMemo(() =>
    invoices.filter(inv => inv.date >= dateFrom && inv.date <= dateTo && inv.status === "مرحّلة"),
    [invoices, dateFrom, dateTo]);

  const sales = filtered.filter(i => i.pattern_type === "مبيعات");
  const purchases = filtered.filter(i => i.pattern_type === "مشتريات");
  const salesReturn = filtered.filter(i => i.pattern_type === "مرتجع مبيعات");
  const purchasesReturn = filtered.filter(i => i.pattern_type === "مرتجع مشتريات");

  const sum = (arr, key) => arr.reduce((s, i) => s + (i[key] || 0), 0);

  // المبيعات
  const salesSubtotal = sum(sales, "subtotal");
  const salesDiscount = sum(sales, "discount_value");
  const salesTaxable = salesSubtotal - salesDiscount;
  const salesTax = sum(sales, "tax_amount");
  const salesTotal = sum(sales, "total");

  // مرتجعات المبيعات
  const salesReturnSubtotal = sum(salesReturn, "subtotal");
  const salesReturnTax = sum(salesReturn, "tax_amount");

  // صافي المبيعات الخاضعة
  const netSalesTaxable = salesTaxable - salesReturnSubtotal;
  const netSalesTax = salesTax - salesReturnTax;

  // المشتريات
  const purchasesSubtotal = sum(purchases, "subtotal");
  const purchasesDiscount = sum(purchases, "discount_value");
  const purchasesTaxable = purchasesSubtotal - purchasesDiscount;
  const purchasesTax = sum(purchases, "tax_amount");

  // مرتجعات المشتريات
  const purchasesReturnSubtotal = sum(purchasesReturn, "subtotal");
  const purchasesReturnTax = sum(purchasesReturn, "tax_amount");

  // صافي المشتريات الخاضعة
  const netPurchasesTaxable = purchasesTaxable - purchasesReturnSubtotal;
  const netPurchasesTax = purchasesTax - purchasesReturnTax;

  // الضريبة المستحقة الصافية (ضريبة المخرجات - ضريبة المدخلات)
  const taxDue = netSalesTax - netPurchasesTax;
  const isRefund = taxDue < 0;

  // الزكاة (سعودي)
  const netProfit = salesTotal - sum(purchases, "total");
  const zakatBase = netProfit > 0 ? netProfit : 0;
  const zakatAmount = cfg.showZakat ? (zakatBase * cfg.zakatRate) / 100 : 0;

  // ضريبة الدمغة (مصري)
  const stampTax = country === "eg" ? salesTotal * (cfg.stampTaxRate || 0) : 0;

  // بيانات الرسم البياني الشهري
  const monthlyData = useMemo(() => {
    const map = {};
    filtered.forEach(inv => {
      const month = inv.date?.slice(0, 7);
      if (!month) return;
      if (!map[month]) map[month] = { month, salesTax: 0, purchasesTax: 0, netTax: 0, salesBase: 0, purchasesBase: 0 };
      if (inv.pattern_type === "مبيعات") { map[month].salesTax += inv.tax_amount || 0; map[month].salesBase += inv.subtotal || 0; }
      if (inv.pattern_type === "مشتريات") { map[month].purchasesTax += inv.tax_amount || 0; map[month].purchasesBase += inv.subtotal || 0; }
    });
    return Object.values(map).map(v => ({ ...v, netTax: v.salesTax - v.purchasesTax })).sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  const printReport = () => window.print();

  const exportCSV = () => {
    const rows = [
      ["التقرير الضريبي", cfg.reportName],
      ["الفترة", `${dateFrom} إلى ${dateTo}`],
      ["الدولة", cfg.name],
      ["", ""],
      ["البيان", "القيمة"],
      ["صافي المبيعات الخاضعة", netSalesTaxable.toFixed(2)],
      ["ضريبة المبيعات (مخرجات)", netSalesTax.toFixed(2)],
      ["صافي المشتريات الخاضعة", netPurchasesTaxable.toFixed(2)],
      ["ضريبة المشتريات (مدخلات)", netPurchasesTax.toFixed(2)],
      ["الضريبة المستحقة الصافية", taxDue.toFixed(2)],
      isRefund ? ["ملاحظة", "مبلغ الاسترداد"] : ["ملاحظة", "مبلغ للسداد"],
      cfg.showZakat ? ["الزكاة المستحقة", zakatAmount.toFixed(2)] : [],
    ].filter(r => r.length > 0);
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `tax-report-${dateFrom}-${dateTo}.csv`; a.click();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 print:p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> التقرير الضريبي الشامل</h1>
          <p className="text-sm text-muted-foreground">{cfg.reportName}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Link to="/tax-rates">
            <Button variant="outline" size="sm" className="gap-1.5"><Percent className="h-4 w-4" /> إدارة النسب الضريبية</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5"><Download className="h-4 w-4" /> تصدير CSV</Button>
          <Button variant="outline" size="sm" onClick={printReport} className="gap-1.5"><Printer className="h-4 w-4" /> طباعة</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الدولة / النظام الضريبي</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sa">🇸🇦 المملكة العربية السعودية (15%)</SelectItem>
                  <SelectItem value="eg">🇪🇬 مصر (14%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">نوع الفترة</label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="شهري">شهري</SelectItem>
                  <SelectItem value="ربع سنوي">ربع سنوي</SelectItem>
                  <SelectItem value="سنوي">سنوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">من تاريخ</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {[
              { label: "الشهر الحالي", action: () => { const n = new Date(); setDateFrom(n.toISOString().slice(0,7)+"-01"); setDateTo(n.toISOString().split("T")[0]); } },
              { label: "الربع الأول Q1", action: () => { const y = new Date().getFullYear(); setDateFrom(`${y}-01-01`); setDateTo(`${y}-03-31`); } },
              { label: "الربع الثاني Q2", action: () => { const y = new Date().getFullYear(); setDateFrom(`${y}-04-01`); setDateTo(`${y}-06-30`); } },
              { label: "الربع الثالث Q3", action: () => { const y = new Date().getFullYear(); setDateFrom(`${y}-07-01`); setDateTo(`${y}-09-30`); } },
              { label: "الربع الرابع Q4", action: () => { const y = new Date().getFullYear(); setDateFrom(`${y}-10-01`); setDateTo(`${y}-12-31`); } },
              { label: "السنة كاملة", action: () => { const y = new Date().getFullYear(); setDateFrom(`${y}-01-01`); setDateTo(`${y}-12-31`); } },
            ].map((btn, i) => (
              <button key={i} onClick={btn.action} className="text-xs px-3 py-1 rounded-full border hover:bg-muted transition-colors">{btn.label}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiBox label="ضريبة المبيعات (مخرجات)" value={netSalesTax} color="text-blue-600" bg="bg-blue-50 border-blue-100" sub={`وعاء: ${netSalesTaxable.toLocaleString("ar-SA", {maximumFractionDigits:0})}`} />
        <KpiBox label="ضريبة المشتريات (مدخلات)" value={netPurchasesTax} color="text-orange-600" bg="bg-orange-50 border-orange-100" sub={`وعاء: ${netPurchasesTaxable.toLocaleString("ar-SA", {maximumFractionDigits:0})}`} />
        <KpiBox
          label={isRefund ? "مبلغ الاسترداد الضريبي" : "الضريبة المستحقة للسداد"}
          value={Math.abs(taxDue)}
          color={isRefund ? "text-green-600" : "text-red-600"}
          bg={isRefund ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}
          sub={isRefund ? "مطالبة باسترداد" : `نسبة ${cfg.taxRate}%`}
        />
        {cfg.showZakat
          ? <KpiBox label="الزكاة المستحقة" value={zakatAmount} color="text-purple-600" bg="bg-purple-50 border-purple-100" sub="2.5% من الأرباح" />
          : <KpiBox label="ضريبة الدمغة" value={stampTax} color="text-purple-600" bg="bg-purple-50 border-purple-100" sub="0.3% من الإيرادات" />
        }
      </div>

      <Tabs defaultValue="declaration" dir="rtl">
        <TabsList className="print:hidden">
          <TabsTrigger value="declaration" className="gap-1.5"><FileText className="h-4 w-4" /> الإقرار الضريبي</TabsTrigger>
          <TabsTrigger value="sales" className="gap-1.5"><TrendingUp className="h-4 w-4" /> تفاصيل المبيعات</TabsTrigger>
          <TabsTrigger value="purchases" className="gap-1.5"><ShoppingCart className="h-4 w-4" /> تفاصيل المشتريات</TabsTrigger>
          <TabsTrigger value="chart" className="gap-1.5"><Calculator className="h-4 w-4" /> التحليل الشهري</TabsTrigger>
          <TabsTrigger value="byrate" className="gap-1.5"><Percent className="h-4 w-4" /> تحليل حسب النسبة</TabsTrigger>
        </TabsList>

        {/* إقرار ضريبي رسمي */}
        <TabsContent value="declaration" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* نموذج الإقرار */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="text-center space-y-1">
                  <p className="text-base font-bold">{cfg.reportName}</p>
                  <p className="text-xs text-muted-foreground">الفترة الضريبية: {dateFrom} — {dateTo}</p>
                  <p className="text-xs text-muted-foreground">نسبة الضريبة: {cfg.taxRate}% | العملة: {cfg.currency}</p>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-1">
                <p className="text-xs font-bold text-blue-700 mb-2">أ. ضريبة المخرجات (المبيعات)</p>
                <Section title="إجمالي المبيعات قبل الضريبة" value={salesSubtotal} indent />
                <Section title="الخصومات على المبيعات" value={salesDiscount} indent color="text-red-500" />
                <Section title="مرتجعات المبيعات" value={salesReturnSubtotal} indent color="text-red-500" />
                <Section title="صافي الوعاء الخاضع للمبيعات" value={netSalesTaxable} indent bold />
                <Section title={`ضريبة المبيعات (${cfg.taxRate}%)`} value={salesTax} indent color="text-blue-700" />
                <Section title="ضريبة مرتجعات المبيعات" value={salesReturnTax} indent color="text-red-500" />
                <Section title="صافي ضريبة المخرجات" value={netSalesTax} bold color="text-blue-700" separator />

                <p className="text-xs font-bold text-orange-700 mb-2 mt-3">ب. ضريبة المدخلات (المشتريات)</p>
                <Section title="إجمالي المشتريات قبل الضريبة" value={purchasesSubtotal} indent />
                <Section title="الخصومات على المشتريات" value={purchasesDiscount} indent color="text-red-500" />
                <Section title="مرتجعات المشتريات" value={purchasesReturnSubtotal} indent color="text-red-500" />
                <Section title="صافي الوعاء الخاضع للمشتريات" value={netPurchasesTaxable} indent bold />
                <Section title={`ضريبة المشتريات (${cfg.taxRate}%)`} value={purchasesTax} indent color="text-orange-700" />
                <Section title="ضريبة مرتجعات المشتريات" value={purchasesReturnTax} indent color="text-red-500" />
                <Section title="صافي ضريبة المدخلات" value={netPurchasesTax} bold color="text-orange-700" separator />

                <div className={`mt-4 p-4 rounded-xl border-2 text-center ${isRefund ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                  <p className="text-xs text-muted-foreground mb-1">{isRefund ? "✅ مبلغ الاسترداد الضريبي" : "⚠️ الضريبة المستحقة للسداد"}</p>
                  <p className={`text-3xl font-bold ${isRefund ? "text-green-700" : "text-red-700"}`}>
                    {Math.abs(taxDue).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{cfg.currency}</p>
                </div>

                {cfg.showZakat && zakatAmount > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-purple-700">الزكاة المستحقة (2.5%)</span>
                      <span className="text-lg font-bold text-purple-700">{zakatAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p className="text-xs text-purple-500 mt-0.5">محسوبة على صافي الربح: {zakatBase.toLocaleString("ar-SA", { maximumFractionDigits: 0 })}</p>
                  </div>
                )}

                {country === "eg" && stampTax > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-purple-700">ضريبة الدمغة (0.3%)</span>
                      <span className="text-lg font-bold text-purple-700">{stampTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ملخص الفواتير */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">ملخص الفواتير بالفترة</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "فواتير المبيعات", count: sales.length, amount: salesTotal, color: "text-blue-600", bg: "bg-blue-50" },
                      { label: "فواتير المشتريات", count: purchases.length, amount: sum(purchases, "total"), color: "text-orange-600", bg: "bg-orange-50" },
                      { label: "مرتجعات المبيعات", count: salesReturn.length, amount: salesReturnSubtotal, color: "text-red-500", bg: "bg-red-50" },
                      { label: "مرتجعات المشتريات", count: purchasesReturn.length, amount: purchasesReturnSubtotal, color: "text-amber-600", bg: "bg-amber-50" },
                    ].map((item, i) => (
                      <div key={i} className={`${item.bg} rounded-lg p-3 flex items-center justify-between`}>
                        <div>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className={`text-lg font-bold ${item.color}`}>{item.amount.toLocaleString("ar-SA", { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full bg-white ${item.color} font-semibold`}>{item.count} فاتورة</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* تنبيهات */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-orange-500" /> ملاحظات وتنبيهات</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {filtered.filter(i => !i.tax_amount && (i.subtotal || 0) > 0).length > 0 && (
                    <div className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded-lg">
                      ⚠️ يوجد {filtered.filter(i => !i.tax_amount && (i.subtotal || 0) > 0).length} فاتورة بدون ضريبة مسجلة
                    </div>
                  )}
                  {isRefund && (
                    <div className="text-xs bg-green-50 border border-green-200 text-green-800 p-2 rounded-lg">
                      ✅ يحق لك المطالبة باسترداد ضريبي بقيمة {Math.abs(taxDue).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} {cfg.currency}
                    </div>
                  )}
                  {country === "sa" && (
                    <div className="text-xs bg-blue-50 border border-blue-200 text-blue-800 p-2 rounded-lg">
                      📋 يجب تقديم الإقرار للهيئة العامة للزكاة والضريبة والجمارك (ZATCA) خلال الموعد المحدد
                    </div>
                  )}
                  {country === "eg" && (
                    <div className="text-xs bg-blue-50 border border-blue-200 text-blue-800 p-2 rounded-lg">
                      📋 يجب تقديم الإقرار لمصلحة الضرائب المصرية في اليوم الأخير من الشهر التالي للفترة الضريبية
                    </div>
                  )}
                  {filtered.length === 0 && (
                    <div className="text-xs bg-gray-50 border border-gray-200 text-gray-600 p-2 rounded-lg">
                      لا توجد فواتير مرحّلة في الفترة المحددة
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* تفاصيل المبيعات */}
        <TabsContent value="sales" className="mt-4">
          <InvoiceDetailTable invoices={[...sales, ...salesReturn]} title="فواتير المبيعات ومرتجعاتها" taxRate={cfg.taxRate} />
        </TabsContent>

        {/* تفاصيل المشتريات */}
        <TabsContent value="purchases" className="mt-4">
          <InvoiceDetailTable invoices={[...purchases, ...purchasesReturn]} title="فواتير المشتريات ومرتجعاتها" taxRate={cfg.taxRate} />
        </TabsContent>

        {/* التحليل الشهري */}
        <TabsContent value="chart" className="mt-4">
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">الضريبة الشهرية: مخرجات vs مدخلات</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData} margin={{ right: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n) => [v.toLocaleString("ar-SA", { maximumFractionDigits: 2 }), n]} />
                    <Bar dataKey="salesTax" name="ضريبة المبيعات" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="purchasesTax" name="ضريبة المشتريات" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="netTax" name="صافي الضريبة" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">جدول الضريبة الشهري</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium">الشهر</th>
                      <th className="px-4 py-3 text-right font-medium">وعاء المبيعات</th>
                      <th className="px-4 py-3 text-right font-medium">ضريبة المبيعات</th>
                      <th className="px-4 py-3 text-right font-medium">وعاء المشتريات</th>
                      <th className="px-4 py-3 text-right font-medium">ضريبة المشتريات</th>
                      <th className="px-4 py-3 text-right font-medium">صافي الضريبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد بيانات</td></tr>
                    ) : monthlyData.map((row, i) => (
                      <tr key={i} className="border-t hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-semibold">{row.month}</td>
                        <td className="px-4 py-3">{row.salesBase.toLocaleString("ar-SA", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-blue-700 font-medium">{row.salesTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3">{row.purchasesBase.toLocaleString("ar-SA", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-orange-700 font-medium">{row.purchasesTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                        <td className={`px-4 py-3 font-bold ${row.netTax >= 0 ? "text-red-600" : "text-green-600"}`}>
                          {row.netTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                          {row.netTax < 0 && <span className="text-xs mr-1 text-green-600">(استرداد)</span>}
                        </td>
                      </tr>
                    ))}
                    {monthlyData.length > 0 && (
                      <tr className="border-t-2 bg-muted/30 font-bold">
                        <td className="px-4 py-3">الإجمالي</td>
                        <td className="px-4 py-3">{monthlyData.reduce((s, r) => s + r.salesBase, 0).toLocaleString("ar-SA", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-blue-700">{netSalesTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3">{monthlyData.reduce((s, r) => s + r.purchasesBase, 0).toLocaleString("ar-SA", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-orange-700">{netPurchasesTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                        <td className={`px-4 py-3 text-lg ${taxDue >= 0 ? "text-red-600" : "text-green-600"}`}>{taxDue.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        {/* تحليل حسب النسبة الضريبية */}
        <TabsContent value="byrate" className="mt-4">
          <TaxByRatePanel taxRates={taxRates} filtered={filtered} cfg={cfg} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tax By Rate Panel ────────────────────────────────────────────────────────
function TaxByRatePanel({ taxRates, filtered, cfg }) {
  // تجميع الفواتير حسب مبلغ الضريبة المسجل لمحاولة ربطها بالنسبة
  const ratesData = useMemo(() => {
    if (taxRates.length === 0) {
      // إذا لم تُعرَّف نسب، نعرض ملخصاً عاماً
      const sales = filtered.filter(i => i.pattern_type === "مبيعات");
      const purchases = filtered.filter(i => i.pattern_type === "مشتريات");
      const salesBase = sales.reduce((s, i) => s + ((i.subtotal || 0) - (i.discount_value || 0)), 0);
      const purchasesBase = purchases.reduce((s, i) => s + ((i.subtotal || 0) - (i.discount_value || 0)), 0);
      const salesTax = sales.reduce((s, i) => s + (i.tax_amount || 0), 0);
      const purchasesTax = purchases.reduce((s, i) => s + (i.tax_amount || 0), 0);
      return [{
        name: `الضريبة (${cfg.taxRate}%)`,
        rate: cfg.taxRate,
        salesCount: sales.length,
        purchasesCount: purchases.length,
        salesBase, purchasesBase, salesTax, purchasesTax,
        netTax: salesTax - purchasesTax,
      }];
    }

    return taxRates.map(tr => {
      // نحاول مطابقة الفواتير بنسبة الضريبة المحسوبة
      const rateDecimal = tr.rate / 100;
      const matchedSales = filtered.filter(i => {
        if (i.pattern_type !== "مبيعات") return false;
        if (!i.tax_amount || !i.subtotal) return false;
        const base = (i.subtotal - (i.discount_value || 0));
        if (base <= 0) return false;
        const calcRate = i.tax_amount / base;
        return Math.abs(calcRate - rateDecimal) < 0.005;
      });
      const matchedPurchases = filtered.filter(i => {
        if (i.pattern_type !== "مشتريات") return false;
        if (!i.tax_amount || !i.subtotal) return false;
        const base = (i.subtotal - (i.discount_value || 0));
        if (base <= 0) return false;
        const calcRate = i.tax_amount / base;
        return Math.abs(calcRate - rateDecimal) < 0.005;
      });
      const salesBase = matchedSales.reduce((s, i) => s + ((i.subtotal || 0) - (i.discount_value || 0)), 0);
      const purchasesBase = matchedPurchases.reduce((s, i) => s + ((i.subtotal || 0) - (i.discount_value || 0)), 0);
      const salesTax = matchedSales.reduce((s, i) => s + (i.tax_amount || 0), 0);
      const purchasesTax = matchedPurchases.reduce((s, i) => s + (i.tax_amount || 0), 0);
      return {
        name: tr.name,
        rate: tr.rate,
        type: tr.type,
        salesCount: matchedSales.length,
        purchasesCount: matchedPurchases.length,
        salesBase, purchasesBase, salesTax, purchasesTax,
        netTax: salesTax - purchasesTax,
      };
    }).filter(r => r.salesCount > 0 || r.purchasesCount > 0);
  }, [taxRates, filtered, cfg]);

  const totalNetTax = ratesData.reduce((s, r) => s + r.netTax, 0);

  return (
    <div className="space-y-4">
      {taxRates.length === 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>لم تُعرَّف نسب ضريبية بعد. <Link to="/tax-rates" className="underline font-semibold">انقر هنا لإضافة نسب ضريبية</Link> لرؤية تحليل مفصّل.</span>
        </div>
      )}

      {/* Chart */}
      {ratesData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">الضريبة المستحقة حسب النسبة</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ratesData} margin={{ right: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v.toLocaleString("ar-SA", { minimumFractionDigits: 2 }), ""]} />
                <Bar dataKey="salesTax" name="ضريبة المبيعات" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="purchasesTax" name="ضريبة المشتريات" fill="#f97316" radius={[4,4,0,0]} />
                <Bar dataKey="netTax" name="صافي الضريبة" fill="#8b5cf6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">تفصيل الضريبة حسب كل نسبة ({ratesData.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right font-medium">النسبة الضريبية</th>
                <th className="px-4 py-3 text-right font-medium">النسبة %</th>
                <th className="px-4 py-3 text-right font-medium">وعاء المبيعات</th>
                <th className="px-4 py-3 text-right font-medium">ضريبة المبيعات</th>
                <th className="px-4 py-3 text-right font-medium">وعاء المشتريات</th>
                <th className="px-4 py-3 text-right font-medium">ضريبة المشتريات</th>
                <th className="px-4 py-3 text-right font-medium">صافي الضريبة</th>
              </tr>
            </thead>
            <tbody>
              {ratesData.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد بيانات مطابقة</td></tr>
              ) : ratesData.map((r, i) => (
                <tr key={i} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold">{r.name}</td>
                  <td className="px-4 py-3 font-bold text-primary">{r.rate}%</td>
                  <td className="px-4 py-3">{r.salesBase.toLocaleString("ar-SA", { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-blue-700 font-medium">{r.salesTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3">{r.purchasesBase.toLocaleString("ar-SA", { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-orange-700 font-medium">{r.purchasesTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                  <td className={`px-4 py-3 font-bold ${r.netTax >= 0 ? "text-red-600" : "text-green-600"}`}>
                    {r.netTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {ratesData.length > 1 && (
                <tr className="border-t-2 bg-muted/30 font-bold">
                  <td className="px-4 py-3" colSpan={2}>الإجمالي</td>
                  <td className="px-4 py-3">{ratesData.reduce((s,r)=>s+r.salesBase,0).toLocaleString("ar-SA",{maximumFractionDigits:0})}</td>
                  <td className="px-4 py-3 text-blue-700">{ratesData.reduce((s,r)=>s+r.salesTax,0).toLocaleString("ar-SA",{minimumFractionDigits:2})}</td>
                  <td className="px-4 py-3">{ratesData.reduce((s,r)=>s+r.purchasesBase,0).toLocaleString("ar-SA",{maximumFractionDigits:0})}</td>
                  <td className="px-4 py-3 text-orange-700">{ratesData.reduce((s,r)=>s+r.purchasesTax,0).toLocaleString("ar-SA",{minimumFractionDigits:2})}</td>
                  <td className={`px-4 py-3 text-base ${totalNetTax >= 0 ? "text-red-700" : "text-green-700"}`}>{totalNetTax.toLocaleString("ar-SA",{minimumFractionDigits:2})}</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceDetailTable({ invoices, title, taxRate }) {
  if (invoices.length === 0) return <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد فواتير في هذه الفترة</CardContent></Card>;
  const totalSubtotal = invoices.reduce((s, i) => s + (i.subtotal || 0), 0);
  const totalDiscount = invoices.reduce((s, i) => s + (i.discount_value || 0), 0);
  const totalTax = invoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalTotal = invoices.reduce((s, i) => s + (i.total || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title} ({invoices.length} فاتورة)</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right font-medium">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">النوع</th>
                <th className="px-4 py-3 text-right font-medium">العميل/المورد</th>
                <th className="px-4 py-3 text-right font-medium">المجموع قبل الضريبة</th>
                <th className="px-4 py-3 text-right font-medium">الخصم</th>
                <th className="px-4 py-3 text-right font-medium">الوعاء الخاضع</th>
                <th className="px-4 py-3 text-right font-medium">الضريبة</th>
                <th className="px-4 py-3 text-right font-medium">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => {
                const taxable = (inv.subtotal || 0) - (inv.discount_value || 0);
                const isReturn = inv.pattern_type?.includes("مرتجع");
                return (
                  <tr key={i} className={`border-t hover:bg-muted/20 ${isReturn ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-2.5 font-mono font-semibold">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{inv.date}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isReturn ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{inv.pattern_type}</span>
                    </td>
                    <td className="px-4 py-2.5">{inv.client_name || "—"}</td>
                    <td className="px-4 py-2.5">{(inv.subtotal || 0).toLocaleString("ar-SA", { maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 text-red-500">{(inv.discount_value || 0) > 0 ? `-${(inv.discount_value || 0).toLocaleString("ar-SA", { maximumFractionDigits: 2 })}` : "—"}</td>
                    <td className="px-4 py-2.5">{taxable.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 font-medium text-primary">{(inv.tax_amount || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 font-bold">{(inv.total || 0).toLocaleString("ar-SA", { maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 bg-muted/30 font-bold">
                <td className="px-4 py-3" colSpan={4}>الإجمالي</td>
                <td className="px-4 py-3">{totalSubtotal.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-red-500">{totalDiscount > 0 ? `-${totalDiscount.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}` : "—"}</td>
                <td className="px-4 py-3">{(totalSubtotal - totalDiscount).toLocaleString("ar-SA", { maximumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-primary text-base">{totalTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-base">{totalTotal.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}