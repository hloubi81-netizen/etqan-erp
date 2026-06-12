import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sheet, Link2, RefreshCw, Upload, Download,
  CheckCircle2, XCircle, Loader2, ExternalLink, LogIn
} from "lucide-react";

const CONNECTOR_ID = "6a2c415b525a77504f309883";

export default function InventorySheetsSync() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [lastResult, setLastResult] = useState(null);

  // Rule 2: reusable fetch to detect connection
  const checkConnection = async () => {
    try {
      await base44.functions.invoke("syncInventoryToSheets", { action: "export", spreadsheetId: "__test__" });
      setConnected(true);
    } catch (e) {
      // If the error is about spreadsheet not found, user IS connected
      if (e?.message?.includes("spreadsheetId") || e?.message?.includes("export")) {
        setConnected(true);
      } else {
        setConnected(false);
      }
    }
  };

  // Rule 1+2
  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        await checkConnection();
      }
      setLoading(false);
    });
  }, []);

  // Rule 3: popup + poll
  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, "_blank");
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        checkConnection().then(() => setLoading(false));
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
    setLastResult(null);
    toast.success("تم فصل الحساب بنجاح");
  };

  const handleExport = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncInventoryToSheets", {
        action: "export",
        spreadsheetId: spreadsheetId || null
      });
      setLastResult({ type: "export", ...res.data });
      if (!spreadsheetId && res.data.spreadsheetId) {
        setSpreadsheetId(res.data.spreadsheetId);
      }
      toast.success(`تم تصدير ${res.data.rowsExported} صنف إلى Google Sheets`);
    } catch (e) {
      toast.error("فشل التصدير: " + e.message);
    }
    setSyncing(false);
  };

  const handleImport = async () => {
    if (!spreadsheetId) {
      toast.error("أدخل معرّف جدول البيانات أولاً");
      return;
    }
    setImporting(true);
    try {
      const res = await base44.functions.invoke("syncInventoryToSheets", {
        action: "import",
        spreadsheetId
      });
      setLastResult({ type: "import", ...res.data });
      toast.success(`تم تحديث ${res.data.rowsUpdated} صنف من Google Sheets`);
    } catch (e) {
      toast.error("فشل الاستيراد: " + e.message);
    }
    setImporting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">يجب تسجيل الدخول أولاً</p>
        <Button onClick={() => base44.auth.redirectToLogin()}>
          <LogIn className="h-4 w-4 ml-2" />
          تسجيل الدخول
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <Sheet className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold">مزامنة المخزون مع Google Sheets</h1>
          <p className="text-sm text-muted-foreground">تصدير واستيراد بيانات الأصناف من جداول بيانات Google</p>
        </div>
      </div>

      {/* Connection Card */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${connected ? "bg-green-100" : "bg-gray-100"}`}>
              {connected
                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                : <XCircle className="h-5 w-5 text-gray-400" />
              }
            </div>
            <div>
              <p className="font-medium text-sm">
                {connected ? "متصل بـ Google Sheets" : "غير متصل"}
              </p>
              <p className="text-xs text-muted-foreground">
                {connected ? user?.email : "اربط حسابك للبدء"}
              </p>
            </div>
          </div>
          {connected ? (
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              <XCircle className="h-4 w-4 ml-1" />
              فصل الحساب
            </Button>
          ) : (
            <Button size="sm" onClick={handleConnect}>
              <Link2 className="h-4 w-4 ml-1" />
              ربط حساب Google
            </Button>
          )}
        </CardContent>
      </Card>

      {connected && (
        <>
          {/* Spreadsheet ID */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <label className="text-sm font-medium">معرّف جدول البيانات (اختياري للتصدير)</label>
              <div className="flex gap-2">
                <Input
                  dir="ltr"
                  placeholder="مثال: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  value={spreadsheetId}
                  onChange={e => setSpreadsheetId(e.target.value)}
                  className="text-sm font-mono"
                />
                {spreadsheetId && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                إذا تركته فارغاً، سيتم إنشاء جدول بيانات جديد تلقائياً عند التصدير.
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleExport} disabled={syncing} className="gap-2 h-12">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              تصدير المخزون
            </Button>
            <Button onClick={handleImport} disabled={importing || !spreadsheetId} variant="outline" className="gap-2 h-12">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              استيراد التعديلات
            </Button>
          </div>

          {/* Result */}
          {lastResult && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-semibold text-green-800">
                    {lastResult.type === "export" ? "تم التصدير بنجاح" : "تم الاستيراد بنجاح"}
                  </p>
                </div>
                {lastResult.type === "export" && (
                  <div className="space-y-1">
                    <p className="text-xs text-green-700">
                      تم تصدير <strong>{lastResult.rowsExported}</strong> صنف
                    </p>
                    <a
                      href={lastResult.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-700 underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      فتح جدول البيانات في Google Sheets
                    </a>
                  </div>
                )}
                {lastResult.type === "import" && (
                  <p className="text-xs text-green-700">
                    تم تحديث <strong>{lastResult.rowsUpdated}</strong> صنف في المخزون
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">الحقول المُصدَّرة:</p>
              <div className="flex flex-wrap gap-1">
                {["رمز الصنف","اسم الصنف","المجموعة","الكمية المتاحة","سعر التكلفة","سعر الجملة","سعر المستهلك","الباركود","المنشأ"].map(f => (
                  <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                عند الاستيراد، يتم تحديث الأصناف الموجودة فقط بناءً على رمز الصنف.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}