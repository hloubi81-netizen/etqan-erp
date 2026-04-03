export default function InvoicePrintPreview({ config, sampleData }) {
  const {
    company_name = "اسم الشركة",
    company_address = "العنوان",
    company_phone = "0501234567",
    company_email = "info@company.com",
    company_tax_number = "300000000000003",
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
  } = config || {};

  const items = sampleData?.items || [
    { product_name: "منتج تجريبي أول", quantity: 2, unit: "قطعة", price: 150, total: 300 },
    { product_name: "منتج تجريبي ثاني", quantity: 1, unit: "كرتون", price: 500, total: 500 },
    { product_name: "خدمة تجريبية", quantity: 3, unit: "ساعة", price: 80, total: 240 },
  ];
  const subtotal = sampleData?.subtotal || 1040;
  const tax = sampleData?.tax_amount || 156;
  const total = sampleData?.total || 1196;

  return (
    <div
      className="bg-white text-gray-800 font-cairo text-sm shadow-lg"
      style={{ direction: "rtl", minWidth: 480, maxWidth: 700, margin: "0 auto", fontFamily: "Cairo, sans-serif" }}
    >
      {/* Header */}
      <div style={{ backgroundColor: primary_color }} className="text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{company_name}</h1>
            {format === "detailed" && (
              <>
                <p className="text-xs opacity-80 mt-0.5">{company_address}</p>
                <p className="text-xs opacity-80">{company_phone} | {company_email}</p>
              </>
            )}
            {show_tax_number && company_tax_number && (
              <p className="text-xs opacity-80">الرقم الضريبي: {company_tax_number}</p>
            )}
          </div>
          <div className="text-left">
            {show_logo && logo_url ? (
              <img src={logo_url} alt="شعار" className="h-16 w-16 object-contain bg-white rounded-lg p-1" />
            ) : (
              <div className="h-16 w-16 bg-white/20 rounded-lg flex items-center justify-center text-xs text-center opacity-60">
                الشعار
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice meta */}
      <div className="px-6 py-3 border-b bg-gray-50 flex justify-between items-start">
        <div>
          <h2 className="font-bold text-lg" style={{ color: primary_color }}>فاتورة مبيعات</h2>
          <p className="text-xs text-gray-500">رقم: <span className="font-semibold text-gray-700">0042</span></p>
          <p className="text-xs text-gray-500">التاريخ: <span className="font-semibold text-gray-700">{new Date().toLocaleDateString("ar-SA")}</span></p>
        </div>
        <div className="text-left text-xs text-gray-600 space-y-0.5">
          <p className="font-semibold">العميل: شركة الأمل</p>
          <p>طريقة الدفع: نقداً</p>
          {custom_field_1_label && custom_field_1_value && (
            <p>{custom_field_1_label}: <span className="font-medium">{custom_field_1_value}</span></p>
          )}
          {custom_field_2_label && custom_field_2_value && (
            <p>{custom_field_2_label}: <span className="font-medium">{custom_field_2_value}</span></p>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="px-6 py-3">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ backgroundColor: primary_color + "15" }}>
              <th className="text-right py-2 px-2 font-semibold border-b">#</th>
              <th className="text-right py-2 px-2 font-semibold border-b">الصنف</th>
              {format === "detailed" && <th className="text-center py-2 px-2 font-semibold border-b">الوحدة</th>}
              <th className="text-center py-2 px-2 font-semibold border-b">الكمية</th>
              <th className="text-center py-2 px-2 font-semibold border-b">السعر</th>
              <th className="text-center py-2 px-2 font-semibold border-b">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="py-1.5 px-2 border-b border-gray-100">{i + 1}</td>
                <td className="py-1.5 px-2 border-b border-gray-100 font-medium">{item.product_name}</td>
                {format === "detailed" && <td className="py-1.5 px-2 border-b border-gray-100 text-center">{item.unit}</td>}
                <td className="py-1.5 px-2 border-b border-gray-100 text-center">{item.quantity}</td>
                <td className="py-1.5 px-2 border-b border-gray-100 text-center">{item.price?.toLocaleString()}</td>
                <td className="py-1.5 px-2 border-b border-gray-100 text-center font-semibold">{item.total?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="px-6 pb-3 flex justify-end">
        <div className="w-48 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">المجموع الفرعي</span>
            <span>{subtotal.toLocaleString()}</span>
          </div>
          {format === "detailed" && (
            <div className="flex justify-between">
              <span className="text-gray-500">ضريبة القيمة المضافة (15%)</span>
              <span>{tax.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t pt-1 mt-1" style={{ color: primary_color }}>
            <span>الإجمالي</span>
            <span>{total.toLocaleString()} ر.س</span>
          </div>
        </div>
      </div>

      {/* Footer fields */}
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
      <div className="text-center text-[10px] text-gray-400 pb-3">
        {company_name} — {company_phone}
      </div>
    </div>
  );
}