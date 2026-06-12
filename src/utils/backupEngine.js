import { base44 } from "@/api/base44Client";
import * as XLSX from "xlsx";

/**
 * محرك النسخ الاحتياطي الشامل
 * يدعم: JSON, Excel (XLSX), CSV
 */

const ENTITIES = [
  { key: "Invoice",        label: "الفواتير" },
  { key: "Voucher",        label: "السندات" },
  { key: "JournalEntry",   label: "قيود اليومية" },
  { key: "Account",        label: "الحسابات" },
  { key: "Product",        label: "المنتجات" },
  { key: "Warehouse",      label: "المستودعات" },
  { key: "InventoryCount", label: "حركة المخزون" },
  { key: "StockTransfer",  label: "تحويلات المخزون" },
  { key: "CostCenter",     label: "مراكز التكلفة" },
  { key: "CostEntry",      label: "قيود التكلفة" },
  { key: "Customer",       label: "العملاء" },
  { key: "Employee",       label: "الموظفين" },
  { key: "SalaryRecord",   label: "سجلات الرواتب" },
  { key: "Attendance",     label: "الحضور والغياب" },
  { key: "LeaveRequest",   label: "طلبات الإجازات" },
  { key: "FixedAsset",     label: "الأصول الثابتة" },
  { key: "Branch",         label: "الفروع" },
  { key: "Currency",       label: "العملات" },
  { key: "InvoicePattern", label: "أنماط الفواتير" },
  { key: "JournalRule",    label: "قواعد اليومية" },
  { key: "StockAlert",     label: "تنبيهات المخزون" },
  { key: "BankReconciliation", label: "تسويات بنكية" },
  { key: "POSSession",     label: "جلسات نقطة البيع" },
  { key: "ProductGroup",   label: "مجموعات المنتجات" },
];

/**
 * تحميل جميع البيانات من الكيانات
 */
export async function fetchAllData(onProgress) {
  const result = {};
  let done = 0;
  for (const ent of ENTITIES) {
    try {
      const data = await base44.entities[ent.key]?.list().catch(() => []);
      result[ent.key] = data || [];
    } catch {
      result[ent.key] = [];
    }
    done++;
    onProgress && onProgress(Math.round((done / ENTITIES.length) * 100), ent.label);
  }
  return result;
}

/**
 * تصدير نسخة احتياطية بصيغة JSON
 */
export async function exportBackupJSON(onProgress) {
  const data = await fetchAllData(onProgress);
  const backup = {
    version: "2.0",
    exported_at: new Date().toISOString(),
    entities: data,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  downloadBlob(blob, `backup_${dateTag()}.json`);
  return Object.values(data).reduce((s, arr) => s + arr.length, 0);
}

/**
 * تصدير نسخة احتياطية بصيغة Excel (ورقة لكل كيان)
 */
export async function exportBackupExcel(onProgress) {
  const data = await fetchAllData(onProgress);
  const wb = XLSX.utils.book_new();

  for (const ent of ENTITIES) {
    const rows = data[ent.key] || [];
    if (!rows.length) continue;
    const flat = rows.map(r => flattenObject(r));
    const ws = XLSX.utils.json_to_sheet(flat);
    XLSX.utils.book_append_sheet(wb, ws, ent.label.slice(0, 31));
  }

  XLSX.writeFile(wb, `backup_${dateTag()}.xlsx`);
  return Object.values(data).reduce((s, arr) => s + arr.length, 0);
}

/**
 * تصدير كيان واحد بصيغة CSV
 */
export async function exportEntityCSV(entityKey, entityLabel) {
  const rows = await base44.entities[entityKey]?.list().catch(() => []);
  if (!rows?.length) return 0;
  const flat = rows.map(r => flattenObject(r));
  const ws = XLSX.utils.json_to_sheet(flat);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${entityLabel}_${dateTag()}.csv`);
  return rows.length;
}

/**
 * تصدير نسخة احتياطية شاملة بصيغة CSV واحدة (كل جدول في قسم منفصل)
 */
export async function exportBackupCSV(onProgress) {
  const data = await fetchAllData(onProgress);
  let csvContent = "\uFEFF";
  for (const ent of ENTITIES) {
    const rows = data[ent.key] || [];
    if (!rows.length) continue;
    csvContent += `\n=== ${ent.label} ===\n`;
    const flat = rows.map(r => flattenObject(r));
    const ws = XLSX.utils.json_to_sheet(flat);
    csvContent += XLSX.utils.sheet_to_csv(ws) + "\n";
  }
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `backup_full_${dateTag()}.csv`);
  return Object.values(data).reduce((s, arr) => s + arr.length, 0);
}

/**
 * تصدير نسخة احتياطية بصيغة HTML (تقرير قابل للطباعة / PDF)
 */
export async function exportBackupHTML(onProgress) {
  const data = await fetchAllData(onProgress);
  const exportedAt = new Date().toLocaleString("ar-EG");
  const totalRecords = Object.values(data).reduce((s, arr) => s + arr.length, 0);

  let tablesHTML = "";
  for (const ent of ENTITIES) {
    const rows = data[ent.key] || [];
    if (!rows.length) continue;
    const flat = rows.map(r => flattenObject(r));
    const headers = Object.keys(flat[0] || {});
    tablesHTML += `
      <div class="section">
        <h2>${ent.label} <span class="count">(${rows.length} سجل)</span></h2>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>
            ${flat.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ""}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>نسخة احتياطية - ${exportedAt}</title>
<style>
  body { font-family: Arial, sans-serif; direction: rtl; font-size: 11px; color: #222; }
  h1 { background: #1e40af; color: white; padding: 12px 16px; border-radius: 6px; }
  .meta { background: #f1f5f9; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 12px; }
  .section { margin-bottom: 32px; page-break-inside: avoid; }
  h2 { background: #e2e8f0; padding: 6px 12px; border-radius: 4px; font-size: 13px; color: #1e3a8a; }
  .count { color: #64748b; font-weight: normal; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #1e40af; color: white; padding: 5px 8px; text-align: right; }
  td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  @media print { .section { page-break-inside: avoid; } }
</style>
</head>
<body>
<h1>📦 نسخة احتياطية شاملة — ETQAN ERP</h1>
<div class="meta">
  <strong>تاريخ التصدير:</strong> ${exportedAt} &nbsp;|&nbsp;
  <strong>إجمالي السجلات:</strong> ${totalRecords.toLocaleString()} سجل &nbsp;|&nbsp;
  <strong>عدد الجداول:</strong> ${ENTITIES.filter(e => (data[e.key] || []).length > 0).length}
</div>
${tablesHTML}
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  downloadBlob(blob, `backup_report_${dateTag()}.html`);
  return totalRecords;
}

/**
 * حفظ سجل النسخة الاحتياطية في localStorage
 */
export function saveBackupLog(format, recordCount) {
  const logs = getBackupLogs();
  logs.unshift({
    id: Date.now(),
    format,
    recordCount,
    date: new Date().toISOString(),
  });
  localStorage.setItem("itqan_backup_logs", JSON.stringify(logs.slice(0, 20)));
}

export function getBackupLogs() {
  try { return JSON.parse(localStorage.getItem("itqan_backup_logs") || "[]"); }
  catch { return []; }
}

/**
 * استيراد نسخة احتياطية من JSON
 */
export async function importBackupJSON(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        const entities = backup.entities || backup;
        const results = {};
        let done = 0;
        const keys = Object.keys(entities);
        for (const key of keys) {
          const rows = entities[key];
          if (!Array.isArray(rows) || !rows.length) { done++; continue; }
          try {
            // حذف القديم وإعادة الإضافة
            const existing = await base44.entities[key]?.list().catch(() => []);
            await Promise.all(existing.map(r => base44.entities[key].delete(r.id).catch(() => {})));
            // إضافة على دفعات
            const chunks = chunkArray(rows.map(r => { const { id, created_date, updated_date, created_by, ...rest } = r; return rest; }), 20);
            for (const chunk of chunks) {
              await base44.entities[key].bulkCreate(chunk).catch(() => {});
            }
            results[key] = rows.length;
          } catch { results[key] = 0; }
          done++;
          onProgress && onProgress(Math.round((done / keys.length) * 100), key);
        }
        resolve(results);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// ─── Helpers ────────────────────────────────────────────────
function flattenObject(obj, prefix = "") {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(result, flattenObject(v, key));
    } else if (Array.isArray(v)) {
      result[key] = JSON.stringify(v);
    } else {
      result[key] = v;
    }
  }
  return result;
}

function dateTag() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export { ENTITIES };