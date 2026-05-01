import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

/**
 * ExcelImport - Generic Excel import component
 * @param {string} entityName - Base44 entity name (e.g. "Product")
 * @param {Array} columns - [{ key, label, required, type }]
 * @param {string} templateName - Filename for sample download
 * @param {Function} onSuccess - Called after successful import
 * @param {Function} transformRow - Optional: transform each row before saving
 */
export default function ExcelImport({ entityName, columns, templateName, onSuccess, transformRow }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([columns.map(c => c.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "البيانات");
    XLSX.writeFile(wb, templateName || "template.xlsx");
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const errs = [];
      const parsed = raw.map((row, idx) => {
        const mapped = {};
        columns.forEach(col => {
          const val = row[col.label];
          mapped[col.key] = col.type === "number" ? (parseFloat(val) || 0) : String(val || "").trim();
        });
        // Validate required fields
        columns.filter(c => c.required).forEach(col => {
          if (!mapped[col.key]) errs.push(`الصف ${idx + 2}: حقل "${col.label}" مطلوب`);
        });
        return mapped;
      });

      setRows(parsed);
      setErrors(errs);
      setDone(false);
      setImportResult(null);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  async function handleImport() {
    if (errors.length > 0) return;
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of rows) {
      try {
        const data = transformRow ? transformRow(row) : row;
        await base44.entities[entityName].create(data);
        success++;
      } catch {
        failed++;
      }
    }
    setImportResult({ success, failed });
    setDone(true);
    setImporting(false);
    if (success > 0) {
      toast.success(`تم استيراد ${success} سجل بنجاح`);
      onSuccess?.();
    }
    if (failed > 0) toast.error(`فشل استيراد ${failed} سجل`);
  }

  function handleClose() {
    setOpen(false);
    setRows([]);
    setErrors([]);
    setDone(false);
    setImportResult(null);
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Upload className="h-4 w-4" />
        استيراد Excel
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              استيراد من Excel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Download template */}
            <div className="bg-muted/40 rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">الخطوة 1: تنزيل النموذج</p>
                <p className="text-xs text-muted-foreground mt-0.5">حمّل النموذج وأدخل البيانات ثم ارفعه</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 shrink-0">
                <Download className="h-4 w-4" />
                تنزيل النموذج
              </Button>
            </div>

            {/* Step 2: Upload file */}
            <div>
              <p className="text-sm font-medium mb-2">الخطوة 2: رفع الملف</p>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">انقر لاختيار ملف Excel (.xlsx, .xls)</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
              </div>
            </div>

            {/* Preview & Errors */}
            {rows.length > 0 && !done && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={errors.length > 0 ? "destructive" : "default"}>
                    {rows.length} سجل
                  </Badge>
                  {errors.length > 0 ? (
                    <Badge variant="destructive">{errors.length} خطأ</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700">جاهز للاستيراد</Badge>
                  )}
                </div>

                {errors.length > 0 && (
                  <div className="bg-destructive/10 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                    {errors.map((e, i) => (
                      <p key={i} className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />{e}
                      </p>
                    ))}
                  </div>
                )}

                {/* Preview table */}
                <div className="border rounded-lg overflow-auto max-h-48">
                  <table className="text-xs w-full">
                    <thead className="bg-muted">
                      <tr>
                        {columns.slice(0, 4).map(c => (
                          <th key={c.key} className="px-2 py-1.5 text-right font-medium">{c.label}</th>
                        ))}
                        {columns.length > 4 && <th className="px-2 py-1.5 text-right text-muted-foreground">...</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t">
                          {columns.slice(0, 4).map(c => (
                            <td key={c.key} className="px-2 py-1.5">{row[c.key] || "-"}</td>
                          ))}
                          {columns.length > 4 && <td className="px-2 py-1.5 text-muted-foreground">...</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-1.5 border-t">
                      و {rows.length - 5} سجل آخر...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Result */}
            {done && importResult && (
              <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                {importResult.success > 0 && (
                  <p className="text-sm flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    تم استيراد {importResult.success} سجل بنجاح
                  </p>
                )}
                {importResult.failed > 0 && (
                  <p className="text-sm flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    فشل استيراد {importResult.failed} سجل
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>
              {done ? "إغلاق" : "إلغاء"}
            </Button>
            {!done && rows.length > 0 && errors.length === 0 && (
              <Button onClick={handleImport} disabled={importing} className="gap-2">
                {importing ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري الاستيراد...</>
                ) : (
                  <><Upload className="h-4 w-4" />استيراد {rows.length} سجل</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}