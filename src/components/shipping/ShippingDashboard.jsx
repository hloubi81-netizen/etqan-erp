import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, CheckCircle2, RotateCcw, Wallet, Banknote } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";

const STATUS_COLORS = {
  "تم الإنشاء": "#94a3b8",
  "قيد الشحن": "#1d4ed8",
  "تم التسليم": "#16a34a",
  "مرتجع": "#dc2626",
  "مفقود": "#7c3aed",
};

const CHART_COLORS = ["#1d4ed8", "#16a34a", "#dc2626", "#7c3aed", "#94a3b8"];

export default function ShippingDashboard() {
  const [data, setData] = useState({ shipments: [], trips: [], drivers: [], vehicles: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [shipments, trips, drivers, vehicles] = await Promise.all([
        base44.entities.Shipment.list(),
        base44.entities.ShippingTrip.list(),
        base44.entities.Driver.list(),
        base44.entities.Vehicle.list(),
      ]);
      setData({ shipments, trips, drivers, vehicles });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const s = data.shipments;
  const byStatus = (st) => s.filter(x => x.status === st).length;
  const inTransit = byStatus("قيد الشحن");
  const delivered = byStatus("تم التسليم");
  const returned = byStatus("مرتجع");
  const created = byStatus("تم الإنشاء");
  const revenue = s.reduce((a, x) => a + (x.shipping_cost || 0), 0);
  const codPending = s.filter(x => x.cod_status === "مستحق").reduce((a, x) => a + (x.cod_amount || 0), 0);
  const codCollected = s.filter(x => x.cod_status === "محصّل").reduce((a, x) => a + (x.cod_amount || 0), 0);
  const activeTrips = data.trips.filter(t => t.status === "قيد التنفيذ" || t.status === "مجدولة").length;
  const availableDrivers = data.drivers.filter(d => d.status === "متاح").length;
  const availableVehicles = data.vehicles.filter(v => v.status === "متاحة").length;

  const statusData = Object.keys(STATUS_COLORS).map(k => ({ name: k, value: s.filter(x => x.status === k).length }));

  // monthly shipments (last 6 months)
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("ar-EG", { month: "short" }), count: 0, revenue: 0 });
  }
  for (const x of s) {
    if (!x.ship_date) continue;
    const k = x.ship_date.slice(0, 7);
    const m = months.find(mm => mm.key === k);
    if (m) { m.count++; m.revenue += (x.shipping_cost || 0); }
  }

  const recent = [...s].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || "")).slice(0, 6);

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={Package} label="إجمالي الشحنات" value={s.length} color="text-primary bg-primary/10" />
        <Kpi icon={Truck} label="قيد الشحن" value={inTransit} color="text-blue-600 bg-blue-50" />
        <Kpi icon={CheckCircle2} label="تم التسليم" value={delivered} color="text-emerald-600 bg-emerald-50" />
        <Kpi icon={RotateCcw} label="مرتجع" value={returned} color="text-red-600 bg-red-50" />
        <Kpi icon={Wallet} label="إيرادات الشحن" value={revenue.toLocaleString()} color="text-amber-600 bg-amber-50" />
        <Kpi icon={Banknote} label="COD مستحق" value={codPending.toLocaleString()} color="text-orange-600 bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">توزيع الشحنات حسب الحالة</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.value}>
                  {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">الشحنات والإيرادات (آخر 6 أشهر)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="عدد الشحنات" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" name="الإيرادات" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">الأسطول والسائقون</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="الرحلات النشطة" value={activeTrips} />
            <Row label="سائقون متاحون" value={availableDrivers} />
            <Row label="مركبات متاحة" value={availableVehicles} />
            <Row label="COD محصّل" value={codCollected.toLocaleString()} />
            <Row label="شحنات منشأة" value={created} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">أحدث الشحنات</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">لا توجد شحنات.</p>}
            {recent.map(x => (
              <div key={x.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                <div className="font-medium">{x.tracking_number}</div>
                <div className="text-muted-foreground text-xs">{x.origin_city} ← {x.destination_city}</div>
                <div className="text-muted-foreground text-xs">{x.recipient_name}</div>
                <Badge style={{ background: STATUS_COLORS[x.status] + "22", color: STATUS_COLORS[x.status] }}>{x.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}