import { base44 } from "@/api/base44Client";

/**
 * تسجيل نشاط عملية على فاتورة أو سند
 */
export async function logActivity({ action, documentType, documentNumber, documentSubtype, documentId, details, amount }) {
  let user = null;
  try { user = await base44.auth.me(); } catch {}

  await base44.entities.ActivityLog.create({
    action,
    document_type: documentType,
    document_number: documentNumber || "",
    document_subtype: documentSubtype || "",
    document_id: documentId || "",
    user_name: user?.full_name || user?.email || "مجهول",
    user_email: user?.email || "",
    timestamp: new Date().toISOString(),
    details: details || "",
    amount: amount || 0,
    branch_id: user?.branch_id || "",
    branch_name: user?.branch_name || "",
  }).catch(() => {}); // لا نوقف العملية الأصلية إذا فشل التسجيل
}