import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown,
  DollarSign, AlertCircle, Clock, Filter, Banknote, ArrowUpCircle, ArrowDownCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAYS_AR = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

function fmt(n) { return (n || 0).toLocaleString("ar-EG", { maximumFractionDigits: 0 }); }

export default function CashCalendar() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Invoice.filter({ pattern_type: "مبيعات" }),
      base44.entities.Invoice.filter({ pattern_type: "مشتريات" }),
    ]).then(([sales, purchases]) => {
      const pending = [
        ...sales.filter(i => (i.remaining_amount || 0) > 0 && !i.is_archived && i.status === "مرحّلة"),
        ...purchases.filter(i => (i.remaining_amount || 0) > 0 && !i.is_archived && i.status === "مرحّلة"),
      ];
      setInvoices(pending);
      setLoading(false);
    });
  }, []);

  // توزيع الفواتير على أيام التقويم
  const eventsByDate = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      const dueDate = inv.due_date || inv.date;
      if (!dueDate) return;
      if (!map[dueDate]) map[dueDate] = { receivables: [], payables: [] };
      if (inv.pattern_type === "مبيعات") map[dueDate].receivables.push(inv);
      else map[dueDate].payables.push(inv);
    });
    return map;
  }, [invoices]);

  // إحصائيات الشهر المعروض
  const monthStats = useMemo(() => {
    const pad = n => String(n).padStart(2, "0");
    const prefix = `${year}-${pad(month + 1)}`;
    let totalRec = 0, totalPay = 0, overdueRec = 0, overduePay = 0;
    Object.entries(eventsByDate).forEach(([date, { receivables, payables }]) => {
      if (!date.startsWith(prefix)) return;
      receivables.forEach(i => { totalRec += i.remaining_amount || 0; if (date < todayStr) overdueRec += i.remaining_amount || 0; });
      payables.forEach(i => { totalPay += i.remaining_amount || 0; if (date < todayStr) overduePay += i.remaining_amount || 0; });
    });
    return { totalRec, totalPay, overdueRec, overduePay, net: totalRec - totalPay };
  }, [eventsByDate, year, month, todayStr]);

  // إحصائيات إجمالية (كل الفترات)
  const globalStats = useMemo(() => {
    let totalRec = 0, totalPay = 0, overdueRec = 0, overduePay = 0;
    invoices.forEach(inv => {
      const d = inv.due_date || inv.date;
      if (inv.pattern_type === "مبيعات") {
        totalRec += inv.remaining_amount || 0;
        if (d && d < todayStr) overdueRec += inv.remaining_amount || 0;
      } else {
        totalPay += inv.remaining_amount || 0;
        if (d && d < todayStr) overduePay += inv.remaining_amount || 0;
      }
    });
    return { totalRec, totalPay, overdueRec, overduePay };
  }, [invoices, todayStr]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); }

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
    setSelectedDay({ date: ds, ...events });
  }

  const overdueCount = invoices.filter(i => {
    const d = i.due_date || i.date;
    return d && d < todayStr;
  }).length;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            تقويم التدفقات النقدية
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">مواعيد تحصيل المستحقات من العملاء ودفع الموردين</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48 h-9">
            <Filter className="h-3.5 w-3.5 ml-1 opacity-60" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل (تحصيل + دفع)</SelectItem>
            <SelectItem value="receivables">تحصيل من عملاء فقط</SelectItem>
            <SelectItem value="payables">دفع لموردين فقط</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert: Overdue */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {overdueCount} فاتورة متأخرة الاستحقاق
            </p>
            <p className="text-xs text-red-500">
              إجمالي المتأخرات من العملاء: {fmt(globalStats.overdueRec)} — على الموردين: {fmt(globalStats.overduePay)}
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<ArrowUpCircle className="h-5 w-5 text-blue-600" />}
          label="مستحقات العملاء (الشهر)"
          value={fmt(monthStats.totalRec)}
          sub={monthStats.overdueRec > 0 ? `${fmt(monthStats.overdueRec)} متأخرة` : null}
          subColor="text-red-500"
          bg="bg-blue-50/70 border-blue-200"
          valueColor="text-blue-800"
        />
        <StatCard
          icon={<ArrowDownCircle className="h-5 w-5 text-orange-600" />}
          label="مستحقات الموردين (الشهر)"
          value={fmt(monthStats.totalPay)}
          sub={monthStats.overduePay > 0 ? `${fmt(monthStats.overduePay)} متأخرة` : null}
          subColor="text-red-500"
          bg="bg-orange-50/70 border-orange-200"
          valueColor="text-orange-800"
        />
        <StatCard
          icon={<DollarSign className={`h-5 w-5 ${monthStats.net >= 0 ? "text-green-600" : "text-red-600"}`} />}
          label="صافي السيولة (الشهر)"
          value={(monthStats.net >= 0 ? "+" : "") + fmt(monthStats.net)}
          bg={monthStats.net >= 0 ? "bg-green-50/70 border-green-200" : "bg-red-50/70 border-red-200"}
          valueColor={monthStats.net >= 0 ? "text-green-800" : "text-red-800"}
        />
        <StatCard
          icon={<Banknote className="h-5 w-5 text-violet-600" />}
          label="إجمالي الفواتير المفتوحة"
          value={invoices.length}
          sub={`عملاء: ${invoices.filter(i=>i.pattern_type==="مبيعات").length} · موردون: ${invoices.filter(i=>i.pattern_type==="مشتريات").length}`}
          bg="bg-violet-50/70 border-violet-200"
          valueColor="text-violet-800"
        />
      </div>

      {/* Liquidity Bar */}
      {(monthStats.totalRec + monthStats.totalPay) > 0 && (
        <Card className="border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">توزيع التدفقات هذا الشهر</span>
              <span className="text-xs text-muted-foreground">
                داخل: {fmt(monthStats.totalRec)} | خارج: {fmt(monthStats.totalPay)}
              </span>
            </div>
            <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-muted">
              {monthStats.totalRec > 0 && (
                <div
                  className="bg-blue-400 transition-all"
                  style={{ width: `${(monthStats.totalRec / (monthStats.totalRec + monthStats.totalPay)) * 100}%` }}
                />
              )}
              {monthStats.totalPay > 0 && (
                <div
                  className="bg-orange-400 transition-all"
                  style={{ width: `${(monthStats.totalPay / (monthStats.totalRec + monthStats.totalPay)) * 100}%` }}
                />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs text-blue-700"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> تحصيل</span>
              <span className="flex items-center gap-1 text-xs text-orange-700"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> دفع</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold">{MONTHS_AR[month]} {year}</CardTitle>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={goToday}>اليوم</Button>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days header */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_AR.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2 border-b">
                {d.slice(0, 3)}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-56">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((d, i) => {
                if (!d) return <div key={`e-${i}`} className="min-h-[80px] border-b border-l border-transparent" />;
                const ds = dateStr(d);
                const events = eventsByDate[ds];
                const isToday = ds === todayStr;
                const isPast = ds < todayStr;

                const recTotal = filter !== "payables" ? (events?.receivables?.reduce((s, inv) => s + (inv.remaining_amount || 0), 0) || 0) : 0;
                const payTotal = filter !== "receivables" ? (events?.payables?.reduce((s, inv) => s + (inv.remaining_amount || 0), 0) || 0) : 0;
                const hasAny = recTotal > 0 || payTotal > 0;

                return (
                  <div
                    key={d}
                    onClick={() => hasAny && openDay(d)}
                    className={[
                      "min-h-[80px] border-b border-l p-1.5 transition-all",
                      isToday ? "bg-primary/5 border-t-2 border-t-primary" : "bg-background",
                      hasAny ? "cursor-pointer hover:bg-muted/50" : "",
                    ].join(" ")}
                  >
                    <span className={[
                      "text-xs font-bold block mb-1",
                      isToday ? "text-primary" : isPast ? "text-muted-foreground/60" : "text-foreground",
                    ].join(" ")}>
                      {d}
                    </span>

                    {recTotal > 0 && (
                      <div className={`text-[10px] rounded px-1 py-0.5 mb-0.5 font-semibold leading-tight truncate ${
                        isPast ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        ↑ {fmt(recTotal)}
                      </div>
                    )}
                    {payTotal > 0 && (
                      <div className={`text-[10px] rounded px-1 py-0.5 font-semibold leading-tight truncate ${
                        isPast ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
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
          <div className="flex items-center gap-5 mt-3 pt-3 border-t flex-wrap text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" /> ↑ تحصيل من عميل</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-300 inline-block" /> ↓ دفع لمورد</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" /> متأخر</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-primary inline-block rounded" /> اليوم</span>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming list */}
      <UpcomingList invoices={invoices} filter={filter} todayStr={todayStr} />

      {/* Day Detail Dialog */}
      {selectedDay && (
        <DayDialog
          day={selectedDay}
          filter={filter}
          todayStr={todayStr}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, subColor = "text-muted-foreground", bg = "bg-card border", valueColor = "text-foreground" }) {
  return (
    <Card className={`border ${bg}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-medium text-muted-foreground leading-tight">{label}</span></div>
        <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
        {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Upcoming List ────────────────────────────────────────────────────────────
function UpcomingList({ invoices, filter, todayStr }) {
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    return invoices
      .filter(inv => {
        if (filter === "receivables" && inv.pattern_type !== "مبيعات") return false;
        if (filter === "payables" && inv.pattern_type !== "مشتريات") return false;
        return !!(inv.due_date || inv.date);
      })
      .sort((a, b) => {
        const da = a.due_date || a.date, db = b.due_date || b.date;
        // المتأخرات أولاً ثم الأقرب
        const pastA = da < todayStr, pastB = db < todayStr;
        if (pastA && !pastB) return -1;
        if (!pastA && pastB) return 1;
        return da < db ? -1 : 1;
      });
  }, [invoices, filter, todayStr]);

  const visible = showAll ? sorted : sorted.slice(0, 15);
  if (sorted.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          قائمة المستحقات ({sorted.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {visible.map(inv => {
            const d = inv.due_date || inv.date;
            const daysLeft = Math.ceil((new Date(d) - new Date(todayStr)) / 864e5);
            const isRec = inv.pattern_type === "مبيعات";
            return (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-1.5 h-10 rounded-full shrink-0 ${isRec ? "bg-blue-400" : "bg-orange-400"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{inv.client_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{inv.invoice_number} · {d}</p>
                    <p className="text-[11px] text-muted-foreground/70">{isRec ? "تحصيل من عميل" : "دفع لمورد"}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 mr-2">
                  <span className={`text-sm font-bold ${isRec ? "text-blue-700" : "text-orange-700"}`}>
                    {isRec ? "+" : "-"}{(inv.remaining_amount || 0).toLocaleString()}
                  </span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                    daysLeft < 0 ? "border-red-300 text-red-700 bg-red-50"
                    : daysLeft === 0 ? "border-orange-300 text-orange-700 bg-orange-50"
                    : daysLeft <= 7 ? "border-yellow-300 text-yellow-700 bg-yellow-50"
                    : "border-green-300 text-green-700 bg-green-50"
                  }`}>
                    {daysLeft < 0 ? `متأخر ${Math.abs(daysLeft)} يوم` : daysLeft === 0 ? "اليوم" : `خلال ${daysLeft} يوم`}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
        {sorted.length > 15 && (
          <div className="p-3 text-center border-t">
            <Button variant="ghost" size="sm" onClick={() => setShowAll(s => !s)} className="text-xs text-muted-foreground">
              {showAll ? "عرض أقل" : `عرض الكل (${sorted.length})`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Day Dialog ───────────────────────────────────────────────────────────────
function DayDialog({ day, filter, todayStr, onClose }) {
  const isPast = day.date < todayStr;
  const daysLeft = Math.ceil((new Date(day.date) - new Date(todayStr)) / 864e5);
  const showRec = filter !== "payables";
  const showPay = filter !== "receivables";
  const recTotal = showRec ? (day.receivables || []).reduce((s, i) => s + (i.remaining_amount || 0), 0) : 0;
  const payTotal = showPay ? (day.payables || []).reduce((s, i) => s + (i.remaining_amount || 0), 0) : 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            {day.date}
            {isPast
              ? <Badge variant="destructive" className="text-xs">متأخر</Badge>
              : daysLeft === 0
                ? <Badge className="text-xs bg-orange-500 text-white">اليوم</Badge>
                : <Badge variant="outline" className="text-xs">خلال {daysLeft} يوم</Badge>}
          </DialogTitle>
        </DialogHeader>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          {showRec && recTotal > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
              <p className="text-xs text-blue-500 mb-1 font-medium">تحصيل من عملاء</p>
              <p className="text-xl font-bold text-blue-800">+{fmt(recTotal)}</p>
              <p className="text-[11px] text-blue-400">{(day.receivables || []).length} فاتورة</p>
            </div>
          )}
          {showPay && payTotal > 0 && (
            <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
              <p className="text-xs text-orange-500 mb-1 font-medium">دفع لموردين</p>
              <p className="text-xl font-bold text-orange-800">-{fmt(payTotal)}</p>
              <p className="text-[11px] text-orange-400">{(day.payables || []).length} فاتورة</p>
            </div>
          )}
        </div>

        {/* Receivables */}
        {showRec && day.receivables?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-blue-700 flex items-center gap-1.5 mb-3">
              <ArrowUpCircle className="h-4 w-4" /> مستحقات التحصيل ({day.receivables.length})
            </h3>
            <div className="space-y-2">
              {day.receivables.map(inv => (
                <div key={inv.id} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-100">
                  <div>
                    <p className="text-sm font-semibold">{inv.client_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoice_number} · {inv.date}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-blue-700">+{fmt(inv.remaining_amount)}</p>
                    <p className="text-[11px] text-muted-foreground">الإجمالي: {fmt(inv.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payables */}
        {showPay && day.payables?.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-orange-700 flex items-center gap-1.5 mb-3">
              <ArrowDownCircle className="h-4 w-4" /> مستحقات الموردين ({day.payables.length})
            </h3>
            <div className="space-y-2">
              {day.payables.map(inv => (
                <div key={inv.id} className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2.5 border border-orange-100">
                  <div>
                    <p className="text-sm font-semibold">{inv.client_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoice_number} · {inv.date}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-orange-700">-{fmt(inv.remaining_amount)}</p>
                    <p className="text-[11px] text-muted-foreground">الإجمالي: {fmt(inv.total)}</p>
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