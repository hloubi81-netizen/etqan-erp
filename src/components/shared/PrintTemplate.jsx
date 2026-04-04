/**
 * PrintTemplate - قالب طباعة موحد لجميع مستندات النظام
 * يستخدم إعدادات الفاتورة المطبوعة (InvoicePrintConfig) للهيدر والفوتر
 *
 * Props:
 *  config      - إعدادات الطباعة من usePrintConfig()
 *  docType     - نوع المستند: 'invoice' | 'voucher' | 'report' | 'salary' | 'asset'
 *  title       - عنوان المستند (مثال: "فاتورة مبيعات")
 *  number      - رقم المستند
 *  date        - تاريخ المستند
 *  meta        - مصفوفة [{label, value}] للبيانات الجانبية
 *  children    - محتوى المستند (جدول أو أي تفاصيل)
 *  totals      - مصفوفة [{label, value, bold?}] للمجاميع
 *  notes       - ملاحظات إضافية خاصة بالمستند
 */
export default function PrintTemplate({
  config = {},
  docType = "invoice",
  title = "مستند",
  number = "",
  date = "",
  meta = [],
  children,
  totals = [],
  notes = "",
}) {
  const {
    company_name = "اسم الشركة",
    company_address = "",
    company_phone = "",
    company_email = "",
    company_tax_number = "",
    logo_url,
    format = "simplified",
    show_logo = true,
    show_tax_number = true,
    show_signature = false,
    footer_notes = "",
    shipping_notes = "",
    terms = "",
    custom_field_1_label = "",
    custom_field_1_value = "",
    custom_field_2_label = "",
    custom_field_2_value = "",
    primary_color = "#4338ca",
  } = config;

  const isReport = docType === "report";

  return (
    <div
      className="bg-white text-gray-800 text-sm shadow-lg"
      style={{ direction: "rtl", minWidth: 480, maxWidth: 780, margin: "0 auto", fontFamily: "Cairo, sans-serif" }}
    >
      {/* Header */}
      <div style={{ backgroundColor: primary_color }} className="text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold">{company_name}</h1>
            {(format === "detailed" || isReport) && (
              <>
                {company_address && <p className="text-xs opacity-80 mt-0.5">{company_address}</p>}
                {(company_phone || company_email) && (
                  <p className="text-xs opacity-80">{company_phone}{company_email ? ` | ${company_email}` : ""}</p>
                )}
              </>
            )}
            {show_tax_number && company_tax_number && (
              <p className="text-xs opacity-80">الرقم الضريبي: {company_tax_number}</p>
            )}
          </div>
          <div>
            {show_logo && logo_url ? (
              <img src={logo_url} alt="شعار" className="h-16 w-16 object-contain bg-white rounded-lg p-1" />
            ) : (
              <div className="h-14 w-14 bg-white/20 rounded-lg" />
            )}
          </div>
        </div>
      </div>

      {/* Document title & meta */}
      <div className="px-6 py-3 border-b bg-gray-50 flex justify-between items-start gap-4">
        <div>
          <h2 className="font-bold text-base" style={{ color: primary_color }}>{title}</h2>
          {number && <p className="text-xs text-gray-500">رقم: <span className="font-semibold text-gray-700">{number}</span></p>}
          {date && <p className="text-xs text-gray-500">التاريخ: <span className="font-semibold text-gray-700">{date}</span></p>}
        </div>
        <div className="text-xs text-gray-600 space-y-0.5 text-left min-w-[160px]">
          {meta.map((m, i) => m.value ? (
            <p key={i}><span className="text-gray-400">{m.label}: </span><span className="font-medium">{m.value}</span></p>
          ) : null)}
          {custom_field_1_label && custom_field_1_value && (
            <p><span className="text-gray-400">{custom_field_1_label}: </span><span className="font-medium">{custom_field_1_value}</span></p>
          )}
          {custom_field_2_label && custom_field_2_value && (
            <p><span className="text-gray-400">{custom_field_2_label}: </span><span className="font-medium">{custom_field_2_value}</span></p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-3">{children}</div>

      {/* Totals */}
      {totals.length > 0 && (
        <div className="px-6 pb-3 flex justify-end">
          <div className="min-w-[200px] space-y-1 text-xs border rounded-lg p-3 bg-gray-50">
            {totals.map((t, i) => (
              <div key={i} className={`flex justify-between ${t.bold ? "font-bold text-sm border-t pt-1 mt-1" : ""}`}
                style={t.bold ? { color: primary_color } : {}}>
                <span className={t.bold ? "" : "text-gray-500"}>{t.label}</span>
                <span>{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document-specific notes */}
      {notes && (
        <div className="px-6 pb-3 border-t pt-3">
          <p className="text-xs font-semibold text-gray-600 mb-1">ملاحظات:</p>
          <p className="text-xs text-gray-500 whitespace-pre-line">{notes}</p>
        </div>
      )}

      {/* Config footer notes */}
      {(shipping_notes || footer_notes || terms) && (
        <div className="px-6 pb-4 space-y-2 border-t pt-3 text-xs text-gray-600">
          {shipping_notes && (
            <div>
              <p className="font-semibold text-gray-700 mb-0.5">ملاحظات الشحن:</p>
              <p className="whitespace-pre-line">{shipping_notes}</p>
            </div>
          )}
          {terms && (
            <div>
              <p className="font-semibold text-gray-700 mb-0.5">الشروط التجارية:</p>
              <p className="whitespace-pre-line">{terms}</p>
            </div>
          )}
          {footer_notes && (
            <div>
              <p className="font-semibold text-gray-700 mb-0.5">ملاحظات عامة:</p>
              <p className="whitespace-pre-line">{footer_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Signature */}
      {show_signature && (
        <div className="px-6 pb-6 pt-2 flex justify-between text-xs text-gray-500">
          <div className="text-center">
            <div className="border-t border-gray-300 w-32 mb-1" />
            <p>توقيع المستلم</p>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-300 w-32 mb-1" />
            <p>توقيع المُصدِر</p>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="text-center text-[10px] text-gray-400 pb-3 border-t pt-2">
        {company_name}{company_phone ? ` — ${company_phone}` : ""}
      </div>
    </div>
  );
}