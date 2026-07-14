import { base44 } from "@/api/base44Client";
import * as XLSX from "xlsx";

function fmt(n) {
  return (Number(n) || 0).toLocaleString("ar-EG");
}

export async function aggregatePayslip(employeeId, period) {
  // ابحث عن سجل راتب لهذه الفترة أولاً (يحتوي على الأيام والمكافآت والخصومات المجمّعة)
  let recs = await base44.entities.SalaryRecord.filter({ employee_id: employeeId, period });
  recs = Array.isArray(recs) ? recs : [];
  let emp = null;
  try { emp = await base44.entities.Employee.get(employeeId); } catch (_) { emp = null; }

  if (recs.length > 0) {
    return { record: recs[0], employee: emp };
  }
  // لا يوجد سجل راتب → جمّع من الحضور + إعدادات الموظف
  let att = await base44.entities.Attendance.filter({ employee_id: employeeId });
  att = Array.isArray(att) ? att : [];
  const periodAtt = att.filter(a => a.date?.startsWith(period));
  const present = periodAtt.filter(a => a.type === "حضور").length;
  const late = periodAtt.filter(a => a.type === "تأخير").length;
  const absence = periodAtt.filter(a => a.type === "غياب").length;
  const overtimeHours = periodAtt.reduce((s, a) => s + Math.max(0, (a.hours || 0) - 8), 0);

  const basic = emp?.salary || 0;
  const wdm = emp?.working_days_per_month || 26;
  const dailyRate = wdm ? basic / wdm : 0;
  const workDays = present + late;
  const earnedBasic = Math.round(dailyRate * workDays * 100) / 100;
  const absenceDeduction = Math.round(dailyRate * absence * 100) / 100;
  const hourlyRate = wdm ? basic / (wdm * 8) : 0;
  const overtime = Math.round(hourlyRate * overtimeHours * (emp?.overtime_rate || 1.5) * 100) / 100;
  const allowances_detail = emp?.allowances_config || [];
  const deductions_detail = emp?.deductions_config || [];
  const allowances = allowances_detail.reduce((s, a) => s + (a.amount || 0), 0);
  const deductions = deductions_detail.reduce((s, d) => s + (d.amount || 0), 0);
  const net = Math.round((earnedBasic + allowances + overtime - deductions - absenceDeduction) * 100) / 100;

  return {
    record: {
      employee_name: emp?.name || "",
      employee_number: emp?.employee_number || "",
      department: emp?.department || "",
      cost_center_name: emp?.cost_center_name || "",
      period,
      work_days: workDays,
      absence_days: absence,
      overtime_hours: overtimeHours,
      basic_salary: basic,
      earned_basic: earnedBasic,
      allowances_detail, allowances,
      bonuses_detail: [], bonuses: 0,
      overtime,
      deductions_detail, deductions,
      absence_deduction: absenceDeduction,
      net_salary: net,
      payment_method: "تحويل بنكي",
      status: "مسودة",
      notes: "مُجمّع تلقائيًا من سجلات الحضور",
    },
    employee: emp,
  };
}

export function buildSlipHTML(record, companyName = "الشركة") {
  const totalAdd = (record.earned_basic || 0) + (record.allowances || 0) + (record.bonuses || 0) + (record.overtime || 0);
  const totalDed = (record.deductions || 0) + (record.absence_deduction || 0);
  const bonusRows = (record.bonuses_detail || []).map(b => `<tr><td>${b.name || "مكافأة"}</td><td class="num pos">+${fmt(b.amount)}</td></tr>`).join("");
  const allowRows = (record.allowances_detail || []).map(a => `<tr><td>${a.name || "بدل"}</td><td class="num pos">+${fmt(a.amount)}</td></tr>`).join("");
  const dedRows = (record.deductions_detail || []).map(d => `<tr><td>${d.name || "استقطاع"}</td><td class="num neg">-${fmt(d.amount)}</td></tr>`).join("");

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>كشف راتب — ${record.employee_name}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Tahoma', Arial, sans-serif; color: #0f172a; padding: 24px; margin: 0; }
  .slip { max-width: 780px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .head { background: #1d4ed8; color: #fff; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
  .head h1 { font-size: 20px; margin: 0; }
  .head .period { background: rgba(255,255,255,.18); padding: 4px 12px; border-radius: 999px; font-size: 13px; }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; padding: 16px 24px; background: #f8fafc; font-size: 13px; }
  .info .lbl { color: #64748b; }
  .info .val { font-weight: 700; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; }
  .col { padding: 16px 20px; }
  .col.left { border-left: 1px solid #e2e8f0; }
  .col h3 { font-size: 13px; margin: 0 0 10px; display: flex; align-items: center; gap: 8px; }
  .col.add h3 { color: #047857; } .col.ded h3 { color: #b91c1c; }
  .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
  .add .dot { background: #10b981; } .ded .dot { background: #ef4444; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 7px 0; border-bottom: 1px solid #f1f5f9; }
  td.num { text-align: left; font-weight: 600; }
  .pos { color: #047857; } .neg { color: #b91c1c; }
  .subtot td { border-top: 2px solid #cbd5e1; font-weight: 800; padding-top: 10px; }
  .net { background: #1d4ed8; color: #fff; padding: 18px 24px; text-align: center; }
  .net .label { font-size: 13px; opacity: .85; }
  .net .amount { font-size: 30px; font-weight: 800; margin-top: 2px; }
  .foot { padding: 12px 24px; background: #f1f5f9; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .sign { display: flex; justify-content: space-between; margin-top: 28px; font-size: 12px; }
  .sign .box { text-align: center; width: 30%; }
  .sign .line { border-top: 1px solid #94a3b8; margin-top: 28px; padding-top: 4px; }
  @media print { body { padding: 0; } .slip { border: none; } }
</style></head><body>
<div class="slip">
  <div class="head"><h1>${companyName}</h1><span class="period">كشف راتب — ${record.period}</span></div>
  <div class="info">
    <div><span class="lbl">اسم الموظف: </span><span class="val">${record.employee_name || ""}</span></div>
    <div><span class="lbl">رقم الموظف: </span><span class="val">${record.employee_number || "—"}</span></div>
    <div><span class="lbl">القسم: </span><span class="val">${record.department || "—"}</span></div>
    <div><span class="lbl">مركز التكلفة: </span><span class="val">${record.cost_center_name || "—"}</span></div>
    <div><span class="lbl">أيام العمل الفعلية: </span><span class="val">${record.work_days || 0} يوم</span></div>
    <div><span class="lbl">أيام الغياب: </span><span class="val" style="color:#b91c1c">${record.absence_days || 0} يوم</span></div>
    <div><span class="lbl">ساعات الوقت الإضافي: </span><span class="val">${record.overtime_hours || 0} ساعة</span></div>
    <div><span class="lbl">طريقة الصرف: </span><span class="val">${record.payment_method || "—"}</span></div>
  </div>
  <div class="grid">
    <div class="col add">
      <h3><span class="dot"></span>المستحقات (الإضافات)</h3>
      <table>
        <tr><td>الراتب المستحق (${record.work_days || 0} يوم)</td><td class="num pos">+${fmt(record.earned_basic || record.basic_salary)}</td></tr>
        ${allowRows || (record.allowances ? `<tr><td>البدلات</td><td class="num pos">+${fmt(record.allowances)}</td></tr>` : "")}
        ${bonusRows || ""}
        ${(record.overtime || 0) > 0 ? `<tr><td>وقت إضافي (${record.overtime_hours || 0} ساعة)</td><td class="num pos">+${fmt(record.overtime)}</td></tr>` : ""}
        <tr class="subtot"><td>إجمالي المستحقات</td><td class="num pos">${fmt(totalAdd)}</td></tr>
      </table>
    </div>
    <div class="col ded left">
      <h3><span class="dot"></span>الاستقطاعات (الخصومات)</h3>
      <table>
        ${dedRows || (record.deductions ? `<tr><td>الاستقطاعات</td><td class="num neg">-${fmt(record.deductions)}</td></tr>` : "")}
        ${(record.absence_deduction || 0) > 0 ? `<tr><td>خصم الغياب (${record.absence_days || 0} يوم)</td><td class="num neg">-${fmt(record.absence_deduction)}</td></tr>` : ""}
        <tr class="subtot"><td>إجمالي الاستقطاعات</td><td class="num neg">${fmt(totalDed)}</td></tr>
      </table>
    </div>
  </div>
  <div class="net"><div class="label">صافي الراتب المستحق</div><div class="amount">${fmt(record.net_salary)}</div></div>
  <div class="foot">
    <span>الحالة: <strong>${record.status || "—"}</strong></span>
    ${record.payment_date ? `<span>تاريخ الصرف: <strong>${record.payment_date}</strong></span>` : ""}
    <span>${record.notes || ""}</span>
  </div>
  <div style="padding: 0 24px 16px;">
    <div class="sign">
      <div class="box"><div class="line">توقيع الموظف</div></div>
      <div class="box"><div class="line">المعتمد المالي</div></div>
      <div class="box"><div class="line">مدير الإدارة</div></div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;
}

export function printPayslip(record, companyName) {
  const html = buildSlipHTML(record, companyName);
  const win = window.open("", "_blank");
  if (!win) { alert("الرجاء السماح بالنوافذ المنبثقة للطباعة"); return; }
  win.document.write(html);
  win.document.close();
}

export function exportPayslipExcel(record, companyName = "الشركة") {
  const rows = [
    ["كشف راتب", companyName],
    ["الفترة", record.period],
    ["الموظف", record.employee_name],
    ["رقم الموظف", record.employee_number],
    ["القسم", record.department],
    [], ["البند", "القيمة"],
    ["الراتب المستحق", record.earned_basic || record.basic_salary],
  ];
  (record.allowances_detail || []).forEach(a => rows.push([a.name || "بدل", a.amount]));
  (record.bonuses_detail || []).forEach(b => rows.push([b.name || "مكافأة", b.amount]));
  if (record.overtime) rows.push([`وقت إضافي (${record.overtime_hours} ساعة)`, record.overtime]);
  rows.push(["إجمالي المستحقات", (record.earned_basic || record.basic_salary) + (record.allowances || 0) + (record.bonuses || 0) + (record.overtime || 0)]);
  rows.push([]);
  (record.deductions_detail || []).forEach(d => rows.push([d.name || "خصم", -(d.amount)]));
  if (record.absence_deduction) rows.push([`خصم الغياب (${record.absence_days} يوم)`, -record.absence_deduction]);
  rows.push(["إجمالي الاستقطاعات", -((record.deductions || 0) + (record.absence_deduction || 0))]);
  rows.push([]);
  rows.push(["صافي الراتب", record.net_salary]);
  rows.push(["طريقة الصرف", record.payment_method], ["الحالة", record.status]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 32 }, { wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "كشف الراتب");
  XLSX.writeFile(wb, `كشف_راتب_${record.employee_name || "موظف"}_${record.period}.xlsx`);
}