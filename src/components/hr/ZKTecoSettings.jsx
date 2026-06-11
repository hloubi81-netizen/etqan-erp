import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wifi, WifiOff, RefreshCw, Settings, Info, Copy, CheckCircle, AlertCircle } from "lucide-react";

export default function ZKTecoSettings({ onSyncComplete }) {
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zkteco_config") || "{}"); } catch { return {}; }
  });
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(() => localStorage.getItem("zkteco_last_sync") || null);
  const [lastResult, setLastResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${window.location.origin}/api/functions/syncZKTeco`;

  function saveConfig(updates) {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem("zkteco_config", JSON.stringify(newConfig));
    toast.success("تم حفظ الإعدادات");
  }

  async function doSync() {
    setSyncing(true);
    try {
      // Manual sync: call the function with a test ping
      const res = await base44.functions.invoke("syncZKTeco", { action: "test" });
      if (res.data?.success) {
        toast.success("الاتصال بالوظيفة يعمل بنجاح");
        const now = new Date().toLocaleString("ar-EG");
        setLastSync(now);
        localStorage.setItem("zkteco_last_sync", now);
        setLastResult({ success: true, message: "تم الاتصال بنجاح" });
        onSyncComplete?.();
      }
    } catch (e) {
      toast.error("فشل الاتصال: " + e.message);
      setLastResult({ success: false, message: e.message });
    }
    setSyncing(false);
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Connection Status */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4 text-blue-600" />
            إعدادات جهاز البصمة ZKTeco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">عنوان IP للجهاز</Label>
              <Input
                placeholder="192.168.1.100"
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
          <Button size="sm" onClick={() => saveConfig(config)} className="w-full gap-2">
            <Settings className="h-3.5 w-3.5" />
            حفظ الإعدادات
          </Button>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card className="border-0 shadow-sm bg-blue-50">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <p className="text-xs font-semibold text-blue-700">رابط الـ Webhook لربط البرنامج الوسيط</p>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-2 flex items-center gap-2">
            <code className="text-xs text-gray-600 flex-1 truncate font-mono">{webhookUrl}</code>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={copyWebhook}>
              {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="text-[11px] text-blue-600">
            استخدم هذا الرابط في برنامج <strong>ZKBridge</strong> أو أي برنامج وسيط لإرسال سجلات الحضور تلقائياً.
          </p>
        </CardContent>
      </Card>

      {/* Bridge Setup Guide */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1">
            <Info className="h-3.5 w-3.5 text-amber-500" />
            كيفية ربط الجهاز (تعليمات البرنامج الوسيط)
          </p>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex gap-2">
              <span className="bg-blue-600 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
              <p>ثبّت <strong>ZKBridge</strong> أو <strong>ZKOSS Middleware</strong> على جهاز كمبيوتر في نفس الشبكة</p>
            </div>
            <div className="flex gap-2">
              <span className="bg-blue-600 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
              <p>أدخل IP الجهاز <strong>{config.ip || "192.168.x.x"}</strong> والمنفذ <strong>{config.port || "4370"}</strong></p>
            </div>
            <div className="flex gap-2">
              <span className="bg-blue-600 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
              <p>اضبط الـ Webhook URL على الرابط أعلاه مع إرسال البيانات بصيغة JSON</p>
            </div>
            <div className="flex gap-2">
              <span className="bg-blue-600 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
              <p>تأكد من أن <strong>رقم الموظف</strong> في الجهاز يطابق <strong>رقم الموظف</strong> في النظام</p>
            </div>
          </div>

          <div className="mt-3 bg-gray-50 rounded-lg p-2.5">
            <p className="text-[11px] font-mono text-gray-500 mb-1">صيغة JSON المطلوبة:</p>
            <pre className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap">{`{
  "action": "push_logs",
  "device_id": "Device-01",
  "logs": [{
    "user_id": "001",
    "timestamp": "2026-06-11T08:30:00",
    "punch_type": 0
  }]
}`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Manual Sync */}
      <div className="flex items-center gap-3">
        <Button
          onClick={doSync}
          disabled={syncing}
          variant="outline"
          className="flex-1 gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "جارٍ الاختبار..." : "اختبار الاتصال"}
        </Button>
        {lastSync && (
          <div className="text-xs text-gray-400">آخر مزامنة: {lastSync}</div>
        )}
      </div>

      {lastResult && (
        <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${lastResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {lastResult.success ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {lastResult.message}
        </div>
      )}
    </div>
  );
}