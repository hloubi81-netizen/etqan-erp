import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckCircle2, XCircle, Truck, Calendar, Timer, FileDown, Filter, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const STATUS_CONFIG = {
  "قيد الانتظار": { color: "bg-yellow-100 text-yellow-800", icon: Clock },
  "موافق عليه": { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  "مرفوض": { color: "bg-red-100 text-red-800", icon: XCircle },
  "تم الصرف": { color: "bg-blue-100 text-blue-800", icon: Truck },
};

function msToDuration(ms) {
  if (ms <= 0) return "-";
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} دقيقة`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return `${hours} ساعة ${minutes > 0 ? `و ${minutes} دقيقة` : ""}`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} يوم ${remainingHours > 0 ? `و ${remainingHours} ساعة` : ""}`;
}

export default function PurchaseRequestTimeline() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("duration");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.PurchaseRequest.list("-created_date", 300);
    setRequests(data || []);
    setLoading(false);
  };

  const processedRequests = useMemo(() => {
    let list = requests.map((r) => {
      const submitted = r.submitted_at ? new Date(r.submitted_at) : null;
      const received = r.received_at ? new Date(r.received_at) : null;
      const durationMs = submitted && received ? received.getTime() - submitted.getTime() : null;
      return { ...r, submitted, received, durationMs, durationText: durationMs ? msToDuration(durationMs) : "-" };
    });

    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (sortBy === "duration") {
      list.sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0));
    } else if (sortBy === "newest") {
      list.sort((a, b) => (b.submitted?.getTime() || 0) - (a.submitted?.getTime() || 0));
    } else if (sortBy === "oldest") {
      list.sort((a, b) => (a.submitted?.getTime() || 0) - (b.submitted?.getTime() || 0));
    }

    return list;
  }, [requests, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const dispensed = processedRequests.filter((r) => r.durationMs && r.durationMs > 0);
    const total = dispensed.length;
    if (!total) return { avg: "-", max: "-", min: "-", totalDispensed: 0 };

    const durations = dispensed.map((r) => r.durationMs);
    const avg = durations.reduce((a, b) => a + b, 0) / total;
    const max = Math.max(...durations);
    const min = Math.min(...durations);

    return {
      avg: msToDuration(avg),
      max: msToDuration(max),
      min: msToDuration(min),
      totalDispensed: total,
    };
  }, [processedRequests]);

  const exportToExcel = () => {
    const rows = processedRequests.map((r) => ({
      "رقم الطلب": r.request_number,
      "التاريخ": r.date,
      "تاريخ ووقت التقديم": r.submitted_at ? new Date(r.submitted_at).toLocaleString("ar-EG") : "-",
      "تاريخ التسليم المرجو": r.delivery_date || "-",
      "تاريخ ووقت الاستلام": r.received_at ? new Date(r.received_at).toLocaleString("ar-EG") : "-",
      "الوقت المستغرق": r.durationText,
      "الحالة": r.status,
      "الموظف": r.employee_name,
      "القسم": r.department || "-",
      "الفرع": r.branch_name || "-",
      "عدد الأصناف": r.items?.length || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 18 }, { wch: 12 }, { wch: 24 }, { wch: 14 },
      { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
      { wch: 16 }, { wch: 16 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الوقت المستغرق");
    XLSX.writeFile(wb, "تقرير_الوقت_المستغرق_للطلبات.xlsx");
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تحليل زمن دورة الطلب</h1>
          <p className="text-sm text-gray-500 mt-1">الوقت المستغرق من تقديم طلب الشراء حتى استلام الأصناف</p>
        </div>
        <Button variant="outline" onClick={exportToExcel} className="gap-2">
          <FileDown className="h-4 w-4" /> تصدير Excel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "متوسط الوقت", value: stats.avg, icon: Timer, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "أطول مدة", value: stats.max, icon: TrendingUp, color: "text-red-600", bg: "bg-red-50" },
          { label: "أقصر مدة", value: stats.min, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "طلبات مكتملة", value: stats.totalDispensed, icon: Truck, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((s, i) => (
          <Card key={i} className={cn("border-0", s.bg)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-white", s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 ml-1" />
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="تم الصرف">تم الصرف</SelectItem>
            <SelectItem value="موافق عليه">موافق عليه</SelectItem>
            <SelectItem value="قيد الانتظار">قيد الانتظار</SelectItem>
            <SelectItem value="مرفوض">مرفوض</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الترتيب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="duration">الأطول وقتاً</SelectItem>
            <SelectItem value="newest">الأحدث</SelectItem>
            <SelectItem value="oldest">الأقدم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : processedRequests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Timer className="h-12 w-12 mx-auto mb-3" />
          <p>لا توجد طلبات مطابقة</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600">
                  <th className="text-right p-3 font-semibold">رقم الطلب</th>
                  <th className="text-right p-3 font-semibold">الحالة</th>
                  <th className="text-right p-3 font-semibold">تاريخ التقديم</th>
                  <th className="text-right p-3 font-semibold">تاريخ الاستلام</th>
                  <th className="text-right p-3 font-semibold">الوقت المستغرق</th>
                  <th className="text-right p-3 font-semibold">الموظف</th>
                  <th className="text-right p-3 font-semibold">الأصناف</th>
                </tr>
              </thead>
              <tbody>
                {processedRequests.map((r) => {
                  const cfg = STATUS_CONFIG[r.status] || {};
                  const Icon = cfg.icon;
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-medium text-gray-800">#{r.request_number}</td>
                      <td className="p-3">
                        <Badge className={cn("gap-1", cfg.color)} variant="outline">
                          {Icon && <Icon className="h-3 w-3" />} {r.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-600">
                        {r.submitted_at ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {new Date(r.submitted_at).toLocaleString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="p-3 text-gray-600">
                        {r.received_at ? (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5 text-blue-400" />
                            {new Date(r.received_at).toLocaleString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="p-3">
                        {r.durationMs ? (
                          <span className={cn("font-semibold", r.durationMs > 3 * 24 * 60 * 60 * 1000 ? "text-red-600" : "text-gray-800")}>
                            {r.durationText}
                            {r.durationMs > 3 * 24 * 60 * 60 * 1000 && (
                              <AlertTriangle className="h-3.5 w-3.5 inline mr-1 text-red-500" />
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-600">{r.employee_name}</td>
                      <td className="p-3 text-gray-600">{r.items?.length || 0} صنف</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}