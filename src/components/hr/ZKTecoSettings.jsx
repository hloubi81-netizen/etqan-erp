import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wifi, WifiOff, RefreshCw, Settings, Info, Copy, CheckCircle, AlertCircle, Zap, Link } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ZKTecoSettings({ onSyncComplete }) {
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zkteco_config") || "{}"); } catch { return {}; }
  });
  const [syncing, setSyncing]     = useState(false);
  const [testing, setTesting]     = useState(false);
  const [lastSync, setLastSync]   = useState(() => localStorage.getItem("zkteco_last_sync") || null);
  const [lastResult, setLastResult] = useState(null);
  const [copied, setCopied]       = useState(false);

  const webhookUrl = `${window.location.origin}/api/functions/syncZKTeco`;

  function saveConfig() {
    localStorage.setItem("zkteco_config", JSON.stringify(config));
    toast.success("تم حفظ الإعدادات");
  }

  // ── Direct ZK Protocol sync ──────────────────────────────────────────────
  async function doDirectSync() {
    if (!config.ip) { toast.error("أدخل عنوان IP الجهاز أولاً"); return; }
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncZKTeco", {
        action: "direct_sync",
        ip: config.ip,
        port: Number(config.port || 4370),
        device_id: config.device_name || config.ip,
      });
      const data = res.data;
      if (data?.success) {
        const now = new Date().toLocaleString("ar-EG");
        setLastSync(now);
        localStorage.setItem("zkteco_last_sync", now);
        setLastResult({ success: true, ...data });
        toast.success(`تم: ${data.created} جديد، ${data.updated} محدّث`);
        onSyncComplete?.();
      } else {
        setLastResult({ success: false, message: data?.error || "فشل الاتصال" });
        toast.error(data?.error || "فشل الاتصال بالجهاز");
      }
    } catch (e) {
      const msg = e.message || "خطأ غير معروف";
      setLastResult({ success: false, message: msg });
      toast.error(msg);
    }
    setSyncing(false);
  }

  // ── Test webhook connectivity ────────────────────────────────────────────
  async function doTest() {
    setTesting(true);
    try {
      const res = await base44.functions.invoke("syncZKTeco", { action: "test" });
      if (res.data?.success) {
        toast.success("الاتصال بالوظيفة يعمل بنجاح");
        setLastResult({ success: true, message: "الاتصال بالخادم يعمل بنجاح" });
      }
    } catch (e) {
      toast.error("فشل: " + e.message);
    }
    setTesting(false);
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Device config — shared by both modes */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4 text-blue-600" />
            إعدادات جهاز البصمة ZKTeco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">عنوان IP للجهاز</Label>
              <Input
                placeholder="192.168.1.201"
                value={config.ip || ""}
                onChange={e => setConfig(c => ({ ...c, ip: e.target.value }))}
                className="mt-1 h-8 text-sm font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">المنفذ (Port)</Label>
              <Input
                placeholder="4370"
                value={config.port || "4370"}
                onChange={e => setConfig(c => ({ ...c, port: e.target.value }))}
                className="mt-1 h-8 text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">اسم الجهاز / المعرف</Label>
            <Input
              placeholder="Device-01 (اختياري)"
              value={config.device_name || ""}
              onChange={e => setConfig(c => ({ ...c, device_name: e.target.value }))}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <Button size="sm" onClick={saveConfig} className="w-full gap-2">
            <Settings className="h-3.5 w-3.5" />
            حفظ الإعدادات
          </Button>
        </CardContent>
      </Card>

      {/* Mode tabs */}
      <Tabs defaultValue="direct" dir="rtl">
        <TabsList className="w-full h-9">
          <TabsTrigger value="direct" className="flex-1 text-xs gap-1.5">
            <Zap className="h-3.5 w-3.5" />بروتوكول ZK مباشر
          </TabsTrigger>
          <TabsTrigger value="webhook" className="flex-1 text-xs gap-1.5">
            <Link className="h-3.5 w-3.5" />Webhook / برنامج وسيط
          </TabsTrigger>
        </TabsList>

        {/* ── Direct sync ───────────────────────────── */}
        <TabsContent value="direct" className="mt-3 space-y-3">
          <Card className="border border-blue-100 bg-blue-50/50 shadow-none">
            <CardContent className="pt-4 pb-4 space-y-2 text-xs text-blue-700">
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">اتصال مباشر عبر بروتوكول ZK (المنفذ 4370)</p>
                  <p className="text-blue-600">يتصل النظام مباشرةً بالجهاز عبر الشبكة ويجلب سجلات الحضور دون برنامج وسيط.</p>
                  <p className="mt-1 text-blue-500">تأكد من أن الجهاز والسيرفر على نفس الشبكة أو الجهاز معرّض للإنترنت على المنفذ 4370.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={doDirectSync}
            disabled={syncing}
            className="w-full gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "جارٍ الاتصال بالجهاز..." : "مزامنة مباشرة الآن"}
          </Button>

          {lastSync && (
            <p className="text-xs text-muted-foreground text-center">آخر مزامنة: {lastSync}</p>
          )}
        </TabsContent>

        {/* ── Webhook / bridge ──────────────────────── */}
        <TabsContent value="webhook" className="mt-3 space-y-3">
          <Card className="border-0 shadow-sm bg-amber-50">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs font-semibold text-amber-700">رابط الـ Webhook للبرنامج الوسيط</p>
              </div>
              <div className="bg-white rounded-lg border border-amber-200 p-2 flex items-center gap-2">
                <code className="text-xs text-gray-600 flex-1 truncate font-mono">{webhookUrl}</code>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={copyWebhook}>
                  {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">خطوات الربط عبر ZKBridge:</p>
              <div className="space-y-2 text-xs text-gray-600">
                {[
                  `ثبّت ZKBridge أو ZKOSS Middleware على جهاز في نفس الشبكة`,
                  `أدخل IP الجهاز (${config.ip || "192.168.x.x"}) والمنفذ ${config.port || "4370"}`,
                  "اضبط الـ Webhook URL على الرابط أعلاه",
                  "تأكد أن رقم الموظف في الجهاز يطابق رقمه في النظام",
                ].map((step, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="bg-amber-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-gray-50 rounded-lg p-2.5">
                <p className="text-[11px] font-mono text-gray-500 mb-1">صيغة JSON المطلوبة:</p>
                <pre className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap">{`{
  "action": "push_logs",
  "device_id": "Device-01",
  "logs": [{"user_id":"001","timestamp":"2026-06-11T08:30:00","punch_type":0}]
}`}</pre>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={doTest} disabled={testing} className="w-full gap-2">
            <Wifi className={`h-4 w-4 ${testing ? "animate-spin" : ""}`} />
            {testing ? "جارٍ الاختبار..." : "اختبار الاتصال بالخادم"}
          </Button>
        </TabsContent>
      </Tabs>

      {/* Result */}
      {lastResult && (
        <div className={`flex items-center gap-2 text-xs p-2.5 rounded-lg ${lastResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {lastResult.success
            ? <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
          <div>
            {lastResult.message && <p>{lastResult.message}</p>}
            {lastResult.success && lastResult.created !== undefined && (
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge className="bg-green-100 text-green-700 text-[10px]">جديد: {lastResult.created}</Badge>
                <Badge className="bg-blue-100 text-blue-700 text-[10px]">محدّث: {lastResult.updated}</Badge>
                <Badge className="bg-gray-100 text-gray-700 text-[10px]">تجاهل: {lastResult.skipped}</Badge>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}