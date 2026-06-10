import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronRight, ChevronLeft, Calendar, ArrowUpCircle, ArrowDownCircle,
  Scale, Clock, AlertTriangle, X, Wallet
} from "lucide-react";

const STATUS_COLOR = {
  "مفتوحة":        { bg: "bg-blue-500",   light: "bg-blue-50 border-blue-200",   text: "text-blue-700"   },
  "تحت التسوية":  { bg: "bg-amber-500",  light: "bg-amber-50 border-amber-200", text: "text-amber-700"  },
  "مسواة":         { bg: "bg-emerald-500",light: "bg-emerald-50 border-emerald-200",text:"text-emerald-700"},
  "مغلقة":         { bg: "bg-gray-400",   light: "bg-gray-50 border-gray-200",   text: "text-gray-600"   },
};

const EVENT_TYPES = {
  issue:    { label: "تاريخ الصرف",          icon: ArrowUpCircle,   color: "bg-blue-600",    textColor: "text-blue-700",    dot: "bg-blue-600"    },
  expected: { label: "إرجاع متوقع",          icon: Clock,           color: "bg-amber-500",   textColor: "text-amber-700",   dot: "bg-amber-500"   },
  actual:   { label: "إرجاع فعلي",           icon: ArrowDownCircle, color: "bg-emerald-600", textColor: "text-emerald-700", dot: "bg-emerald-600" },
  settlement:{ label: "تاريخ التسوية",       icon: Scale,           color: "bg-purple-600",  textColor: "text-purple-700",  dot: "bg-purple-600"  },
  overdue:  { label: "متأخرة الإرجاع",       icon: AlertTriangle,   color: "bg-red-500",     textColor: "text-red-700",     dot: "bg-red-500"     },
};

const WEEKDAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export default function CustodyCalendar() {
  const [custodies, setCustodies] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);

  useEffect(() => {
    base44.entities.Custody.list().then(data => {
      setCustodies(data);
      setLoading(false);
    });
  }, []);

  const employees = useMemo(() => {
    const map = {};
    custodies.forEach(c => { if (c.employee_name) map[c.employee_id] = c.employee_name; });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [custodies]);

  // Build event map: { "YYYY-MM-DD": [event, ...] }
  const eventMap = useMemo(() => {
    const map = {};
    const todayStr = today.toISOString().slice(0, 10);

    const add = (dateStr, event) => {
      if (!dateStr) return;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    };

    custodies.forEach(c => {
      if (filterStatus !== "all" && c.status !== filterStatus) return;
      if (filterEmployee !== "all" && c.employee_id !== filterEmployee) return;

      // Issue date
      if (c.issue_date) add(c.issue_date, { type: "issue", custody: c });

      // Expected return
      if (c.expected_return_date) {
        const isOverdue = c.expected_return_date < todayStr && c.status !== "مسواة" && c.status !== "مغلقة";
        add(c.expected_return_date, { type: isOverdue ? "overdue" : "expected", custody: c });
      }

      // Actual return
      if (c.actual_return_date) add(c.actual_return_date, { type: "actual", custody: c });

      // Settlement
      if (c.settlement_date) add(c.settlement_date, { type: "settlement", custody: c });
    });

    return map;
  }, [custodies, filterStatus, filterEmployee]);

  // Monthly summary stats
  const monthStats = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    let issued = 0, expectedReturn = 0, actualReturn = 0, overdue = 0;
    Object.entries(eventMap).forEach(([date, events]) => {
      if (!date.startsWith(prefix)) return;
      events.forEach(e => {
        if (e.type === "issue") issued++;
        if (e.type === "expected") expectedReturn++;
        if (e.type === "actual") actualReturn++;
        if (e.type === "overdue") overdue++;
      });
    });
    return { issued, expectedReturn, actualReturn, overdue };
  }, [eventMap, viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  }
  function goToday() { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDay(null); }

  function selectDay(day) {
    if (!day) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const events = eventMap[dateStr] || [];
    setSelectedDay({ day, dateStr });
    setSelectedDayEvents(events);
  }

  const calendarDays = buildCalendarDays(viewYear, viewMonth);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            تقويم العهد المالية
          </h1>
          <p className="text-muted-foreground text-sm mt-1">متابعة تواريخ صرف واستلام العهد زمنياً</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setSelectedDay(null); }}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              {["مفتوحة", "تحت التسوية", "مسواة", "مغلقة"].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEmployee} onValueChange={v => { setFilterEmployee(v); setSelectedDay(null); }}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="الموظف" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الموظفين</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={goToday} className="h-9">اليوم</Button>
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "عهد مصروفة", value: monthStats.issued,        ...EVENT_TYPES.issue    },
          { label: "إرجاع متوقع", value: monthStats.expectedReturn,...EVENT_TYPES.expected  },
          { label: "تم الاستلام",  value: monthStats.actualReturn, ...EVENT_TYPES.actual   },
          { label: "متأخرة",       value: monthStats.overdue,      ...EVENT_TYPES.overdue  },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3">
            <div className={`h-9 w-9 rounded-lg ${s.color} flex items-center justify-center`}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={`text-xl font-bold ${s.textColor}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(EVENT_TYPES).map(([key, t]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} />
            <span className="text-muted-foreground">{t.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          {/* Navigation */}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronRight className="h-5 w-5" /></Button>
              <h2 className="text-lg font-bold">
                {MONTHS_AR[viewMonth]} {viewYear}
              </h2>
              <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronLeft className="h-5 w-5" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS_AR.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2">{d.slice(0, 3)}</div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const events = eventMap[dateStr] || [];
                const isToday = dateStr === todayStr;
                const isSelected = selectedDay?.dateStr === dateStr;
                const hasOverdue = events.some(e => e.type === "overdue");

                return (
                  <button
                    key={day}
                    onClick={() => selectDay(day)}
                    className={`
                      relative min-h-[62px] rounded-xl p-1.5 text-right border transition-all
                      ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:border-border hover:bg-muted/30"}
                      ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}
                      ${hasOverdue ? "bg-red-50/60" : ""}
                    `}
                  >
                    <span className={`text-xs font-semibold block mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>{day}</span>
                    <div className="flex flex-col gap-0.5">
                      {events.slice(0, 3).map((ev, i) => {
                        const t = EVENT_TYPES[ev.type];
                        return (
                          <div key={i} className={`flex items-center gap-1 rounded px-1 py-0.5 ${t.color} bg-opacity-90`}>
                            <t.icon className="h-2.5 w-2.5 text-white flex-shrink-0" />
                            <span className="text-[9px] text-white truncate leading-tight">
                              {ev.custody.employee_name?.split(" ")[0]}
                            </span>
                          </div>
                        );
                      })}
                      {events.length > 3 && (
                        <span className="text-[9px] text-muted-foreground text-center">+{events.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day Detail Panel */}
        <div className="space-y-4">
          {selectedDay ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {selectedDay.day} {MONTHS_AR[viewMonth]} {viewYear}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedDayEvents.length} حدث</p>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 max-h-[460px] overflow-y-auto">
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">لا توجد أحداث في هذا اليوم</p>
                ) : selectedDayEvents.map((ev, i) => {
                  const t = EVENT_TYPES[ev.type];
                  const sc = STATUS_COLOR[ev.custody.status] || STATUS_COLOR["مغلقة"];
                  return (
                    <div key={i} className={`border rounded-xl p-3 space-y-2 ${sc.light}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className={`flex items-center gap-1.5 text-xs font-semibold ${t.textColor}`}>
                          <t.icon className="h-3.5 w-3.5" />
                          {t.label}
                        </div>
                        <Badge className={`text-[10px] px-2 py-0 ${sc.light} ${sc.text} border`}>
                          {ev.custody.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{ev.custody.employee_name}</p>
                        <p className="text-xs text-muted-foreground">{ev.custody.purpose}</p>
                        <div className="flex items-center gap-3 text-xs pt-1">
                          <span className="font-mono font-medium text-primary">{ev.custody.custody_number}</span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Wallet className="h-3 w-3" />
                            {(ev.custody.issued_amount || 0).toLocaleString("ar-SA")}
                          </span>
                        </div>
                        {ev.custody.cost_center_name && (
                          <p className="text-[10px] text-muted-foreground">مركز: {ev.custody.cost_center_name}</p>
                        )}
                        {ev.custody.department && (
                          <p className="text-[10px] text-muted-foreground">القسم: {ev.custody.department}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground border-t pt-1 mt-1">
                          {ev.custody.issue_date && <span>الصرف: {ev.custody.issue_date}</span>}
                          {ev.custody.expected_return_date && <span>المتوقع: {ev.custody.expected_return_date}</span>}
                          {ev.custody.actual_return_date && <span>الفعلي: {ev.custody.actual_return_date}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">اضغط على يوم لعرض أحداثه</p>
              </CardContent>
            </Card>
          )}

          {/* Upcoming events */}
          <UpcomingEvents custodies={custodies} filterStatus={filterStatus} filterEmployee={filterEmployee} />
        </div>
      </div>
    </div>
  );
}

function UpcomingEvents({ custodies, filterStatus, filterEmployee }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(() => {
    const in30days = new Date();
    in30days.setDate(in30days.getDate() + 30);
    const limitStr = in30days.toISOString().slice(0, 10);

    const events = [];
    custodies.forEach(c => {
      if (filterStatus !== "all" && c.status !== filterStatus) return;
      if (filterEmployee !== "all" && c.employee_id !== filterEmployee) return;

      // Overdue
      if (c.expected_return_date && c.expected_return_date < todayStr && c.status !== "مسواة" && c.status !== "مغلقة") {
        events.push({ date: c.expected_return_date, type: "overdue", custody: c, daysAgo: Math.floor((new Date(todayStr) - new Date(c.expected_return_date)) / 86400000) });
      }
      // Upcoming expected return
      else if (c.expected_return_date && c.expected_return_date >= todayStr && c.expected_return_date <= limitStr && c.status !== "مسواة" && c.status !== "مغلقة") {
        events.push({ date: c.expected_return_date, type: "expected", custody: c, daysLeft: Math.floor((new Date(c.expected_return_date) - new Date(todayStr)) / 86400000) });
      }
    });

    return events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }, [custodies, filterStatus, filterEmployee, todayStr]);

  if (upcoming.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          مواعيد قريبة ومتأخرة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0 max-h-64 overflow-y-auto">
        {upcoming.map((ev, i) => {
          const isOverdue = ev.type === "overdue";
          return (
            <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg border text-xs ${isOverdue ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
              <div className={`h-2 w-2 rounded-full mt-1 flex-shrink-0 ${isOverdue ? "bg-red-500" : "bg-amber-500"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{ev.custody.employee_name}</p>
                <p className="text-muted-foreground truncate">{ev.custody.purpose}</p>
                <p className={`font-medium mt-0.5 ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
                  {isOverdue ? `متأخر ${ev.daysAgo} يوم` : ev.daysLeft === 0 ? "اليوم!" : `بعد ${ev.daysLeft} يوم`}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{ev.date}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}