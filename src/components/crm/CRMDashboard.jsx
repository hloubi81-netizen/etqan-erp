import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Activity, DollarSign, Target, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const STAGE_COLORS_MAP = {
  "تواصل أولي": "#94a3b8",
  "تأهيل": "#60a5fa",
  "عرض سعر": "#f59e0b",
  "تفاوض": "#8b5cf6",
  "مكسوبة": "#22c55e",
  "خسارة": "#ef4444",
};

const CHART_COLORS = ["#2563eb","#16a34a","#ea580c","#9333ea","#0891b2","#dc2626"];

export default function CRMDashboard({ contacts, opportunities, activities, onTabChange }) {
  const today = new Date().toISOString().split("T")[0];

  const activeOpps = opportunities.filter(o => o.stage !== "مكسوبة" && o.stage !== "خسارة");
  const wonOpps = opportunities.filter(o => o.stage === "مكسوبة");
  const totalPipelineValue = activeOpps.reduce((s, o) => s + (o.expected_value || 0), 0);
  const totalWonValue = wonOpps.reduce((s, o) => s + (o.expected_value || 0), 0);
  const weightedValue = activeOpps.reduce((s, o) => s + ((o.expected_value || 0) * (o.probability || 0) / 100), 0);
  const winRate = opportunities.length > 0 ? Math.round(wonOpps.length / opportunities.length * 100) : 0;

  // Overdue follow-ups
  const overdueFollowups = contacts.filter(c => c.next_followup_date && c.next_followup_date < today);
  const todayActivities = activities.filter(a => a.date === today);

  // Stage distribution for pipeline chart
  const stageData = ["تواصل أولي","تأهيل","عرض سعر","تفاوض"].map(stage => ({
    name: stage,
    count: opportunities.filter(o => o.stage === stage).length,
    value: opportunities.filter(o => o.stage === stage).reduce((s, o) => s + (o.expected_value || 0), 0),
  }));

  // Contact type distribution
  const typeData = ["عميل محتمل","عميل","مورد","شريك"].map(t => ({
    name: t, value: contacts.filter(c => c.type === t).length
  })).filter(d => d.value > 0);

  // Recent activities
  const recentActivities = activities.slice(0, 5);

  return (
    <div className="space-y-5 mt-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">جهات الاتصال</p>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{contacts.length}</p>
            <p className="text-xs text-muted-foreground">{contacts.filter(c => c.type === "عميل محتمل").length} محتمل</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 dark:border-purple-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">قيمة خط الأنابيب</p>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{totalPipelineValue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground">مرجّح: {weightedValue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/40 dark:bg-green-950/20 dark:border-green-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">الصفقات المكسوبة</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{totalWonValue.toLocaleString("ar-EG", { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground">معدل الفوز: {winRate}%</p>
          </CardContent>
        </Card>

        <Card className={overdueFollowups.length > 0 ? "border-red-200 bg-red-50/40 dark:bg-red-950/20" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">متابعات متأخرة</p>
              <AlertCircle className={`h-4 w-4 ${overdueFollowups.length > 0 ? "text-red-500" : "text-muted-foreground"}`} />
            </div>
            <p className={`text-2xl font-bold ${overdueFollowups.length > 0 ? "text-red-600" : ""}`}>{overdueFollowups.length}</p>
            <p className="text-xs text-muted-foreground">{todayActivities.length} نشاط اليوم</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pipeline by Stage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">توزيع الفرص حسب المرحلة</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stageData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v, name) => [v.toLocaleString("ar-EG"), name === "value" ? "القيمة" : "العدد"]} />
                <Bar dataKey="count" fill="#2563eb" radius={[4,4,0,0]} name="العدد" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contact Type Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">توزيع جهات الاتصال</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-16 text-muted-foreground text-sm">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue followups + Recent Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {overdueFollowups.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-red-600">متابعات متأخرة</CardTitle>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onTabChange("contacts")}>عرض الكل</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueFollowups.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-950/20 text-sm">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.company}</p>
                  </div>
                  <Badge variant="destructive" className="text-xs">{c.next_followup_date}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">آخر الأنشطة</CardTitle>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onTabChange("activities")}>عرض الكل</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivities.length === 0 && <p className="text-center py-6 text-muted-foreground text-sm">لا توجد أنشطة</p>}
            {recentActivities.map(a => (
              <div key={a.id} className="flex items-start gap-2 p-2 rounded bg-muted/30 text-sm">
                <div className="mt-0.5 text-base">
                  {a.type === "مكالمة" ? "📞" : a.type === "اجتماع" ? "🤝" : a.type === "بريد إلكتروني" ? "✉️" : a.type === "رسالة واتساب" ? "💬" : a.type === "زيارة" ? "🚗" : "📝"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{a.subject}</p>
                  <p className="text-xs text-muted-foreground">{a.contact_name} · {a.date}</p>
                </div>
                {a.outcome && (
                  <Badge variant={a.outcome === "ناجح" ? "default" : "outline"} className="text-xs shrink-0">
                    {a.outcome}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}