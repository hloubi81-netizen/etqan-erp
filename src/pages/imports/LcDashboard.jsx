import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  CreditCard, TrendingUp, TrendingDown, DollarSign, FileText,
  Clock, CheckCircle2, XCircle, BarChart3, PieChartIcon, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const STATUS_CONFIG = {
  "مفتوح": { color: "bg-blue-100 text-blue-700 border-blue-200", fill: "#3b82f6" },
  "مستخدم جزئياً": { color: "bg-amber-100 text-amber-700 border-amber-200", fill: "#f59e0b" },
  "مستخدم كلياً": { color: "bg-green-100 text-green-700 border-green-200", fill: "#22c55e" },
  "منتهي": { color: "bg-gray-100 text-gray-600 border-gray-200", fill: "#9ca3af" },
  "ملغي": { color: "bg-red-100 text-red-700 border-red-200", fill: "#ef4444" },
};

export default function LcDashboard() {
  const navigate = useNavigate();
  const [lcs, setLcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState("bar");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const data = await base44.entities.LetterOfCredit.list("-created_date", 500);
    setLcs(data);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const totalAmount = lcs.reduce((s, lc) => s + (lc.amount || 0), 0);
    const usedAmount = lcs.reduce((s, lc) => s + (lc.used_amount || 0), 0);
    const remainingAmount = totalAmount - usedAmount;
    const openCount = lcs.filter(lc => lc.status !== "منتهي" && lc.status !== "ملغي").length;
    return { totalAmount, usedAmount, remainingAmount, openCount, total: lcs.length };
  }, [lcs]);

  const barData = useMemo(() => {
    return lcs.map(lc => ({
      name: lc.lc_number,
      bank: lc.bank_name?.substring(0, 15) || "",
      "المبلغ الكلي": lc.amount || 0,
      "المستخدم": lc.used_amount || 0,
      "المتبقي": (lc.amount || 0) - (lc.used_amount || 0),
      status: lc.status,
      statusFill: STATUS_CONFIG[lc.status]?.fill || "#9ca3af",
    }));
  }, [lcs]);

  const pieData = useMemo(() => {
    const byStatus = {};
    lcs.forEach(lc => {
      const key = lc.status || "غير معروف";
      if (!byStatus[key]) byStatus[key] = { name: key, value: 0, fill: STATUS_CONFIG[lc.status]?.fill || "#9ca3af" };
      byStatus[key].value += lc.amount || 0;
    });
    return Object.values(byStatus);
  }, [lcs]);

  const bankData = useMemo(() => {
    const byBank = {};
    lcs.forEach(lc => {
      const bank = lc.bank_name || "بدون بنك";
      if (!byBank[bank]) byBank[bank] = { name: bank, value: 0, fill: "#6366f1" };
      byBank[bank].value += lc.amount || 0;
    });
    return Object.values(byBank).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [lcs]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3" dir="rtl">
        <p className="font-bold text-sm mb-1">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.fill || entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-mono font-semibold">{entry.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            لوحة تحكم الاعتمادات المستندية
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">الرقابة المالية للاعتمادات - المبالغ المخصصة والحالات</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={chartView === "bar" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartView("bar")}
            className="gap-1.5"
          >
            <BarChart3 className="h-4 w-4" />
            تحليل الاعتمادات
          </Button>
          <Button
            variant={chartView === "pie" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartView("pie")}
            className="gap-1.5"
          >
            <PieChartIcon className="h-4 w-4" />
            توزيع الحالات
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-blue-700">إجمالي الاعتمادات</p>
            </div>
            <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
            <p className="text-xs text-blue-600 mt-1">منها {stats.openCount} نشط</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <p className="text-xs text-green-700">إجمالي المبالغ</p>
            </div>
            <p className="text-lg font-bold text-green-800">{stats.totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-amber-700">المستخدم</p>
            </div>
            <p className="text-lg font-bold text-amber-800">{stats.usedAmount.toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-1">{stats.totalAmount > 0 ? Math.round((stats.usedAmount / stats.totalAmount) * 100) : 0}% من الإجمالي</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-purple-600" />
              <p className="text-xs text-purple-700">المتبقي</p>
            </div>
            <p className="text-lg font-bold text-purple-800">{stats.remainingAmount.toLocaleString()}</p>
            <p className="text-xs text-purple-600 mt-1">{stats.totalAmount > 0 ? Math.round((stats.remainingAmount / stats.totalAmount) * 100) : 0}% من الإجمالي</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <p className="text-xs text-indigo-700">متوسط المبلغ</p>
            </div>
            <p className="text-lg font-bold text-indigo-800">{stats.total > 0 ? Math.round(stats.totalAmount / stats.total).toLocaleString() : "0"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardContent className="p-6">
          {chartView === "bar" ? (
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                المبالغ المخصصة والمستخدمة لكل اعتماد
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-35}
                    textAnchor="end"
                    tick={{ fontSize: 11 }}
                    height={80}
                    interval={0}
                  />
                  <YAxis tickFormatter={v => v.toLocaleString()} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="المبلغ الكلي" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="المستخدم" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="المتبقي" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pie: by status */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  توزيع المبالغ حسب الحالة
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => v.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Pie: by bank */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  توزيع المبالغ حسب البنك
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={bankData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name?.substring(0, 12)} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {bankData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308"][idx % 8]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => v.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-right p-3 font-semibold">رقم الاعتماد</th>
                  <th className="text-right p-3 font-semibold">البنك</th>
                  <th className="text-right p-3 font-semibold">المبلغ الكلي</th>
                  <th className="text-right p-3 font-semibold">المستخدم</th>
                  <th className="text-right p-3 font-semibold">المتبقي</th>
                  <th className="text-right p-3 font-semibold">نسبة الاستخدام</th>
                  <th className="text-right p-3 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {lcs.map(lc => {
                  const used = lc.used_amount || 0;
                  const total = lc.amount || 0;
                  const remaining = total - used;
                  const percent = total > 0 ? Math.round((used / total) * 100) : 0;
                  const StatusIcon = STATUS_CONFIG[lc.status]?.color?.includes("blue") ? Clock :
                                     STATUS_CONFIG[lc.status]?.color?.includes("amber") ? TrendingUp :
                                     STATUS_CONFIG[lc.status]?.color?.includes("green") ? CheckCircle2 :
                                     STATUS_CONFIG[lc.status]?.color?.includes("red") ? XCircle : Clock;
                  return (
                    <tr
                      key={lc.id}
                      className="border-b hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => navigate("/imports/letters-of-credit")}
                    >
                      <td className="p-3 font-mono font-medium">{lc.lc_number}</td>
                      <td className="p-3 text-muted-foreground">{lc.bank_name}</td>
                      <td className="p-3 font-mono font-semibold">{total.toLocaleString()}</td>
                      <td className="p-3 font-mono text-amber-600">{used.toLocaleString()}</td>
                      <td className="p-3 font-mono text-green-600">{remaining.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                percent >= 100 ? "bg-green-500" : percent > 50 ? "bg-amber-500" : "bg-blue-500"
                              )}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono">{percent}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={cn("text-xs gap-1", STATUS_CONFIG[lc.status]?.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {lc.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer link */}
      <div className="text-center">
        <Button variant="outline" onClick={() => navigate("/imports/letters-of-credit")} className="gap-2">
          <CreditCard className="h-4 w-4" />
          الانتقال لإدارة الاعتمادات
        </Button>
      </div>
    </div>
  );
}