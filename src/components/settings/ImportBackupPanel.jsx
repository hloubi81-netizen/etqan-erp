import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  importBackupJSON, importBackupExcel, importBackupCSV,
  importRowsToEntity, ENTITIES
} from "@/utils/backupEngine";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Upload, FileJson, FileSpreadsheet, FileText, AlertTriangle,
  CheckCircle2, Loader2, Info, RefreshCw, PlusCircle
} from "lucide-react";

const IMPORT_MODES = [
  {
    id: "json",
    label: "JSON",
    sublabel: "نسخة احتياطية كاملة من ETQAN",
    icon: FileJson,
    color: "text-amber-500",
    accept: ".json",
    needsEntity: false,
    desc: "استيراد ملف JSON تم تصديره مسبقاً من هذا النظام — سيستبدل البيانات الحالية",
  },
  {
    id: "excel",
    label: "Excel (XLSX)",
    sublabel: "من Excel أو Google Sheets",
    icon: FileSpreadsheet,
    color: "text-green-600",
    accept: ".xlsx,.xls",
    needsEntity: "optional",
    desc: "كل ورقة (Sheet) تُعامَل ككيان مستقل. يجب أن يكون اسم الورقة مطابقاً لاسم الجدول (عربي أو إنجليزي). أو اختر جدول محدد للاستيراد من الورقة الأولى.",
  },
  {
    id: "csv",
    label: "CSV",
    sublabel: "من أي برنامج جداول",
    icon: FileText,
    color: "text-blue-500",
    accept: ".csv",
    needsEntity: "required",
    desc: "استيراد ملف CSV إلى جدول محدد. يجب أن تكون الأعمدة مطابقة لحقول الجدول المختار.",
  },
];

export default function ImportBackupPanel() {
  const [mode, setMode] = useState("json");
  const [entityKey, setEntityKey] = useState("");
  const [clearMode, setClearMode] = useState("add"); // 'add' | 'replace'
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const currentMode = IMPORT_MODES.find(m => m.id === mode);
  const onProg = (pct, label) => { setProgress(pct); setProgressLabel(label); };

  async function processFile(file) {
    if (!file) return;

    // التحقق من الامتداد
    const ext = file.name.split(".").pop().toLowerCase();
    const validExts = { json: ["json"], excel: ["xlsx", "xls"], csv: ["csv"] };
    if (!validExts[mode].includes(ext)) {
      toast.error(`الملف لا يتطابق مع الصيغة المختارة (${currentMode.label})`);
      return;
    }

    // التحقق من الكيان عند الحاجة
    if (currentMode.needsEntity === "required" && !entityKey) {
      toast.error("يرجى اختيار الجدول المستهدف أولاً");
      return;
    }

    // تأكيد عند الاستبدال الكامل
    if (mode === "json" || clearMode === "replace") {
      const confirmed = window.confirm(
        `⚠️ تحذير: ${clearMode === "replace" || mode === "json" ? "سيتم حذف البيانات الحالية واستبدالها" : "سيتم إضافة البيانات بجانب الموجودة"}.\n\nهل أنت متأكد؟`
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setProgress(0);
    setResult(null);

    try {
      let results = {};
      const doReplace = clearMode === "replace";

      if (mode === "json") {
        results = await importBackupJSON(file, onProg);
      } else if (mode === "excel") {
        results = await importBackupExcel(file, entityKey || null, onProg);
      } else if (mode === "csv") {
        const content = await file.text();
        const wb = XLSX.read(content, { type: "string" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        onProg(50, entityKey);
        const count = await importRowsToEntity(entityKey, rows, doReplace);
        onProg(100, entityKey);
        results = { [entityKey]: count };
      }

      const total = Object.values(results).reduce((s, v) => s + (v || 0), 0);
      setResult(results);
      toast.success(`✅ تم الاستيراد بنجاح — ${total.toLocaleString()} سجل`);
    } catch (err) {
      toast.error("فشل الاستيراد: " + (err.message || "خطأ غير متوقع"));
    }

    setLoading(false);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e) {
    processFile(e.target.files?.[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
        <Upload className="h-7 w-7 text-purple-600 shrink-0" />
        <div>
          <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">استيراد البيانات من برامج أخرى</p>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
            يدعم JSON · Excel · CSV — من أي مصدر خارجي أو نسخة احتياطية سابقة
          </p>
        </div>
      </div>

      {/* Step 1: Format */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">① اختر صيغة الملف</p>
        <div className="grid grid-cols-3 gap-2">
          {IMPORT_MODES.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setEntityKey(""); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center
                  ${mode === m.id ? "border-primary bg-primary/5" : "border-dashed hover:border-primary/50"}`}
              >
                <Icon className={`h-6 w-6 ${m.color}`} />
                <span className="font-semibold text-xs">{m.label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{m.sublabel}</span>
              </button>
            );
          })}
        </div>

        {/* Info about chosen format */}
        <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{currentMode.desc}</span>
        </div>
      </div>

      {/* Step 2: Entity (if needed) */}
      {currentMode.needsEntity && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            ② اختر الجدول المستهدف {currentMode.needsEntity === "optional" && <span className="text-muted-foreground/60 normal-case">(اختياري — للإكسل متعدد الأوراق)</span>}
          </p>
          <Select value={entityKey} onValueChange={setEntityKey}>
            <SelectTrigger>
              <SelectValue placeholder="اختر الجدول..." />
            </SelectTrigger>
            <SelectContent>
              {ENTITIES.map(e => (
                <SelectItem key={e.key} value={e.key}>{e.label} ({e.key})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Step 3: Import mode (add or replace) — not for full JSON */}
      {mode !== "json" && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            {currentMode.needsEntity ? "③" : "②"} طريقة الاستيراد
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setClearMode("add")}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-right text-sm
                ${clearMode === "add" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-dashed hover:border-green-400"}`}
            >
              <PlusCircle className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-xs">إضافة فقط</p>
                <p className="text-[10px] text-muted-foreground">يُضاف للبيانات الموجودة</p>
              </div>
            </button>
            <button
              onClick={() => setClearMode("replace")}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-right text-sm
                ${clearMode === "replace" ? "border-destructive bg-destructive/5" : "border-dashed hover:border-destructive/50"}`}
            >
              <RefreshCw className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-xs">استبدال كامل</p>
                <p className="text-[10px] text-muted-foreground">يحذف القديم أولاً</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>جارٍ الاستيراد: {progressLabel}</span>
            <span className="mr-auto font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !loading && fileRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${dragOver ? "border-primary bg-primary/10 scale-[1.01]" : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"}
          ${loading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="p-3 rounded-full bg-muted/50">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm">اسحب الملف هنا أو اضغط للاختيار</p>
          <p className="text-xs text-muted-foreground mt-1">
            الصيغ المقبولة: <span className="font-medium">{currentMode.accept}</span>
          </p>
        </div>
        {(mode === "json" || clearMode === "replace") && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            سيتم استبدال البيانات الحالية
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={currentMode.accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Results */}
      {result && (
        <div className="rounded-xl border bg-green-50 dark:bg-green-950/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="font-semibold text-sm text-green-800 dark:text-green-200">
              تم الاستيراد بنجاح — {Object.values(result).reduce((s, v) => s + (v || 0), 0).toLocaleString()} سجل إجمالاً
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(result).map(([k, v]) => {
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
    </div>
  );
}