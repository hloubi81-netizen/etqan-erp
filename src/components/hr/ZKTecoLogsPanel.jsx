import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw, Upload, CheckCircle, AlertCircle, Clock } from "lucide-react";

export default function ZKTecoLogsPanel({ onSynced }) {
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [rawInput, setRawInput] = useState("");

  // Manual JSON push: for admins who want to paste exported ZKTeco logs
  async function pushManualLogs() {
    if (!rawInput.trim()) { toast.error("أدخل بيانات السجلات أولاً"); return; }
    let logs;
    try { logs = JSON.parse(rawInput); } catch { toast.error("صيغة JSON غير صحيحة"); return; }
    if (!Array.isArray(logs)) logs = [logs];

    setUploading(true);
    try {
      const res = await base44.functions.invoke("syncZKTeco", {
        action: "push_logs",
        device_id: "manual_import",
        logs,
      });
      setResult(res.data);
      if (res.data?.success) {
        toast.success(`تم: ${res.data.created} جديد، ${res.data.updated} محدّث`);
        setRawInput("");
        onSynced?.();
      }
    } catch (e) {
      toast.error("خطأ: " + e.message);
    }
    setUploading(false);
  }

  // Import from CSV file (exported from ZKTeco software)
  async function importCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyncing(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      // Common ZKTeco CSV format: No, UserID, Time, State, Type
      const logs = [];
      for (const line of lines.slice(1)) { // skip header
        const parts = line.split(",").map(s => s.trim().replace(/"/g, ""));
        if (parts.length >= 3) {
          const [, userId, timestamp, punchType] = parts;
          if (userId && timestamp) {
            logs.push({
              user_id: userId,
              timestamp: timestamp.replace(" ", "T"),
              punch_type: parseInt(punchType || "0") || 0,
            });
          }
        }
      }

      if (logs.length === 0) { toast.error("لم يتم العثور على سجلات في الملف"); setSyncing(false); return; }

      const res = await base44.functions.invoke("syncZKTeco", {
        action: "push_logs",
        device_id: "csv_import",
        logs,
      });
      setResult(res.data);
      if (res.data?.success) {
        toast.success(`تم استيراد ${logs.length} سجل: ${res.data.created} جديد، ${res.data.updated} محدّث`);
        onSynced?.();
      }
    } catch (err) {
      toast.error("خطأ في قراءة الملف: " + err.message);
    }
    setSyncing(false);
    e.target.value = "";
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* CSV Import */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4 text-green-600" />
            استيراد من ملف CSV (تصدير برنامج ZKTeco)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className={`flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors ${syncing ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload className="h-8 w-8 text-gray-400" />
            <span className="text-sm text-gray-500">اسحب ملف CSV أو اضغط للاختيار</span>
            <span className="text-xs text-gray-400">تنسيق: رقم، كود الموظف، الوقت، النوع</span>
            <input type="file" accept=".csv,.txt" className="hidden" onChange={importCSV} />
          </label>
          {syncing && (
            <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              جارٍ المعالجة...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual JSON Input */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            إدخال يدوي (JSON)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full h-28 text-xs font-mono border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder={`[{"user_id":"001","timestamp":"2026-06-11T08:30:00","punch_type":0}]`}
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
          />
          <Button
            size="sm"
            onClick={pushManualLogs}
            disabled={uploading}
            className="w-full gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${uploading ? "animate-spin" : ""}`} />
            {uploading ? "جارٍ المعالجة..." : "رفع السجلات"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={`border-0 shadow-sm ${result.success ? "bg-green-50" : "bg-red-50"}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              {result.success
                ? <CheckCircle className="h-4 w-4 text-green-600" />
                : <AlertCircle className="h-4 w-4 text-red-600" />}
              <span className="text-sm font-semibold">{result.success ? "تمت المزامنة بنجاح" : "حدث خطأ"}</span>
            </div>
            {result.success && (
              <div className="flex gap-3 flex-wrap">
                <Badge className="bg-green-100 text-green-700 text-xs">جديد: {result.created}</Badge>
                <Badge className="bg-blue-100 text-blue-700 text-xs">محدّث: {result.updated}</Badge>
                <Badge className="bg-gray-100 text-gray-700 text-xs">تجاهل: {result.skipped}</Badge>
              </div>
            )}
            {result.errors?.length > 0 && (
              <p className="text-xs text-red-600 mt-1">{result.errors[0]?.error}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}