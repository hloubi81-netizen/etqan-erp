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