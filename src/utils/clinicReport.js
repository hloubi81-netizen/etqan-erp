import { base44 } from "@/api/base44Client";

function esc(v) {
  return (v == null ? "" : String(v)).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export async function printPatientReport(patientId) {
  const [patient, visits, prescriptions] = await Promise.all([
    base44.entities.Patient.get(patientId),
    base44.entities.MedicalRecord.filter({ patient_id: patientId }, "-visit_date", 500),
    base44.entities.Prescription.filter({ patient_id: patientId }, "-date", 500),
  ]);

  const tests = patient.medical_tests || [];
  const vList = visits || [];
  const rxList = prescriptions || [];

  const visitsHtml = vList.length
    ? vList.map((v) => `
      <div class="card">
        <div class="card-head"><span>${esc(v.visit_date)}</span><span>${esc(v.doctor_name || "—")}</span></div>
        <div class="row"><b>الأعراض:</b> ${esc(v.symptoms || "—")}</div>
        <div class="row"><b>التشخيص:</b> ${esc(v.diagnosis || "—")}</div>
        ${v.notes ? `<div class="row"><b>ملاحظات:</b> ${esc(v.notes)}</div>` : ""}
      </div>`).join("")
    : `<p class="empty">لا توجد زيارات مسجلة.</p>`;

  const testsHtml = tests.length
    ? `<table><thead><tr><th>نوع الفحص</th><th>التاريخ</th><th>النتيجة</th><th>ملاحظات</th></tr></thead><tbody>
      ${tests.map((t) => `<tr><td>${esc(t.test_name || "—")}</td><td>${esc(t.date || "—")}</td><td>${esc(t.result || "—")}</td><td>${esc(t.notes || "—")}</td></tr>`).join("")}
      </tbody></table>`
    : `<p class="empty">لا توجد فحوصات مسجلة.</p>`;

  const rxHtml = rxList.length
    ? rxList.map((p) => `
      <div class="card">
        <div class="card-head"><span>وصفة ${esc(p.date)}</span><span>${esc(p.doctor_name || "—")}</span></div>
        ${p.diagnostic_status ? `<div class="row"><b>الحالة التشخيصية:</b> ${esc(p.diagnostic_status)}</div>` : ""}
        <table><thead><tr><th>الدواء</th><th>الجرعة</th><th>المدة</th><th>التعليمات</th></tr></thead><tbody>
        ${(p.items || []).map((it) => `<tr><td>${esc(it.medicine || "—")}</td><td>${esc(it.dosage || "—")}</td><td>${esc(it.duration || "—")}</td><td>${esc(it.instructions || "—")}</td></tr>`).join("") || '<tr><td colspan="4">—</td></tr>'}
        </tbody></table>
        ${p.notes ? `<div class="row"><b>ملاحظات:</b> ${esc(p.notes)}</div>` : ""}
      </div>`).join("")
    : `<p class="empty">لا توجد وصفات طبية.</p>`;

  const html = `<!doctype html><html lang="ar" dir="rtl"><head>
  <meta charset="utf-8" />
  <title>تقرير طبي - ${esc(patient.name)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; color: #1e293b; margin: 24px; font-size: 13px; line-height: 1.6; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #1d4ed8; }
    h2 { font-size: 16px; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #1d4ed8; color: #1d4ed8; }
    .meta { color: #64748b; margin-bottom: 16px; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; background: #f1f5f9; border-radius: 8px; padding: 14px 16px; margin-bottom: 8px; }
    .info div b { color: #334155; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; page-break-inside: avoid; }
    .card-head { display: flex; justify-content: space-between; font-weight: 600; color: #1d4ed8; margin-bottom: 6px; }
    .row { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: right; }
    th { background: #eff6ff; color: #1e40af; font-weight: 600; }
    .empty { color: #94a3b8; font-style: italic; }
    .footer { margin-top: 28px; text-align: center; color: #94a3b8; font-size: 11px; }
    @media print { body { margin: 12mm; } }
  </style></head>
  <body>
    <h1>التقرير الطبي</h1>
    <div class="meta">تم إنشاؤه: ${new Date().toLocaleDateString("ar-EG")} — نظام العيادات</div>
    <h2>بيانات المريض</h2>
    <div class="info">
      <div><b>الاسم:</b> ${esc(patient.name)}</div>
      <div><b>الرمز:</b> ${esc(patient.code || "—")}</div>
      <div><b>الجنس:</b> ${esc(patient.gender || "—")}</div>
      <div><b>تاريخ الميلاد:</b> ${esc(patient.birth_date || "—")}</div>
      <div><b>فصيلة الدم:</b> ${esc(patient.blood_type || "—")}</div>
      <div><b>الهاتف:</b> ${esc(patient.phone || "—")}</div>
      <div><b>شركة التأمين:</b> ${esc(patient.insurance_provider || "—")}</div>
      <div><b>رقم التأمين:</b> ${esc(patient.insurance_number || "—")}</div>
      <div><b>العنوان:</b> ${esc(patient.address || "—")}</div>
    </div>
    ${patient.notes ? `<div class="row"><b>ملاحظات عامة:</b> ${esc(patient.notes)}</div>` : ""}

    <h2>التاريخ الطبي (الزيارات)</h2>
    ${visitsHtml}

    <h2>الفحوصات والتحاليل السابقة</h2>
    ${testsHtml}

    <h2>الوصفات الطبية</h2>
    ${rxHtml}

    <div class="footer">هذا التقرير مولّد إلكترونيًا لأغراض المتابعة الطبية.</div>
    <script>window.onload = () => { setTimeout(() => window.print(), 400); };</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("الرجاء السماح بالنوافذ المنبثقة لإنشاء التقرير."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}