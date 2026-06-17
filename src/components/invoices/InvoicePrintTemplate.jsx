import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Printer, X, Settings2 } from "lucide-react";
import { getPrintSettings } from "@/components/print/PrintTemplateDesigner";
import { getBoundPrintSettings, getCompanySettings } from "@/utils/printBinding";

const SETTINGS_KEY = "itqan_app_settings";

function getSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

// Converts number to Arabic words (simplified)
function numberToArabicWords(num) {
  if (!num) return "";
  const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة"];

  const n = Math.floor(num);
  if (n <= 0) return "صفر";
  if (n < 11) return units[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10), u = n % 10;
    return u ? `${units[u]} و${tens[t]}` : tens[t];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    return r ? `${hundreds[h]} و${numberToArabicWords(r)}` : hundreds[h];
  }
  if (n < 1000000) {
    const k = Math.floor(n / 1000), r = n % 1000;
    const kStr = k === 1 ? "ألف" : k === 2 ? "ألفان" : k < 11 ? `${units[k]} آلاف` : `${numberToArabicWords(k)} ألف`;
    return r ? `${kStr} و${numberToArabicWords(r)}` : kStr;
  }
  return num.toLocaleString();
}

// ─── Template Renderers ────────────────────────────────────────────────────────

function getTemplateHeader(invoice, ps, company, accentColor, typeLabel, isSales) {
  const logo = company.logo;
  const logoEl = logo && ps.showLogo
    ? `<img src="${logo}" alt="logo" style="height:56px;max-width:160px;object-fit:contain;margin-bottom:4px;" />`
    : `<div style="width:52px;height:52px;background:${accentColor};border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:22px;font-weight:900;margin-bottom:4px;">${(company.name || "ش")[0]}</div>`;

  const companyInfo = `
    ${logoEl}
    <div style="font-size:18px;font-weight:900;color:${accentColor};">${company.name || "اسم الشركة"}</div>
    ${company.address ? `<div style="font-size:10px;color:#666;margin-top:2px;">${company.address}</div>` : ""}
    ${company.phone ? `<div style="font-size:10px;color:#666;">📞 ${company.phone}</div>` : ""}
    ${company.email ? `<div style="font-size:10px;color:#666;">✉ ${company.email}</div>` : ""}
    ${ps.showTaxNumber && company.taxNumber ? `<div style="font-size:10px;color:#666;">الرقم الضريبي: <strong>${company.taxNumber}</strong></div>` : ""}
    ${ps.showCommercialRegister && company.commercialRegister ? `<div style="font-size:10px;color:#666;">السجل التجاري: <strong>${company.commercialRegister}</strong></div>` : ""}
    ${ps.extraCompanyLine1 ? `<div style="font-size:10px;color:#444;">${ps.extraCompanyLine1}</div>` : ""}
    ${ps.extraCompanyLine2 ? `<div style="font-size:10px;color:#444;">${ps.extraCompanyLine2}</div>` : ""}
  `;

  const invoiceBadge = `
    <div style="background:linear-gradient(135deg,${accentColor},${accentColor}cc);border-radius:12px;padding:14px 20px;color:white;text-align:center;min-width:200px;box-shadow:0 4px 14px ${accentColor}44;">
      <div style="font-size:11px;opacity:.8;margin-bottom:4px;">${typeLabel}</div>
      <div style="font-size:24px;font-weight:900;letter-spacing:1px;">${invoice.invoice_number}</div>
      <div style="font-size:11px;opacity:.8;margin-top:6px;">📅 ${invoice.date ? new Date(invoice.date).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : "—"}</div>
    </div>
    <div style="margin-top:10px;font-size:10px;color:#555;text-align:right;">
      ${invoice.branch_name ? `<div>الفرع: <strong>${invoice.branch_name}</strong></div>` : ""}
      ${invoice.warehouse_name ? `<div>المستودع: <strong>${invoice.warehouse_name}</strong></div>` : ""}
      ${invoice.payment_method ? `<div>الدفع: <strong>${invoice.payment_method}</strong></div>` : ""}
    </div>
  `;

  if (ps.template === "classic") {
    return `
      <div style="border:2px solid ${accentColor};border-radius:8px;padding:16px 20px;margin-bottom:16px;">
        <div style="text-align:center;border-bottom:2px solid ${accentColor};padding-bottom:12px;margin-bottom:12px;">
          ${logoEl}
          <div style="font-size:20px;font-weight:900;color:${accentColor};">${company.name || "اسم الشركة"}</div>
          ${company.address ? `<div style="font-size:10px;color:#666;">${company.address}</div>` : ""}
          ${company.phone ? `<div style="font-size:10px;color:#666;">${company.phone}</div>` : ""}
          ${ps.showTaxNumber && company.taxNumber ? `<div style="font-size:10px;color:#666;">الرقم الضريبي: ${company.taxNumber}</div>` : ""}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="font-size:10px;color:#555;">
            ${company.email ? `<div>${company.email}</div>` : ""}
            ${ps.extraCompanyLine1 ? `<div>${ps.extraCompanyLine1}</div>` : ""}
          </div>
          <div style="text-align:left;">
            <div style="background:${accentColor};color:white;border-radius:8px;padding:8px 16px;display:inline-block;">
              <div style="font-size:10px;opacity:.8;">${typeLabel}</div>
              <div style="font-size:20px;font-weight:900;">${invoice.invoice_number}</div>
              <div style="font-size:10px;opacity:.8;">${invoice.date ? new Date(invoice.date).toLocaleDateString("ar-EG") : ""}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (ps.template === "branded") {
    return `
      <div style="background:${accentColor};padding:20px 24px;margin:-12mm -14mm 16px;display:flex;align-items:center;justify-content:space-between;">
        <div style="color:white;">
          ${logo && ps.showLogo ? `<img src="${logo}" alt="logo" style="height:48px;object-fit:contain;margin-bottom:6px;filter:brightness(10);" />` : ""}
          <div style="font-size:20px;font-weight:900;">${company.name || "اسم الشركة"}</div>
          ${company.address ? `<div style="font-size:10px;opacity:.85;">${company.address}</div>` : ""}
          ${company.phone ? `<div style="font-size:10px;opacity:.85;">📞 ${company.phone}</div>` : ""}
          ${ps.showTaxNumber && company.taxNumber ? `<div style="font-size:10px;opacity:.85;">الرقم الضريبي: ${company.taxNumber}</div>` : ""}
          ${ps.extraCompanyLine1 ? `<div style="font-size:10px;opacity:.85;">${ps.extraCompanyLine1}</div>` : ""}
        </div>
        <div style="background:rgba(255,255,255,.2);backdrop-filter:blur(4px);border-radius:12px;padding:12px 20px;text-align:center;color:white;border:1px solid rgba(255,255,255,.3);">
          <div style="font-size:10px;opacity:.8;">${typeLabel}</div>
          <div style="font-size:22px;font-weight:900;">${invoice.invoice_number}</div>
          <div style="font-size:10px;opacity:.8;">${invoice.date ? new Date(invoice.date).toLocaleDateString("ar-EG") : ""}</div>
        </div>
      </div>
    `;
  }

  // modern / minimal
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;">
      <div>${companyInfo}</div>
      <div>${invoiceBadge}</div>
    </div>
  `;
}

function getItemsTableHTML(items, ps, accentColor) {
  const cols = [
    { key: "num", label: "#", width: "4%" },
    ...(ps.showItemCode ? [{ key: "code", label: "الرمز", width: "10%" }] : []),
    { key: "name", label: "الصنف / الخدمة", width: ps.showItemCode ? "28%" : "36%" },
    { key: "qty", label: "الكمية", width: "8%" },
    { key: "unit", label: "الوحدة", width: "8%" },
    { key: "price", label: "السعر", width: "10%" },
    ...(ps.showDiscount ? [{ key: "disc", label: "الخصم", width: "9%" }] : []),
    ...(ps.showTax ? [{ key: "tax", label: "الضريبة", width: "9%" }] : []),
    { key: "total", label: "الإجمالي", width: "12%" },
  ];

  const headerRow = cols.map(c =>
    `<th style="padding:8px 10px;font-weight:700;font-size:11px;color:white;text-align:${c.key === "num" ? "center" : "right"};">${c.label}</th>`
  ).join("");

  const bodyRows = items.map((item, idx) => {
    const rowBg = ps.tableStyle === "striped"
      ? (idx % 2 === 0 ? "#f8fafc" : "#ffffff")
      : ps.tableStyle === "solid" ? (idx % 2 === 0 ? "#f1f5f9" : "#e8edf2")
      : "#ffffff";

    const cells = [
      { key: "num", val: `<span style="color:#94a3b8;">${idx + 1}</span>`, center: true },
      ...(ps.showItemCode ? [{ key: "code", val: `<span style="font-size:10px;color:#64748b;">${item.product_id || "—"}</span>` }] : []),
      { key: "name", val: `<strong style="color:#1e293b;">${item.product_name || ""}</strong>` },
      { key: "qty", val: (item.quantity || 0).toLocaleString(), center: true },
      { key: "unit", val: `<span style="color:#64748b;font-size:10px;">${item.unit || "—"}</span>`, center: true },
      { key: "price", val: `<span style="color:#374151;">${(item.price || 0).toLocaleString()}</span>` },
      ...(ps.showDiscount ? [{ key: "disc", val: `<span style="color:#dc2626;font-size:10px;">${item.discount_value ? item.discount_value.toLocaleString() : item.discount_percent ? `${item.discount_percent}%` : "—"}</span>` }] : []),
      ...(ps.showTax ? [{ key: "tax", val: `<span style="font-size:10px;color:#374151;">—</span>` }] : []),
      { key: "total", val: `<strong style="color:${accentColor};">${(item.total || 0).toLocaleString()}</strong>` },
    ];

    return `<tr style="background:${rowBg};border-bottom:1px solid #e2e8f0;">
      ${cells.map(c => `<td style="padding:8px 10px;font-size:12px;text-align:${c.center ? "center" : "right"};">${c.val}</td>`).join("")}
    </tr>`;
  }).join("");

  return `
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:${accentColor};">${headerRow}</tr>
      </thead>
      <tbody>${bodyRows}${items.length === 0 ? `<tr><td colspan="${cols.length}" style="text-align:center;padding:20px;color:#94a3b8;font-size:11px;">لا توجد أصناف</td></tr>` : ""}</tbody>
    </table>
  `;
}

function getTotalsHTML(invoice, ps, accentColor) {
  const subtotal = invoice.subtotal || 0;
  const discount = invoice.discount_value || 0;
  const tax = invoice.tax_amount || 0;
  const total = invoice.total || 0;
  const paid = invoice.paid_amount || 0;
  const remaining = invoice.remaining_amount || 0;
  const cur = ps.currencySymbol || invoice.currency || "";

  const row = (label, val, color = "#374151") =>
    `<div style="display:flex;justify-content:space-between;padding:6px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;">
      <span style="color:#64748b;">${label}</span>
      <span style="font-weight:600;color:${color};">${typeof val === "number" ? val.toLocaleString() : val} ${cur}</span>
    </div>`;

  const wordsSection = ps.showTotalInWords && total
    ? `<div style="margin-top:8px;padding:8px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:11px;color:#92400e;">
        <strong>فقط: </strong>${numberToArabicWords(total)} ${cur} لا غير
       </div>` : "";

  const bankSection = ps.showBankInfo && ps.bankName
    ? `<div style="margin-top:12px;padding:10px 14px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;font-size:11px;color:#166534;">
        <div style="font-weight:700;margin-bottom:4px;">بيانات التحويل البنكي</div>
        ${ps.bankName ? `<div>البنك: <strong>${ps.bankName}</strong></div>` : ""}
        ${ps.bankAccount ? `<div>رقم الحساب: <strong>${ps.bankAccount}</strong></div>` : ""}
        ${ps.bankIBAN ? `<div>IBAN: <strong style="direction:ltr;display:inline-block;">${ps.bankIBAN}</strong></div>` : ""}
       </div>` : "";

  return `
    <div style="width:260px;border-radius:12px;overflow:hidden;border:1px solid ${accentColor}33;">
      ${row("المجموع الفرعي", subtotal)}
      ${discount > 0 ? row("الخصم", `- ${discount.toLocaleString()}`, "#dc2626") : ""}
      ${tax > 0 ? row("الضريبة", tax) : ""}
      <div style="display:flex;justify-content:space-between;padding:10px 14px;background:${accentColor};color:white;font-weight:700;font-size:13px;">
        <span>الإجمالي</span><span>${total.toLocaleString()} ${cur}</span>
      </div>
      ${paid > 0 ? row("المدفوع", paid, "#16a34a") : ""}
      ${remaining > 0 ? row("المتبقي", remaining, "#dc2626") : ""}
    </div>
    ${wordsSection}
    ${bankSection}
  `;
}

function getSignaturesHTML(invoice, company, ps, isSales) {
  const approvalBlock = invoice.approved_by
    ? `<div style="text-align:center;">
        ${invoice.approval_signature ? `<img src="${invoice.approval_signature}" alt="توقيع" style="height:60px;max-width:150px;object-fit:contain;border:1px solid #e2e8f0;border-radius:6px;background:white;" />` : `<div style="width:52px;height:52px;border-radius:50%;background:#16a34a;color:white;font-size:22px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;margin:auto;">✓</div>`}
        <div style="font-size:10px;color:#16a34a;font-weight:700;margin-top:4px;">معتمد رسمياً</div>
        <div style="font-size:10px;color:#374151;font-weight:600;">${invoice.approved_by}</div>
        ${invoice.approved_at ? `<div style="font-size:9px;color:#94a3b8;">${new Date(invoice.approved_at).toLocaleDateString("ar-EG")}</div>` : ""}
        ${invoice.approval_note ? `<div style="font-size:9px;color:#94a3b8;font-style:italic;">"${invoice.approval_note}"</div>` : ""}
       </div>`
    : `<div style="border-top:1px dashed #cbd5e1;padding-top:8px;margin-top:32px;text-align:center;">
        <div style="font-size:10px;color:#94a3b8;">في انتظار الاعتماد</div>
       </div>`;

  if (!ps.showSignatureLines) return "";

  return `
    <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-top:16px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;divide-x:1px solid #e2e8f0;">
        <div style="padding:16px;text-align:center;border-left:1px solid #e2e8f0;">
          <div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:8px;">توقيع المُصدِر / الشركة</div>
          <div style="border-top:1px dashed #cbd5e1;padding-top:8px;margin-top:32px;">
            <div style="font-size:10px;color:#64748b;">${company.name || "—"}</div>
          </div>
        </div>
        <div style="padding:16px;text-align:center;">
          <div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:8px;">${isSales ? "توقيع العميل / الاستلام" : "توقيع المورد / التسليم"}</div>
          ${approvalBlock}
        </div>
      </div>
    </div>
  `;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function InvoicePrintTemplate({ invoice, open, onClose }) {
  const printRef = useRef(null);
  const [ps, setPs] = useState(null);
  const [loading, setLoading] = useState(true);
  const settings = getSettings();
  const company = settings?.company || {};

  useEffect(() => {
    if (!invoice || !open) return;
    setLoading(true);
    const docType = invoice?.pattern_type || "فاتورة مبيعات";
    getBoundPrintSettings(docType).then(s => {
      setPs(s);
      setLoading(false);
    });
  }, [invoice, open]);

  if (!ps) {
    // Fallback while loading
    const fallback = getPrintSettings();
    if (!ps) {
      return loading && open ? (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          </DialogContent>
        </Dialog>
      ) : null;
    }
  }

  const isSales = invoice?.pattern_type?.includes("مبيعات");
  const isReturn = invoice?.pattern_type?.includes("مرتجع");
  const typeLabel = invoice?.pattern_type || "فاتورة";
  const accentColor = isReturn ? "#dc2626" : isSales ? "#1d4ed8" : "#7c3aed";
  const finalColor = ps.primaryColor || accentColor;

  const fontImport = {
    "Tajawal": "https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap",
    "Cairo": "https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap",
    "Reem Kufi": "https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;500;600;700&display=swap",
    "Noto Naskh Arabic": "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap",
    "Amiri": "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap",
  }[ps.font] || "https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap";

  const pageSizeMap = { A4: "210mm 297mm", A5: "148mm 210mm", Letter: "216mm 279mm" };
  const fontSize = { small: "11px", normal: "13px", large: "15px" }[ps.fontSize] || "13px";

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(`
      <html dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>فاتورة ${invoice?.invoice_number || ""}</title>
          <link href="${fontImport}" rel="stylesheet" />
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: '${ps.font}', 'Tajawal', Arial, sans-serif; color:#1e293b; direction:rtl; background:#fff; font-size:${fontSize}; }
            .page { width:${pageSizeMap[ps.paperSize] || "210mm"}.split(" ")[0]}; min-height:297mm; margin:0 auto; padding:12mm 14mm; position:relative; }
            ${ps.showWatermark && ps.watermarkText ? `
            .watermark {
              position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg);
              font-size:72px; font-weight:900; color:rgba(0,0,0,0.04); white-space:nowrap; pointer-events:none; z-index:0;
            }` : ""}
            @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
          </style>
        </head>
        <body>
          ${ps.showWatermark && ps.watermarkText ? `<div class="watermark">${ps.watermarkText}</div>` : ""}
          <div class="page">${content.innerHTML}</div>
        </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 700);
  }

  if (!invoice) return null;

  const items = invoice.items || [];
  const subtotal = invoice.subtotal || 0;
  const discount = invoice.discount_value || 0;
  const tax = invoice.tax_amount || 0;
  const total = invoice.total || 0;
  const paid = invoice.paid_amount || 0;
  const remaining = invoice.remaining_amount || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b px-5 py-3 shadow-sm">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Printer className="h-4 w-4 text-primary" />
            معاينة الفاتورة قبل الطباعة
          </h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" /> طباعة
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-6 bg-gray-50">
          <div
            ref={printRef}
            dir="rtl"
            className="bg-white shadow-lg rounded-xl mx-auto overflow-hidden"
            style={{
              maxWidth: 800,
              fontFamily: `'${ps.font}', 'Tajawal', Arial, sans-serif`,
              color: "#1e293b",
              fontSize,
              position: "relative"
            }}
          >
            {/* Watermark */}
            {ps.showWatermark && ps.watermarkText && (
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%,-50%) rotate(-35deg)",
                fontSize: 72, fontWeight: 900, color: "rgba(0,0,0,0.04)",
                whiteSpace: "nowrap", pointerEvents: "none", zIndex: 0
              }}>
                {ps.watermarkText}
              </div>
            )}

            {/* Header strip (modern only) */}
            {ps.template === "modern" && (
              <div style={{ background: finalColor, height: 8 }} />
            )}

            <div className="p-8 pb-4" style={{ position: "relative", zIndex: 1 }}>
              {/* Company + Invoice badge */}
              {ps.template === "modern" || ps.template === "minimal" ? (
                <div className="flex items-start justify-between mb-6">
                  {/* Company */}
                  <div className="flex-1">
                    {company.logo && ps.showLogo ? (
                      <img src={company.logo} alt="logo" className="h-14 mb-2 object-contain" style={{ maxWidth: 160 }} />
                    ) : (
                      <div className="h-14 w-14 rounded-xl mb-2 flex items-center justify-center text-white text-2xl font-black shadow"
                        style={{ background: ps.template === "minimal" ? "#e2e8f0" : finalColor, color: ps.template === "minimal" ? "#475569" : "white" }}>
                        {(company.name || "ش")[0]}
                      </div>
                    )}
                    <h1 className="text-xl font-black" style={{ color: ps.template === "minimal" ? "#1e293b" : finalColor }}>
                      {company.name || "اسم الشركة"}
                    </h1>
                    {company.address && <p className="text-xs text-gray-500 mt-0.5">{company.address}</p>}
                    {company.phone && <p className="text-xs text-gray-500">📞 {company.phone}</p>}
                    {company.email && <p className="text-xs text-gray-500">✉ {company.email}</p>}
                    {ps.showTaxNumber && company.taxNumber && <p className="text-xs text-gray-500">الرقم الضريبي: <strong>{company.taxNumber}</strong></p>}
                    {ps.showCommercialRegister && company.commercialRegister && <p className="text-xs text-gray-500">السجل التجاري: <strong>{company.commercialRegister}</strong></p>}
                    {ps.extraCompanyLine1 && <p className="text-xs text-gray-600">{ps.extraCompanyLine1}</p>}
                    {ps.extraCompanyLine2 && <p className="text-xs text-gray-600">{ps.extraCompanyLine2}</p>}
                    {ps.headerText && <p className="text-xs text-primary font-medium mt-1">{ps.headerText}</p>}
                  </div>
                  {/* Badge */}
                  <div className="text-left" style={{ minWidth: 220 }}>
                    <div className="rounded-xl px-6 py-4 text-white shadow-lg"
                      style={{ background: ps.template === "minimal" ? "#f1f5f9" : `linear-gradient(135deg, ${finalColor}, ${finalColor}cc)`, color: ps.template === "minimal" ? "#1e293b" : "white" }}>
                      <p className="text-xs font-medium opacity-80 mb-1">{typeLabel}</p>
                      <p className="text-2xl font-black tracking-wide">{invoice.invoice_number}</p>
                      <p className="text-xs opacity-80 mt-2">
                        📅 {invoice.date ? new Date(invoice.date).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                      </p>
                    </div>
                    <div className="mt-3 space-y-1 text-right">
                      {invoice.branch_name && <p className="text-xs text-gray-500">الفرع: <span className="font-medium text-gray-700">{invoice.branch_name}</span></p>}
                      {invoice.warehouse_name && <p className="text-xs text-gray-500">المستودع: <span className="font-medium text-gray-700">{invoice.warehouse_name}</span></p>}
                      {invoice.payment_method && <p className="text-xs text-gray-500">الدفع: <span className="font-medium text-gray-700">{invoice.payment_method}</span></p>}
                    </div>
                  </div>
                </div>
              ) : ps.template === "branded" ? (
                <div>
                  {/* Branded: colored header bar above */}
                  <div className="rounded-xl px-6 py-4 text-white mb-6 -mx-8 -mt-8"
                    style={{ background: finalColor }}>
                    <div className="flex items-center justify-between">
                      <div>
                        {company.logo && ps.showLogo && (
                          <img src={company.logo} alt="logo" className="h-12 object-contain mb-2" style={{ filter: "brightness(10)" }} />
                        )}
                        <h1 className="text-xl font-black">{company.name || "اسم الشركة"}</h1>
                        {company.address && <p className="text-xs opacity-80">{company.address}</p>}
                        {company.phone && <p className="text-xs opacity-80">📞 {company.phone}</p>}
                        {ps.showTaxNumber && company.taxNumber && <p className="text-xs opacity-80">الرقم الضريبي: {company.taxNumber}</p>}
                        {ps.extraCompanyLine1 && <p className="text-xs opacity-80">{ps.extraCompanyLine1}</p>}
                      </div>
                      <div className="text-center" style={{ background: "rgba(255,255,255,.2)", borderRadius: 12, padding: "12px 20px", border: "1px solid rgba(255,255,255,.3)" }}>
                        <p className="text-xs opacity-80">{typeLabel}</p>
                        <p className="text-2xl font-black">{invoice.invoice_number}</p>
                        <p className="text-xs opacity-80">{invoice.date ? new Date(invoice.date).toLocaleDateString("ar-EG") : ""}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : ps.template === "classic" ? (
                <div className="border-2 rounded-xl p-5 mb-4" style={{ borderColor: finalColor }}>
                  <div className="text-center pb-4 mb-4" style={{ borderBottom: `2px solid ${finalColor}` }}>
                    {company.logo && ps.showLogo ? (
                      <img src={company.logo} alt="logo" className="h-14 object-contain mx-auto mb-2" />
                    ) : (
                      <div className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-2xl font-black"
                        style={{ background: finalColor }}>{(company.name || "ش")[0]}</div>
                    )}
                    <h1 className="text-xl font-black" style={{ color: finalColor }}>{company.name || "اسم الشركة"}</h1>
                    {company.address && <p className="text-xs text-gray-500 mt-0.5">{company.address}</p>}
                    {company.phone && <p className="text-xs text-gray-500">{company.phone}</p>}
                    {ps.showTaxNumber && company.taxNumber && <p className="text-xs text-gray-500">الرقم الضريبي: {company.taxNumber}</p>}
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="text-xs text-gray-500">
                      {company.email && <p>{company.email}</p>}
                      {ps.extraCompanyLine1 && <p>{ps.extraCompanyLine1}</p>}
                      {ps.headerText && <p className="text-primary font-medium">{ps.headerText}</p>}
                    </div>
                    <div className="rounded-xl px-5 py-3 text-white" style={{ background: finalColor }}>
                      <p className="text-xs opacity-80">{typeLabel}</p>
                      <p className="text-xl font-black">{invoice.invoice_number}</p>
                      <p className="text-xs opacity-80">{invoice.date ? new Date(invoice.date).toLocaleDateString("ar-EG") : ""}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Client box */}
              {invoice.client_name && (
                <div className="rounded-xl p-4 mb-6"
                  style={{ background: `${finalColor}0d`, border: `1px solid ${finalColor}33` }}>
                  <p className="text-xs font-bold mb-1" style={{ color: finalColor }}>
                    {isSales ? "بيانات العميل" : "بيانات المورد"}
                  </p>
                  <p className="text-base font-bold text-gray-800">{invoice.client_name}</p>
                  {invoice.client_phone && <p className="text-xs text-gray-500 mt-0.5">📞 {invoice.client_phone}</p>}
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="px-8 pb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: finalColor }}>
                    {[
                      "#",
                      ...(ps.showItemCode ? ["الرمز"] : []),
                      "الصنف / الخدمة",
                      "الكمية", "الوحدة", "السعر",
                      ...(ps.showDiscount ? ["الخصم"] : []),
                      ...(ps.showTax ? ["الضريبة"] : []),
                      "الإجمالي"
                    ].map((h, i) => (
                      <th key={i} className="py-2.5 px-3 text-white font-semibold text-xs"
                        style={{ textAlign: i === 0 ? "center" : "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rowBg = ps.tableStyle === "striped"
                      ? (idx % 2 === 0 ? "#f8fafc" : "#ffffff")
                      : ps.tableStyle === "solid"
                        ? (idx % 2 === 0 ? "#f1f5f9" : "#e8edf2")
                        : "#ffffff";
                    return (
                      <tr key={idx} style={{ background: rowBg, borderBottom: "1px solid #e2e8f0" }}>
                        <td className="py-2.5 px-3 text-center text-gray-400 text-xs">{idx + 1}</td>
                        {ps.showItemCode && <td className="py-2.5 px-3 text-xs text-gray-500">{item.product_id || "—"}</td>}
                        <td className="py-2.5 px-3 font-medium text-gray-800">{item.product_name}</td>
                        <td className="py-2.5 px-3 text-center text-gray-700">{item.quantity?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-center text-gray-500 text-xs">{item.unit || "—"}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{item.price?.toLocaleString()}</td>
                        {ps.showDiscount && (
                          <td className="py-2.5 px-3 text-right text-red-500 text-xs">
                            {item.discount_value ? item.discount_value.toLocaleString() : item.discount_percent ? `${item.discount_percent}%` : "—"}
                          </td>
                        )}
                        {ps.showTax && <td className="py-2.5 px-3 text-right text-xs text-gray-500">—</td>}
                        <td className="py-2.5 px-3 text-right font-semibold" style={{ color: finalColor }}>
                          {item.total?.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr><td colSpan={10} className="py-6 text-center text-gray-400 text-xs">لا توجد أصناف</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals + Notes */}
            <div className="px-8 pb-6 flex gap-6 items-start flex-row-reverse">
              {/* Totals */}
              <div className="shrink-0">
                <div className="w-64 rounded-xl overflow-hidden border" style={{ borderColor: `${finalColor}33` }}>
                  <TotalRow label="المجموع الفرعي" value={subtotal} currency={ps.currencySymbol || invoice.currency} />
                  {discount > 0 && <TotalRow label="الخصم" value={`- ${discount.toLocaleString()}`} red />}
                  {ps.showTax && tax > 0 && <TotalRow label="الضريبة" value={tax} currency={ps.currencySymbol || invoice.currency} />}
                  <div style={{ background: finalColor }} className="flex justify-between px-4 py-3 text-white font-bold text-sm">
                    <span>الإجمالي</span>
                    <span>{total.toLocaleString()} {ps.currencySymbol || invoice.currency || ""}</span>
                  </div>
                  {paid > 0 && <TotalRow label="المدفوع" value={paid} currency={ps.currencySymbol || invoice.currency} green />}
                  {remaining > 0 && <TotalRow label="المتبقي" value={remaining} currency={ps.currencySymbol || invoice.currency} red />}
                </div>

                {/* Total in words */}
                {ps.showTotalInWords && total > 0 && (
                  <div className="mt-2 p-2.5 rounded-lg text-xs" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
                    <strong>فقط: </strong>{numberToArabicWords(total)} {ps.currencySymbol || invoice.currency || ""} لا غير
                  </div>
                )}

                {/* Bank info */}
                {ps.showBankInfo && ps.bankName && (
                  <div className="mt-2 p-3 rounded-lg text-xs" style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#166534" }}>
                    <p className="font-bold mb-1">بيانات التحويل البنكي</p>
                    {ps.bankName && <p>البنك: <strong>{ps.bankName}</strong></p>}
                    {ps.bankAccount && <p>رقم الحساب: <strong>{ps.bankAccount}</strong></p>}
                    {ps.bankIBAN && <p>IBAN: <strong dir="ltr" className="inline-block">{ps.bankIBAN}</strong></p>}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="flex-1">
                {invoice.notes && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 mb-3">
                    <p className="font-semibold mb-1">ملاحظات:</p>
                    <p>{invoice.notes}</p>
                  </div>
                )}
                {ps.showTerms && ps.termsText && (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
                    <p className="font-semibold mb-1">الشروط والأحكام:</p>
                    <p style={{ whiteSpace: "pre-line" }}>{ps.termsText}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Signature section */}
            {ps.showSignatureLines && (
              <div className="mx-8 mb-6 border rounded-xl overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gray-200">
                  <div className="p-5 text-center">
                    <p className="text-xs font-bold text-gray-600 mb-8">توقيع المُصدِر / الشركة</p>
                    <div className="border-t border-dashed border-gray-300 pt-2 mt-8">
                      <p className="text-xs text-gray-400">{company.name || "—"}</p>
                    </div>
                  </div>
                  <div className="p-5 text-center">
                    <p className="text-xs font-bold text-gray-600 mb-8">
                      {isSales ? "توقيع العميل / الاستلام" : "توقيع المورد / التسليم"}
                    </p>
                    {invoice.approved_by ? (
                      <div className="flex flex-col items-center gap-1">
                        {invoice.approval_signature ? (
                          <img src={invoice.approval_signature} alt="توقيع إلكتروني"
                            style={{ height: 64, maxWidth: 160, objectFit: "contain" }}
                            className="border border-gray-200 rounded bg-white" />
                        ) : (
                          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-md"
                            style={{ background: "#16a34a" }}>✓</div>
                        )}
                        <p className="text-xs font-semibold text-green-700 mt-1">معتمد رسمياً</p>
                        <p className="text-[10px] text-gray-600 font-medium">{invoice.approved_by}</p>
                        {invoice.approved_at && (
                          <p className="text-[10px] text-gray-400">{new Date(invoice.approved_at).toLocaleDateString("ar-EG")}</p>
                        )}
                        {invoice.approval_note && (
                          <p className="text-[10px] text-gray-400 italic">"{invoice.approval_note}"</p>
                        )}
                      </div>
                    ) : (
                      <div className="border-t border-dashed border-gray-300 pt-2 mt-8">
                        <p className="text-xs text-gray-400">في انتظار الاعتماد</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-8 py-3 text-center text-xs text-white"
              style={{ background: `${finalColor}cc` }}>
              {ps.footerText || `${company.name || ""} ${company.phone ? `• ${company.phone}` : ""} ${company.email ? `• ${company.email}` : ""} ${ps.showTaxNumber && company.taxNumber ? `• ض: ${company.taxNumber}` : ""}`}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TotalRow({ label, value, currency, red, green }) {
  return (
    <div className="flex justify-between px-4 py-2 text-sm border-b border-gray-100"
      style={{ color: red ? "#dc2626" : green ? "#16a34a" : "#374151" }}>
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="font-medium">
        {typeof value === "number" ? value.toLocaleString() : value} {typeof value === "number" && currency ? currency : ""}
      </span>
    </div>
  );
}