import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  exportBackupJSON, exportBackupExcel, exportEntityCSV,
  importBackupJSON, ENTITIES
} from "@/utils/backupEngine";
import { toast } from "sonner";
import { Download, Upload, FileJson, FileSpreadsheet, FileText, AlertTriangle, CheckCircle2, Loader2, Database } from "lucide-react";

export default function BackupPanel() {
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [loading, setLoading] = useState(null); // 'json' | 'excel' | 'import' | null
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();

  const onProg = (pct, label) => { setProgress(pct); setProgressLabel(label); };

  async function handleExportJSON() {
    setLoading("json"); setProgress(0); setImportResult(null);
    const count = await exportBackupJSON(onProg);
    toast.success(`تم تصدير ${count.toLocaleString()} سجل بصيغة JSON`);
    setLoading(null); setProgress(0);
  }

  async function handleExportExcel() {
    setLoading("excel"); setProgress(0); setImportResult(null);
    const count = await exportBackupExcel(onProg);
    toast.success(`تم تصدير ${count.toLocaleString()} سجل بصيغة Excel`);
    setLoading(null); setProgress(0);
  }

  async function handleExportCSV(entityKey, label) {
    const count = await exportEntityCSV(entityKey, label);
    toast.success(`تم تصدير ${count} سجل من ${label}`);
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) { toast.error("يرجى اختيار ملف JSON فقط"); return; }

    const confirmed = window.confirm(
      "⚠️ تحذير: سيتم حذف جميع البيانات الحالية واستبدالها بالنسخة الاحتياطية.\n\nهل أنت متأكد؟"
    );
    if (!confirmed) { fileRef.current.value = ""; return; }

    setLoading("import"); setProgress(0); setImportResult(null);
    const results = await importBackupJSON(file, onProg);
    const total = Object.values(results).reduce((s, v) => s + v, 0);
    setImportResult(results);
    toast.success(`تم استيراد ${total.toLocaleString()} سجل بنجاح`);
    setLoading(null); setProgress(0);
    fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <Database className="h-8 w-8 text-blue-600 shrink-0" />
        <div>
          <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">النسخ الاحتياطي الشامل</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            يشمل جميع البيانات: الفواتير، الحسابات، المخزون، الموظفين، الأصول وأكثر من {ENTITIES.length} جدول
          </p>
        </div>
        <Badge className="mr-auto bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">محدّث</Badge>
      </div>

      {/* Progress */}
      {loading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>جارٍ المعالجة: {progressLabel}</span>
            <span className="mr-auto font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Export full backup */}
      <div>
        <p className="text-sm font-semibold mb-3 text-foreground">📤 تصدير نسخة احتياطية كاملة</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExportJSON}
            disabled={!!loading}
            className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 text-right"
          >
            <FileJson className="h-8 w-8 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">تصدير JSON</p>
              <p className="text-xs text-muted-foreground mt-0.5">ملف واحد شامل — يدعم الاستيراد الكامل</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground mr-auto mt-1 shrink-0" />
          </button>

          <button
            onClick={handleExportExcel}
            disabled={!!loading}
            className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 text-right"
          >
            <FileSpreadsheet className="h-8 w-8 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">تصدير Excel</p>
              <p className="text-xs text-muted-foreground mt-0.5">ورقة منفصلة لكل جدول — للمراجعة والتحليل</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground mr-auto mt-1 shrink-0" />
          </button>
        </div>
      </div>

      {/* Import */}
      <div>
        <p className="text-sm font-semibold mb-3 text-foreground">📥 استيراد نسخة احتياطية</p>
        <div
          onClick={() => !loading && fileRef.current?.click()}
          className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-destructive/40 hover:border-destructive hover:bg-destructive/5 cursor-pointer transition-all"
        >
          <div className="p-2 bg-destructive/10 rounded-lg">
            <Upload className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-sm">استيراد من JSON</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              سيُستبدل جميع البيانات الحالية — تأكد من أخذ نسخة احتياطية أولاً
            </p>
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>

      {/* Import results */}
      {importResult && (
        <div className="rounded-xl border bg-green-50 dark:bg-green-950/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="font-semibold text-sm text-green-800 dark:text-green-200">تم الاستيراد بنجاح</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(importResult).map(([k, v]) => {
              const ent = ENTITIES.find(e => e.key === k);
              return v > 0 ? (
                <div key={k} className="flex items-center justify-between p-2 bg-white dark:bg-green-900/20 rounded-lg border text-xs">
                  <span className="text-muted-foreground">{ent?.label || k}</span>
                  <Badge variant="secondary">{v}</Badge>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Per-entity CSV export */}
      <div>
        <p className="text-sm font-semibold mb-3 text-foreground">📊 تصدير جدول مستقل (CSV)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ENTITIES.map(ent => (
            <button
              key={ent.key}
              onClick={() => handleExportCSV(ent.key, ent.label)}
              className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-right text-sm"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate text-xs">{ent.label}</span>
              <Download className="h-3 w-3 text-muted-foreground mr-auto shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}