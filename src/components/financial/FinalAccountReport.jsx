import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { loadFinalAccountData, buildFinalAccount } from "@/utils/finalAccountsEngine";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FolderTree, TrendingUp, TrendingDown } from "lucide-react";

export default function FinalAccountReport({
  finalAccountType,
  title,
  subtitle,
  resultLabelProfit,
  resultLabelLoss,
}) {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ date_from: "", date_to: "" });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const d = await loadFinalAccountData();
    setData(d);
    setLoading(false);
  }

  function generate() {
    setReport(
      buildFinalAccount(data, finalAccountType, filters.date_from, filters.date_to)
    );
  }

  function fmt(n) {
    return (n || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isProfit = report && report.balance >= 0;
  const debitGrand = report ? report.debitTotal + (isProfit ? report.balance : 0) : 0;
  const creditGrand = report ? report.creditTotal + (!isProfit ? Math.abs(report.balance) : 0) : 0;
  const empty = report && report.debitSide.length === 0 && report.creditSide.length === 0;

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <Label className="text-xs">من تاريخ</Label>
              <Input
                className="h-9"
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">إلى تاريخ</Label>
              <Input
                className="h-9"
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
            <Button size="sm" onClick={generate}>
              <Search className="h-4 w-4 ml-1" /> إعداد الحساب
            </Button>
            <Link to="/accounts">
              <Button size="sm" variant="outline">
                <FolderTree className="h-4 w-4 ml-1" /> ربط الحسابات في الدليل
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader className="text-center border-b">
            <CardTitle className="text-xl">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filters.date_from ? `من ${filters.date_from}` : ""}{" "}
              {filters.date_to ? `إلى ${filters.date_to}` : ""}
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* الجانب المدين */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-bold text-sm text-center">
                  الجانب المدين
                </div>
                <div className="divide-y">
                  {report.debitSide.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      لا توجد حسابات
                    </div>
                  )}
                  {report.debitSide.map((item) => (
                    <Link
                      key={item.id}
                      to="/accounts"
                      className="flex justify-between items-center px-4 py-2 hover:bg-muted/50 text-sm group"
                    >
                      <span className="flex items-center gap-2">
                        <FolderTree className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        <span className="text-muted-foreground text-xs">{item.account_number}</span>
                        {item.name}
                      </span>
                      <span className="font-medium">{fmt(item.amount)}</span>
                    </Link>
                  ))}
                  <div className="flex justify-between px-4 py-2 bg-muted/30 font-bold text-sm border-t-2">
                    <span>الإجمالي المدين</span>
                    <span>{fmt(report.debitTotal)}</span>
                  </div>
                  {isProfit && (
                    <div className="flex justify-between px-4 py-2 bg-emerald-50 font-bold text-sm text-emerald-700">
                      <span>{resultLabelProfit}</span>
                      <span>{fmt(report.balance)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-2 bg-primary/10 font-bold text-sm">
                    <span>الإجمالي</span>
                    <span>{fmt(debitGrand)}</span>
                  </div>
                </div>
              </div>

              {/* الجانب الدائن */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-bold text-sm text-center">
                  الجانب الدائن
                </div>
                <div className="divide-y">
                  {report.creditSide.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      لا توجد حسابات
                    </div>
                  )}
                  {report.creditSide.map((item) => (
                    <Link
                      key={item.id}
                      to="/accounts"
                      className="flex justify-between items-center px-4 py-2 hover:bg-muted/50 text-sm group"
                    >
                      <span className="flex items-center gap-2">
                        <FolderTree className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        <span className="text-muted-foreground text-xs">{item.account_number}</span>
                        {item.name}
                      </span>
                      <span className="font-medium">{fmt(item.amount)}</span>
                    </Link>
                  ))}
                  <div className="flex justify-between px-4 py-2 bg-muted/30 font-bold text-sm border-t-2">
                    <span>الإجمالي الدائن</span>
                    <span>{fmt(report.creditTotal)}</span>
                  </div>
                  {!isProfit && (
                    <div className="flex justify-between px-4 py-2 bg-red-50 font-bold text-sm text-red-700">
                      <span>{resultLabelLoss}</span>
                      <span>{fmt(Math.abs(report.balance))}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-2 bg-primary/10 font-bold text-sm">
                    <span>الإجمالي</span>
                    <span>{fmt(creditGrand)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* النتيجة النهائية */}
            <div className="mt-6 flex items-center justify-between p-4 rounded-xl bg-primary/5">
              <div className="flex items-center gap-2">
                {isProfit ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                <span className="text-lg font-bold">
                  {isProfit ? resultLabelProfit : resultLabelLoss}
                </span>
              </div>
              <span
                className={`text-xl font-bold ${
                  isProfit ? "text-green-600" : "text-red-500"
                }`}
              >
                {fmt(Math.abs(report.balance))}
              </span>
            </div>

            {empty && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                لا توجد حركات على حسابات مُصنّفة كـ «{finalAccountType}» في الدليل المحاسبي ضمن
                الفترة المحددة. راجع تصنيف الحسابات من{" "}
                <Link to="/accounts" className="text-primary underline">
                  الدليل المحاسبي
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}