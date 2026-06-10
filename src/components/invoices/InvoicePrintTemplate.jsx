import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Printer, X } from "lucide-react";

const SETTINGS_KEY = "itqan_app_settings";

function getSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export default function InvoicePrintTemplate({ invoice, open, onClose }) {
  const printRef = useRef(null);
  const settings = getSettings();
  const company = settings?.company || {};
  const invoiceSettings = settings?.invoices || {};

  const isSales = invoice?.pattern_type?.includes("مبيعات");
  const isReturn = invoice?.pattern_type?.includes("مرتجع");

  const typeLabel = invoice?.pattern_type || "فاتورة";
  const accentColor = isReturn ? "#dc2626" : isSales ? "#1d4ed8" : "#7c3aed";

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(`
      <html dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>فاتورة ${invoice?.invoice_number || ""}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: 'Tajawal', Arial, sans-serif; color: #1e293b; direction: rtl; background: #fff; }
            .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm 14mm; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body><div class="page">${content.innerHTML}</div></body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
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
        {/* toolbar */}
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

        {/* preview */}
        <div className="p-6 bg-gray-50">
          <div
            ref={printRef}
            dir="rtl"
            className="bg-white shadow-lg rounded-xl mx-auto overflow-hidden"
            style={{ maxWidth: 800, fontFamily: "'Tajawal', Arial, sans-serif", color: "#1e293b" }}
          >
            {/* header strip */}
            <div style={{ background: accentColor, height: 8 }} />

            {/* top section */}
            <div className="p-8 pb-4">
              <div className="flex items-start justify-between mb-6">
                {/* company info */}
                <div className="flex-1">
                  {company.logo ? (
                    <img src={company.logo} alt="logo" className="h-16 mb-3 object-contain" />
                  ) : (
                    <div
                      className="h-16 w-16 rounded-xl mb-3 flex items-center justify-center text-white text-2xl font-black shadow"
                      style={{ background: accentColor }}
                    >
                      {(company.name || "ش")[0]}
                    </div>
                  )}
                  <h1 className="text-xl font-black" style={{ color: accentColor }}>
                    {company.name || "اسم الشركة"}
                  </h1>
                  {company.address && <p className="text-xs text-gray-500 mt-0.5">{company.address}</p>}
                  {company.phone && <p className="text-xs text-gray-500">📞 {company.phone}</p>}
                  {company.email && <p className="text-xs text-gray-500">✉ {company.email}</p>}
                  {company.taxNumber && (
                    <p className="text-xs text-gray-500">الرقم الضريبي: {company.taxNumber}</p>
                  )}
                  {company.commercialRegister && (
                    <p className="text-xs text-gray-500">السجل التجاري: {company.commercialRegister}</p>
                  )}
                </div>

                {/* invoice badge */}
                <div className="text-left" style={{ minWidth: 220 }}>
                  <div
                    className="rounded-xl px-6 py-4 text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
                  >
                    <p className="text-xs font-medium opacity-80 mb-1">{typeLabel}</p>
                    <p className="text-2xl font-black tracking-wide">{invoice.invoice_number}</p>
                    <p className="text-xs opacity-80 mt-2">
                      📅 {invoice.date ? new Date(invoice.date).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                    </p>
                  </div>
                  <div className="mt-3 space-y-1 text-left">
                    {invoice.branch_name && (
                      <p className="text-xs text-gray-500">الفرع: <span className="font-medium text-gray-700">{invoice.branch_name}</span></p>
                    )}
                    {invoice.warehouse_name && (
                      <p className="text-xs text-gray-500">المستودع: <span className="font-medium text-gray-700">{invoice.warehouse_name}</span></p>
                    )}
                    {invoice.payment_method && (
                      <p className="text-xs text-gray-500">الدفع: <span className="font-medium text-gray-700">{invoice.payment_method}</span></p>
                    )}
                  </div>
                </div>
              </div>

              {/* client info */}
              {invoice.client_name && (
                <div
                  className="rounded-xl p-4 mb-6"
                  style={{ background: `${accentColor}0d`, border: `1px solid ${accentColor}33` }}
                >
                  <p className="text-xs font-bold mb-1" style={{ color: accentColor }}>
                    {isSales ? "بيانات العميل" : "بيانات المورد"}
                  </p>
                  <p className="text-base font-bold text-gray-800">{invoice.client_name}</p>
                  {invoice.client_phone && <p className="text-xs text-gray-500 mt-0.5">📞 {invoice.client_phone}</p>}
                </div>
              )}
            </div>

            {/* items table */}
            <div className="px-8 pb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: accentColor }}>
                    {["#", "الصنف / الخدمة", "الكمية", "الوحدة", "السعر", "الخصم", "الإجمالي"].map((h, i) => (
                      <th
                        key={i}
                        className="py-2.5 px-3 text-white font-semibold text-xs"
                        style={{ textAlign: i === 0 ? "center" : i >= 5 ? "left" : "right" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{ background: idx % 2 === 0 ? "#f8fafc" : "#ffffff", borderBottom: "1px solid #e2e8f0" }}
                    >
                      <td className="py-2.5 px-3 text-center text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">{item.product_name}</td>
                      <td className="py-2.5 px-3 text-center text-gray-700">{item.quantity?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center text-gray-500 text-xs">{item.unit || "—"}</td>
                      <td className="py-2.5 px-3 text-left text-gray-700">{item.price?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-left text-red-500 text-xs">
                        {item.discount_value ? item.discount_value.toLocaleString() : item.discount_percent ? `${item.discount_percent}%` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-left font-semibold" style={{ color: accentColor }}>
                        {item.total?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-400 text-xs">لا توجد أصناف</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* totals + notes */}
            <div className="px-8 pb-6 flex gap-6 items-start">
              {/* notes */}
              <div className="flex-1">
                {invoice.notes && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 mt-2">
                    <p className="font-semibold mb-1">ملاحظات:</p>
                    <p>{invoice.notes}</p>
                  </div>
                )}
                {invoiceSettings.footerNote && (
                  <p className="text-xs text-gray-400 mt-3 italic">{invoiceSettings.footerNote}</p>
                )}
              </div>

              {/* totals box */}
              <div className="w-64 rounded-xl overflow-hidden border" style={{ borderColor: `${accentColor}33` }}>
                <TotalRow label="المجموع الفرعي" value={subtotal} currency={invoice.currency} />
                {discount > 0 && <TotalRow label="الخصم" value={`- ${discount.toLocaleString()}`} red />}
                {tax > 0 && <TotalRow label="الضريبة" value={tax} currency={invoice.currency} />}
                <div style={{ background: accentColor }} className="flex justify-between px-4 py-3 text-white font-bold text-sm">
                  <span>الإجمالي</span>
                  <span>{total.toLocaleString()} {invoice.currency || ""}</span>
                </div>
                {paid > 0 && <TotalRow label="المدفوع" value={paid} currency={invoice.currency} green />}
                {remaining > 0 && <TotalRow label="المتبقي" value={remaining} currency={invoice.currency} red />}
              </div>
            </div>

            {/* signature section */}
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
                        <img
                          src={invoice.approval_signature}
                          alt="توقيع إلكتروني"
                          style={{ height: 64, maxWidth: 160, objectFit: "contain" }}
                          className="border border-gray-200 rounded bg-white"
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-md"
                          style={{ background: "#16a34a" }}
                        >
                          ✓
                        </div>
                      )}
                      <p className="text-xs font-semibold text-green-700 mt-1">معتمد رسمياً</p>
                      <p className="text-[10px] text-gray-600 font-medium">{invoice.approved_by}</p>
                      {invoice.approved_at && (
                        <p className="text-[10px] text-gray-400">
                          {new Date(invoice.approved_at).toLocaleDateString("ar-EG")}
                        </p>
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

            {/* footer strip */}
            <div
              className="px-8 py-3 text-center text-xs text-white"
              style={{ background: `${accentColor}cc` }}
            >
              {company.name} {company.phone ? `• ${company.phone}` : ""} {company.email ? `• ${company.email}` : ""}
              {company.taxNumber ? ` • ض: ${company.taxNumber}` : ""}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TotalRow({ label, value, currency, red, green }) {
  return (
    <div
      className="flex justify-between px-4 py-2 text-sm border-b border-gray-100"
      style={{ color: red ? "#dc2626" : green ? "#16a34a" : "#374151" }}
    >
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="font-medium">
        {typeof value === "number" ? value.toLocaleString() : value} {typeof value === "number" && currency ? currency : ""}
      </span>
    </div>
  );
}