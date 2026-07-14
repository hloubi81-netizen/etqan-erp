import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarClock, Stethoscope, FileText, ShieldCheck, Banknote } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(value) {
  if (!value) return false;
  if (value instanceof Date) return todayStr() === `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  const s = String(value);
  return s.startsWith(todayStr());
}

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [claims, setClaims] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const [p, a, i, c] = await Promise.all([
      base44.entities.Patient.list(),
      base44.entities.Appointment.list(),
      base44.entities.ClinicInvoice.list(),
      base44.entities.InsuranceClaim.list(),
    ]);
    setPatients(p); setAppointments(a); setInvoices(i); setClaims(c);
    setLoading(false);
  }

  const newPatientsToday = patients.filter(p => isToday(p.created_date)).length;
  const totalPatients = patients.length;

  const todaysAppointments = appointments
    .filter(a => a.date === todayStr())
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const upcomingAppointments = appointments
    .filter(a => (a.date || "") >= todayStr() && a.status === "محجوز")
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.time || "").localeCompare(b.time || ""));

  const todaysInvoices = invoices.filter(inv => inv.date === todayStr());
  const todaysRevenue = todaysInvoices.reduce((s, inv) => s + (Number(inv.paid) || 0), 0);
  const pendingRevenue = invoices.reduce((s, inv) => s + (Number(inv.remaining) || 0), 0);

  const pendingClaims = claims.filter(c => c.status === "قيد المراجعة").length;

  // appointments count for the last 7 days
  const weekData = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const count = appointments.filter(a => a.date === ds).length;
    return { day: DAY_NAMES[d.getDay()], count };
  });

  const stats = [
    { label: "مرضى جدد اليوم", value: newPatientsToday, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "إجمالي المرضى", value: totalPatients, icon: Stethoscope, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "مواعيد اليوم", value: todaysAppointments.length, icon: CalendarClock, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "مواعيد قادمة", value: upcomingAppointments.length, icon: CalendarClock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "تحصيل اليوم", value: todaysRevenue.toLocaleString(), icon: Banknote, color: "text-green-600", bg: "bg-green-50" },
    { label: "مطالبات قيد المراجعة", value: pendingClaims, icon: ShieldCheck, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <Card key={idx} className="overflow-hidden">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">مواعيد اليوم</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {todaysAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">لا توجد مواعيد اليوم</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {todaysAppointments.map(a => (
                  <div key={a.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{a.patient_name}</p>
                      <p className="text-xs text-muted-foreground">{a.doctor_name} · {a.type}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">{a.time || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">المواعيد القادمة</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">لا توجد مواعيد قادمة</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {upcomingAppointments.slice(0, 8).map(a => (
                  <div key={a.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{a.patient_name}</p>
                      <p className="text-xs text-muted-foreground">{a.doctor_name} · {a.type}</p>
                    </div>
                    <span className="text-xs font-semibold">{a.date} {a.time || ""}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">المواعيد خلال الأسبوع</CardTitle></CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip cursor={{ fillOpacity: 0.1 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">مستحقات غير محصّلة</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <p className="text-2xl font-bold text-rose-600">{pendingRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">إجمالي المبالغ المتبقية على المرضى وشركات التأمين</p>
        </CardContent>
      </Card>
    </div>
  );
}