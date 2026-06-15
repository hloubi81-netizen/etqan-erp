import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Link2, Unlink, CheckCircle2, Loader2, AlertCircle,
  Clock, ArrowRightLeft, RefreshCw, ExternalLink
} from "lucide-react";

const CONNECTOR_ID = "6a2f820e9d36c7b03419cd81";

export default function GoogleCalendarIntegration() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [recentSyncs, setRecentSyncs] = useState([]);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const authed = await base44.auth.isAuthenticated();
    if (!authed) { setLoading(false); return; }
    const me = await base44.auth.me().catch(() => null);
    setUser(me);
    await fetchStatus();
    setLoading(false);
  }

  async function fetchStatus() {
    try {
      const res = await base44.functions.invoke("addCrmActivityToCalendar", {});
      if (res.data?.status === "skipped" || res.data?.status === "success") {
        setConnected(true);
        await fetchRecentEvents();
      }
    } catch {
      setConnected(false);
    }
  }

  async function fetchRecentEvents() {
    try {
      const activities = await base44.entities.CRMActivity.filter(
        { type: { $in: ["اجتماع", "مهمة"] } },
        "-created_date",
        10
      );
      setRecentSyncs(activities || []);
    } catch {
      setRecentSyncs([]);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, "_blank");
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        fetchStatus();
        setConnecting(false);
      }
    }, 500);
  }

  async function handleDisconnect() {
    if (!confirm("هل أنت متأكد من إلغاء ربط تقويم جوجل؟ لن تُضاف الأنشطة الجديدة إلى تقويمك.")) return;
    setDisconnecting(true);
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
    setEvents([]);
    setDisconnecting(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="text-center py-12">
      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground mb-3">يجب تسجيل الدخول لربط تقويم جوجل</p>
      <Button onClick={() => base44.auth.redirectToLogin()}>تسجيل الدخول</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            تكامل تقويم جوجل
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ربط تقويم جوجل الشخصي لإضافة مواعيد الاجتماعات والمهام تلقائياً
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            حالة الربط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${connected ? "bg-green-100" : "bg-muted"}`}>
                {connected
                  ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                  : <Calendar className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {connected ? "متصل بتقويم جوجل" : "غير متصل"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {connected
                    ? "تتم إضافة الاجتماعات والمهام الجديدة تلقائياً إلى تقويمك"
                    : "اضغط على زر الربط لتوصيل تقويم جوجل بحسابك"}
                </p>
              </div>
            </div>
            {connected ? (
              <Button variant="outline" onClick={handleDisconnect} disabled={disconnecting} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                إلغاء الربط
              </Button>
            ) : (
              <Button onClick={handleConnect} disabled={connecting} className="gap-2">
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                ربط تقويم جوجل
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            كيف تعمل المزامنة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {[
              {
                step: "1",
                title: "إنشاء نشاط في CRM",
                desc: "عند إضافة اجتماع أو مهمة جديدة في إدارة العملاء (CRM)، يتم إرسالها تلقائياً إلى تقويم جوجل.",
                icon: Calendar,
                color: "bg-blue-500",
              },
              {
                step: "2",
                title: "إضافة الحدث إلى التقويم",
                desc: "يتم إنشاء حدث في تقويم جوجل بنفس التاريخ والوقت والمدة، مع تضمين تفاصيل النشاط وجهة الاتصال.",
                icon: ArrowRightLeft,
                color: "bg-green-500",
              },
              {
                step: "3",
                title: "إشعار وتنبيه",
                desc: "يصلك إشعار من تقويم جوجل قبل موعد الاجتماع أو المهمة حسب إعدادات التقويم الخاص بك.",
                icon: Clock,
                color: "bg-purple-500",
              },
            ].map(({ step, title, desc, icon: Icon, color }) => (
              <div key={step} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/10">
                <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {step}
                </div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* الأنشطة المتزامنة مؤخراً */}
      {connected && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                آخر الأنشطة المزامنة
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchRecentEvents}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentSyncs.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                لا توجد أنشطة مزامنة بعد. قم بإضافة اجتماع أو مهمة جديدة في CRM.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2.5 text-right font-medium text-muted-foreground">النوع</th>
                      <th className="p-2.5 text-right font-medium text-muted-foreground">الموضوع</th>
                      <th className="p-2.5 text-right font-medium text-muted-foreground">التاريخ</th>
                      <th className="p-2.5 text-right font-medium text-muted-foreground">جهة الاتصال</th>
                      <th className="p-2.5 text-right font-medium text-muted-foreground">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSyncs.map((a) => (
                      <tr key={a.id} className="border-t border-border hover:bg-muted/20">
                        <td className="p-2.5">
                          <Badge className="text-[10px]" variant={a.type === "اجتماع" ? "default" : "secondary"}>
                            {a.type}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-medium">{a.subject || "—"}</td>
                        <td className="p-2.5 text-muted-foreground">{a.date}</td>
                        <td className="p-2.5 text-muted-foreground">{a.contact_name || "—"}</td>
                        <td className="p-2.5">
                          <Badge className="text-[10px] bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-2.5 w-2.5" /> تمت المزامنة
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* معلومات إضافية */}
      <Card className="bg-muted/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>ملاحظات:</strong></p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>كل مستخدم يربط تقويم جوجل <strong>الخاص به</strong> — التقويم شخصي لكل حساب.</li>
                <li>تتم المزامنة تلقائياً عند إضافة اجتماع أو مهمة جديدة من صفحة CRM.</li>
                <li>يمكن إلغاء الربط في أي وقت من هذه الصفحة.</li>
                <li>الصلاحية المطلوبة: إضافة وتعديل الأحداث فقط، لا يمكن للمنصة قراءة أو حذف الأحداث الموجودة.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}