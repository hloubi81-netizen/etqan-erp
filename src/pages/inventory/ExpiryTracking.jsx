import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Clock, CheckCircle2, RefreshCw, Bell, Package, CalendarX } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, format, parseISO } from "date-fns";

const ALERT_THRESHOLDS = [
  { label: "30 يوماً", days: 30 },
  { label: "60 يوماً", days: 60 },
  { label: "90 يوماً", days: 90 },
  { label: "180 يوماً", days: 180 },
];

function getStatus(daysLeft) {
  if (daysLeft < 0) return { label: "منتهي الصلاحية", variant: "destructive", icon: CalendarX, color: "text-red-600", bg: "bg-red-50 border-red-200" };
  if (daysLeft <= 30) return { label: "حرج (< 30 يوم)", variant: "destructive", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 border-red-200" };
  if (daysLeft <= 90) return { label: "تحذير (< 90 يوم)", variant: "secondary", icon: Clock, color: "text-orange-500", bg: "bg-orange-50 border-orange-200" };
  return { label: "طبيعي", variant: "outline", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 border-green-200" };
}

export default function ExpiryTracking() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [threshold, setThreshold] = useState(90);
  const [sendingAlerts, setSendingAlerts] = useState(false);

  useEffect(() => {
    base44.entities.Product.list().then((p) => {
      setProducts(p);
      setLoading(false);
    });
  }, []);

  const today = new Date();

  const withExpiry = products
    .filter((p) => p.expiry_date)
    .map((p) => {
      const daysLeft = differenceInDays(parseISO(p.expiry_date), today);
      return { ...p, daysLeft };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const filtered = withExpiry.filter((p) => {
    const matchSearch = !search || p.name?.includes(search) || p.item_code?.includes(search);
    if (!matchSearch) return false;
    if (filterStatus === "expired") return p.daysLeft < 0;
    if (filterStatus === "critical") return p.daysLeft >= 0 && p.daysLeft <= 30;
    if (filterStatus === "warning") return p.daysLeft > 30 && p.daysLeft <= 90;
    if (filterStatus === "ok") return p.daysLeft > 90;
    return true;
  });

  const expired = withExpiry.filter((p) => p.daysLeft < 0).length;
  const critical = withExpiry.filter((p) => p.daysLeft >= 0 && p.daysLeft <= 30).length;
  const warning = withExpiry.filter((p) => p.daysLeft > 30 && p.daysLeft <= threshold).length;
  const total = withExpiry.length;

  async function sendExpiryAlerts() {
    setSendingAlerts(true);
    const toAlert = withExpiry.filter((p) => p.daysLeft <= threshold);
    if (toAlert.length === 0) {
      toast.success("لا توجد منتجات تستدعي التنبيه حالياً");
      setSendingAlerts(false);
      return;
    }
    let created = 0;
    for (const p of toAlert) {
      const status = getStatus(p.daysLeft);
      await base44.entities.Notification.create({
        title: p.daysLeft < 0 ? `⛔ منتهي الصلاحية: ${p.name}` : `⚠️ اقتراب انتهاء صلاحية: ${p.name}`,
        message: p.daysLeft < 0
          ? `المنتج "${p.name}" (${p.item_code}) انتهت صلاحيته بتاريخ ${format(parseISO(p.expiry_date), "yyyy-MM-dd")}. يرجى سحبه من المخزون فوراً.`
          : `المنتج "${p.name}" (${p.item_code}) ستنتهي صلاحيته خلال ${p.daysLeft} يوم (${format(parseISO(p.expiry_date), "yyyy-MM-dd")}). يرجى اتخاذ الإجراء اللازم.`,
        type: "تنبيه مخزون",
        related_module: "المخزون",
        related_id: p.id,
        is_read: false,
        trigger_date: new Date().toISOString().split("T")[0],
      }).catch(() => {});
      created++;
    }
    setSendingAlerts(false);
    toast.success(`تم إرسال ${created} تنبيه انتهاء صلاحية`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarX className="h-6 w-6 text-red-500" />
            تتبع انتهاء الصلاحية
          </h1>
          <p className="text-sm text-muted-foreground mt-1">مراقبة تواريخ انتهاء صلاحية المنتجات وإرسال التنبيهات</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(threshold)} onValueChange={(v) => setThreshold(Number(v))}>
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALERT_THRESHOLDS.map((t) => (
                <SelectItem key={t.days} value={String(t.days)}>تنبيه قبل {t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={sendExpiryAlerts} disabled={sendingAlerts} className="gap-2 bg-orange-500 hover:bg-orange-600">
            <Bell className={`h-4 w-4 ${sendingAlerts ? "animate-pulse" : ""}`} />
            {sendingAlerts ? "جاري الإرسال..." : "إرسال التنبيهات"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "منتهية الصلاحية", value: expired, bg: "bg-red-500", Icon: CalendarX },
          { label: "حرجة (< 30 يوم)", value: critical, bg: "bg-orange-500", Icon: AlertTriangle },
          { label: `تحذير (< ${threshold} يوم)`, value: warning, bg: "bg-yellow-500", Icon: Clock },
          { label: "إجمالي المتتبعة", value: total, bg: "bg-blue-600", Icon: Package },
        ].map(({ label, value, bg, Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="بحث بالاسم أو الكود..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-56"
        />
        <div className="flex gap-1 flex-wrap">
          {[
            { key: "all", label: "الكل" },
            { key: "expired", label: "منتهية" },
            { key: "critical", label: "حرجة" },
            { key: "warning", label: "تحذير" },
            { key: "ok", label: "طبيعي" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                filterStatus === f.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted-foreground/20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {withExpiry.length === 0
              ? "لا توجد منتجات لها تاريخ انتهاء صلاحية مسجّل. أضف تاريخ الصلاحية من صفحة المنتجات."
              : "لا توجد منتجات تطابق الفلتر المحدد."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["الكود", "اسم المنتج", "تاريخ الانتهاء", "الأيام المتبقية", "الحالة"].map((h) => (
                    <th key={h} className="p-3 text-right text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const st = getStatus(p.daysLeft);
                  const Icon = st.icon;
                  return (
                    <tr key={p.id} className={`border-t border-border hover:bg-muted/20 ${st.bg}`}>
                      <td className="p-3 text-xs text-muted-foreground font-mono">{p.item_code}</td>
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 text-xs">{format(parseISO(p.expiry_date), "yyyy-MM-dd")}</td>
                      <td className={`p-3 font-bold ${st.color}`}>
                        {p.daysLeft < 0 ? `منتهي منذ ${Math.abs(p.daysLeft)} يوم` : `${p.daysLeft} يوم`}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-4 w-4 ${st.color}`} />
                          <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                        </div>
                      </td>
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