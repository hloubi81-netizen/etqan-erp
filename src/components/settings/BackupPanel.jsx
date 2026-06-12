import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  exportBackupJSON, exportBackupExcel, exportBackupCSV, exportBackupHTML,
  exportEntityCSV, ENTITIES, saveBackupLog, getBackupLogs
} from "@/utils/backupEngine";
import ImportBackupPanel from "./ImportBackupPanel";
import { toast } from "sonner";
import {
  Download, Upload, FileJson, FileSpreadsheet, FileText, Database, FileCode,
  History, Clock, ChevronDown, ChevronUp, Table2, Loader2
} from "lucide-react";

const EXPORT_FORMATS = [
  {
    id: "json",
    label: "JSON",
    sublabel: "نسخة كاملة قابلة للاستيراد",
    icon: FileJson,
    color: "text-amber-500",
    border: "hover:border-amber-400",
    note: "مثالي للنسخ الاحتياطي والاستعادة الكاملة",
    fn: exportBackupJSON,
  },
  {
    id: "excel",
    label: "Excel (XLSX)",
    sublabel: "ورقة منفصلة لكل جدول",
    icon: FileSpreadsheet,
    color: "text-green-600",
    border: "hover:border-green-400",
    note: "مثالي للتحليل في Microsoft Excel أو Google Sheets",
    fn: exportBackupExcel,
  },
  {
    id: "csv",
    label: "CSV شامل",
    sublabel: "جميع الجداول في ملف واحد",
    icon: Table2,
    color: "text-blue-500",
    border: "hover:border-blue-400",
    note: "متوافق مع معظم برامج قواعد البيانات والجداول",
    fn: exportBackupCSV,
  },
  {
    id: "html",
    label: "HTML / PDF",
    sublabel: "تقرير منسّق قابل للطباعة",
    icon: FileCode,
    color: "text-purple-500",
    border: "hover:border-purple-400",
    note: "افتح الملف في المتصفح ثم اطبعه كـ PDF",
    fn: exportBackupHTML,
  },
];

export default function BackupPanel() {
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [loading, setLoading] = useState(null);
  const [logs, setLogs] = useState(getBackupLogs);
  const [showLogs, setShowLogs] = useState(false);
  const [showCsvList, setShowCsvList] = useState(false);

  const onProg = (pct, label) => { setProgress(pct); setProgressLabel(label); };

  async function handleExport(format) {
    setLoading(format.id);
    setProgress(0);
    const count = await format.fn(onProg);
    saveBackupLog(format.label, count);
    setLogs(getBackupLogs());
    toast.success(`✅ تم تصدير ${count.toLocaleString()} سجل بصيغة ${format.label}`);
    setLoading(null);
    setProgress(0);
  }

  async function handleExportCSV(entityKey, label) {
    const count = await exportEntityCSV(entityKey, label);
    toast.success(`تم تصدير ${count} سجل من ${label}`);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <Database className="h-8 w-8 text-blue-600 shrink-0" />
        <div>
          <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">إدارة البيانات والنسخ الاحتياطي</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            تصدير واستيراد البيانات بصيغ متعددة — يشمل أكثر من {ENTITIES.length} جدول
          </p>
        </div>
        <Badge className="mr-auto bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">محدّث</Badge>
      </div>

      <Tabs defaultValue="export">
        <TabsList className="w-full">
          <TabsTrigger value="export" className="flex-1 gap-2">
            <Download className="h-4 w-4" /> تصدير البيانات
          </TabsTrigger>
          <TabsTrigger value="import" className="flex-1 gap-2">
            <Upload className="h-4 w-4" /> استيراد البيانات
          </TabsTrigger>
        </TabsList>

        {/* ── Export Tab ── */}
        <TabsContent value="export" className="space-y-5 mt-4">
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

          {/* Export formats */}
          <div>
            <p className="text-sm font-semibold mb-3 text-foreground">📤 تصدير نسخة احتياطية كاملة</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EXPORT_FORMATS.map((fmt) => {
                const Icon = fmt.icon;
                const isActive = loading === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => handleExport(fmt)}
                    disabled={!!loading}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 border-dashed ${fmt.border} hover:bg-primary/5 transition-all disabled:opacity-50 text-right relative overflow-hidden`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    <Icon className={`h-8 w-8 ${fmt.color} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{fmt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmt.sublabel}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 leading-relaxed">{fmt.note}</p>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Per-entity CSV */}
          <div>
            <button
              onClick={() => setShowCsvList(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground w-full text-right"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              📊 تصدير جدول مستقل (CSV)
              {showCsvList ? <ChevronUp className="h-4 w-4 mr-auto" /> : <ChevronDown className="h-4 w-4 mr-auto" />}
            </button>
            {showCsvList && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {ENTITIES.map(ent => (
                  <button
                    key={ent.key}
                    onClick={() => handleExportCSV(ent.key, ent.label)}
                    className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-right"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate text-xs">{ent.label}</span>
                    <Download className="h-3 w-3 text-muted-foreground mr-auto shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Backup history */}
          {logs.length > 0 && (
            <div>
              <button
                onClick={() => setShowLogs(v => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-foreground w-full text-right"
              >
                <History className="h-4 w-4 text-muted-foreground" />
                🕓 سجل النسخ الاحتياطية ({logs.length})
                {showLogs ? <ChevronUp className="h-4 w-4 mr-auto" /> : <ChevronDown className="h-4 w-4 mr-auto" />}
              </button>
              {showLogs && (
                <div className="mt-3 space-y-2">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium">{log.format}</span>
                      <Badge variant="outline" className="text-[10px]">{log.recordCount?.toLocaleString()} سجل</Badge>
                      <span className="mr-auto text-muted-foreground">
                        {new Date(log.date).toLocaleString("ar-EG")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Import Tab ── */}
        <TabsContent value="import" className="mt-4">
          <ImportBackupPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}