import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown,
  DollarSign, AlertCircle, CheckCircle2, Clock, Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAYS_AR = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

function fmt(n) { return (n || 0).toLocaleString("ar-EG", { maximumFractionDigits: 0 }); }

function getUrgencyColor(daysLeft) {
  if (daysLeft < 0) return "bg-red-100 border-red-300 text-red-800";
  if (daysLeft === 0) return "bg-orange-100 border-orange-300 text-orange-800";
  if (daysLeft <= 3) return "bg-yellow-100 border-yellow-300 text-yellow-800";
  return "bg-green-50 border-green-200 text-green-800";
}

export default function CashCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | receivables | payables
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Invoice.filter({ pattern_type: "مبيعات" }),
      base44.entities.Invoice.filter({ pattern_type: "مشتريات" }),
    ]).then(([sales, purchases]) => {
      // نأخذ فقط الآجلة وغير المدفوعة بالكامل
      const pending = [
        ...sales.filter(i => i.payment_method === "آجل" && (i.remaining_amount || 0) > 0 && !i.is_archived),
        ...purchases.filter(i => i.payment_method === "آجل" && (i.remaining_amount || 0) > 0 && !i.is_archived),
      ];
      setInvoices(pending);
      setLoading(false);
    });
  }, []);

  // توزيع الفواتير على أيام التقويم بناءً على تاريخ الفاتورة + 30 يوم (تقدير موعد الاستحقاق)
  // أو نستخدم التاريخ مباشرة إذا لم يكن هناك حقل due_date
  const eventsByDate = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      // تقدير تاريخ الاستحقاق = تاريخ الفاتورة (يمكن تعديله لاحقاً)
      const dueDate = inv.due_date || inv.date;
      if (!dueDate) return;
      if (!map[dueDate]) map[dueDate] = { receivables: [], payables: [] };
      if (inv.pattern_type === "مبيعات") {
        map[dueDate].receivables.push(inv);
      } else {
        map[dueDate].payables.push(inv);
      }
    });
    return map;
  }, [invoices]);

  // إحصائيات الشهر الحالي
  const monthStats = useMemo(() => {
    const pad = n => String(n).padStart(2, "0");
    const prefix = `${year}-${pad(month + 1)}`;
    let totalReceivables = 0, totalPayables = 0, overdueRec = 0, overduePay = 0;
    const todayStr = today.toISOString().split("T")[0];

    Object.entries(eventsByDate).forEach(([date, { receivables, payables }]) => {
      if (!date.startsWith(prefix)) return;
      receivables.forEach(i => {
        totalReceivables += i.remaining_amount || 0;
        if (date < todayStr) overdueRec += i.remaining_amount || 0;
      });
      payables.forEach(i => {
        totalPayables += i.remaining_amount || 0;
        if (date < todayStr) overduePay += i.remaining_amount || 0;
      });
    });
    return { totalReceivables, totalPayables, overdueRec, overduePay, net: totalReceivables - totalPayables };
  }, [eventsByDate, year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // بناء أيام التقويم
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [year, month]);

  function dateStr(d) {
    const pad = n => String(n).padStart(2, "0");
    return `${year}-${pad(month + 1)}-${pad(d)}`;
  }

  function openDay(d) {
    const ds = dateStr(d);
    const events = eventsByDate[ds];
    if (!events) return;
    setSelectedDay({ date: ds, day: d, ...events });
    setDayDialogOpen(true);
  }

  const todayStr = today.toISOString().split("T")[0];

  return (
    <div className="space-y-6 p-2" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            تقويم التدفقات النقدية
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">مواعيد تحصيل المستحقات ودفع الموردين</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44 h-9">
            <Filter className="h-3.5 w-3.5 ml-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="receivables">تحصيل من عملاء</SelectItem>
            <SelectItem value="payables">دفع لموردين</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/60">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">مستحقات العملاء</span>
            </div>
            <p className="text-xl font-bold text-blue-800">{fmt(monthStats.totalReceivables)}</p>
            {monthStats.overdueRec > 0 && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {fmt(monthStats.overdueRec)} متأخرة
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/60">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-orange-700 font-medium">مستحقات الموردين</span>
            </div>
            <p className="text-xl font-bold text-orange-800">{fmt(monthStats.totalPayables)}</p>
            {monthStats.overduePay > 0 && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {fmt(monthStats.overduePay)} متأخرة
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={`border-2 ${monthStats.net >= 0 ? "border-green-200 bg-green-50/60" : "border-red-200 bg-red-50/60"}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className={`h-4 w-4 ${monthStats.net >= 0 ? "text-green-600" : "text-red-600"}`} />
              <span className={`text-xs font-medium ${monthStats.net >= 0 ? "text-green-700" : "text-red-700"}`}>صافي السيولة</span>
            </div>
            <p className={`text-xl font-bold ${monthStats.net >= 0 ? "text-green-800" : "text-red-800"}`}>
              {monthStats.net >= 0 ? "+" : ""}{fmt(monthStats.net)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-600 font-medium">إجمالي المعاملات</span>
            </div>
            <p className="text-xl font-bold text-gray-800">{invoices.length}</p>
            <p className="text-xs text-muted-foreground mt-1">فاتورة مفتوحة</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronRight className="h-4 w-4" /></Button>
            <CardTitle className="text-lg font-bold">
              {MONTHS_AR[month]} {year}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronLeft className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days header */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_AR.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                {d.slice(0, 3)}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} />;
                const ds = dateStr(d);
                const events = eventsByDate[ds];
                const isToday = ds === todayStr;
                const isPast = ds < todayStr;

                const hasRec = events?.receivables?.length > 0;
                const hasPay = events?.payables?.length > 0;
                const showRec = filter !== "payables" && hasRec;
                const showPay = filter !== "receivables" && hasPay;
                const hasAny = showRec || showPay;

                const recTotal = events?.receivables?.reduce((s, i) => s + (i.remaining_amount || 0), 0) || 0;
                const payTotal = events?.payables?.reduce((s, i) => s + (i.remaining_amount || 0), 0) || 0;
                const daysLeft = Math.ceil((new Date(ds) - today) / (1000 * 60 * 60 * 24));

                return (
                  <div
                    key={d}
                    onClick={() => hasAny && openDay(d)}
                    className={`
                      min-h-[72px] rounded-lg border p-1.5 transition-all
                      ${isToday ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border"}
                      ${hasAny ? "cursor-pointer hover:shadow-md hover:border-primary/50" : ""}
                      ${isPast && hasAny ? "opacity-90" : ""}
                    `}
                  >
                    <span className={`text-xs font-semibold block text-right mb-1 ${isToday ? "text-primary" : isPast ? "text-muted-foreground" : "text-foreground"}`}>
                      {d}
                    </span>

                    {showRec && recTotal > 0 && (
                      <div className={`text-[10px] rounded px-1 py-0.5 mb-0.5 font-medium border truncate ${
                        isPast ? "bg-red-100 text-red-700 border-red-200" : "bg-blue-100 text-blue-700 border-blue-200"
                      }`}>
                        ↑ {fmt(recTotal)}
                      </div>
                    )}

                    {showPay && payTotal > 0 && (
                      <div className={`text-[10px] rounded px-1 py-0.5 font-medium border truncate ${
                        isPast ? "bg-red-100 text-red-700 border-red-200" : "bg-orange-100 text-orange-700 border-orange-200"
                      }`}>
                        ↓ {fmt(payTotal)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t flex-wrap">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
              <span>↑ تحصيل من عميل</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
              <span>↓ دفع لمورد</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
              <span>متأخر</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded border-2 border-primary" />
              <span>اليوم</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List View — Upcoming */}
      <UpcomingList invoices={invoices} filter={filter} todayStr={todayStr} />

      {/* Day Detail Dialog */}
      <DayDialog
        open={dayDialogOpen}
        onClose={() => setDayDialogOpen(false)}
        day={selectedDay}
        filter={filter}
        todayStr={todayStr}
      />
    </div>
  );
}

// ─── Upcoming List ────────────────────────────────────────────────────────────
function UpcomingList({ invoices, filter, todayStr }) {
  const upcoming = useMemo(() => {
    return invoices
      .filter(inv => {
        const d = inv.due_date || inv.date;
        if (!d) return false;
        if (filter === "receivables" && inv.pattern_type !== "مبيعات") return false;
        if (filter === "payables" && inv.pattern_type !== "مشتريات") return false;
        return true;
      })
      .sort((a, b) => {
        const da = a.due_date || a.date, db = b.due_date || b.date;
        return da < db ? -1 : 1;
      })
      .slice(0, 20);
  }, [invoices, filter]);

  if (upcoming.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          أقرب المستحقات
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {upcoming.map(inv => {
            const d = inv.due_date || inv.date;
            const daysLeft = Math.ceil((new Date(d) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
            const isReceivable = inv.pattern_type === "مبيعات";
            return (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full ${isReceivable ? "bg-blue-400" : "bg-orange-400"}`} />
                  <div>
                    <p className="text-sm font-medium">{inv.client_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoice_number} · {d}</p>
                  </div>
                </div>
                <div className="text-left flex flex-col items-end gap-1">
                  <span className={`text-sm font-bold ${isReceivable ? "text-blue-700" : "text-orange-700"}`}>
                    {isReceivable ? "+" : "-"}{(inv.remaining_amount || 0).toLocaleString()}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      daysLeft < 0 ? "border-red-300 text-red-700 bg-red-50"
                      : daysLeft === 0 ? "border-orange-300 text-orange-700 bg-orange-50"
                      : daysLeft <= 7 ? "border-yellow-300 text-yellow-700 bg-yellow-50"
                      : "border-green-300 text-green-700 bg-green-50"
                    }`}
                  >
                    {daysLeft < 0 ? `متأخر ${Math.abs(daysLeft)} يوم`
                     : daysLeft === 0 ? "اليوم"
                     : `خلال ${daysLeft} يوم`}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Day Dialog ───────────────────────────────────────────────────────────────
function DayDialog({ open, onClose, day, filter, todayStr }) {
  if (!day) return null;
  const isPast = day.date < todayStr;
  const daysLeft = Math.ceil((new Date(day.date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));

  const showRec = filter !== "payables";
  const showPay = filter !== "receivables";

  const recTotal = (day.receivables || []).reduce((s, i) => s + (i.remaining_amount || 0), 0);
  const payTotal = (day.payables || []).reduce((s, i) => s + (i.remaining_amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            {day.date}
            {isPast ? (
              <Badge variant="destructive" className="text-xs">متأخر</Badge>
            ) : daysLeft === 0 ? (
              <Badge className="text-xs bg-orange-500">اليوم</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">خلال {daysLeft} يوم</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          {showRec && recTotal > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
              <p className="text-xs text-blue-600 mb-1">تحصيل من عملاء</p>
              <p className="text-lg font-bold text-blue-800">+{recTotal.toLocaleString()}</p>
            </div>
          )}
          {showPay && payTotal > 0 && (
            <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
              <p className="text-xs text-orange-600 mb-1">دفع لموردين</p>
              <p className="text-lg font-bold text-orange-800">-{payTotal.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Receivables */}
        {showRec && day.receivables?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-1 mb-2">
              <TrendingUp className="h-3.5 w-3.5" /> مستحقات التحصيل ({day.receivables.length})
            </h3>
            <div className="space-y-2">
              {day.receivables.map(inv => (
                <div key={inv.id} className="flex items-center justify-between bg-blue-50/80 rounded-lg px-3 py-2 border border-blue-100">
                  <div>
                    <p className="text-sm font-medium">{inv.client_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoice_number}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-blue-700">+{(inv.remaining_amount || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">الإجمالي: {(inv.total || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payables */}
        {showPay && day.payables?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-1 mb-2">
              <TrendingDown className="h-3.5 w-3.5" /> مستحقات الموردين ({day.payables.length})
            </h3>
            <div className="space-y-2">
              {day.payables.map(inv => (
                <div key={inv.id} className="flex items-center justify-between bg-orange-50/80 rounded-lg px-3 py-2 border border-orange-100">
                  <div>
                    <p className="text-sm font-medium">{inv.client_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoice_number}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-orange-700">-{(inv.remaining_amount || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">الإجمالي: {(inv.total || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}