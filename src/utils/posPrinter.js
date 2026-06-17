/**
 * POS Printer Utility
 * يُرسل أوامر الطباعة إلى طابعات الشبكة عبر بروتوكول ESC/POS
 * ملاحظة: الطباعة الفعلية عبر TCP تتطلب وسيطاً محلياً (Print Bridge)
 * هذا الملف يُولّد محتوى الطباعة ويفتح نافذة طباعة في المتصفح كبديل.
 */

/**
 * تجميع بنود الطلب حسب القسم
 */
export function groupItemsByDepartment(cartItems, products) {
  const groups = {};
  cartItems.forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    const dept = product?.print_department || "عام";
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push({ ...item, print_department: dept });
  });
  return groups;
}

/**
 * إنشاء محتوى HTML لورقة طباعة القسم
 */
export function buildDepartmentTicketHTML({ department, items, orderNumber, date, note = "" }) {
  const time = date ? new Date(date).toLocaleTimeString("ar-SA") : new Date().toLocaleTimeString("ar-SA");
  const dateStr = date ? new Date(date).toLocaleDateString("ar-SA") : new Date().toLocaleDateString("ar-SA");

  const rows = items.map(item => `
    <tr>
      <td style="padding:4px 2px;font-size:14px;font-weight:bold;">${item.product_name}</td>
      <td style="padding:4px 2px;font-size:16px;font-weight:bold;text-align:center;">${item.quantity}</td>
      <td style="padding:4px 2px;font-size:12px;text-align:left;">${item.unit_name || ""}</td>
    </tr>
  `).join("");

  return `
    <html dir="rtl">
    <head>
      <meta charset="UTF-8"/>
      <style>
        body { font-family: 'Courier New', monospace; width: 80mm; margin: 0; padding: 8px; }
        h2 { text-align:center; font-size:18px; margin:0 0 4px; }
        .order-no { text-align:center; font-size:22px; font-weight:bold; border: 2px solid #000; padding:4px; margin:6px 0; }
        .dept { text-align:center; font-size:16px; background:#000; color:#fff; padding:4px; margin:6px 0; }
        .time { text-align:center; font-size:11px; color:#555; margin-bottom:8px; }
        table { width:100%; border-collapse:collapse; }
        th { border-bottom:2px solid #000; padding:4px 2px; font-size:12px; }
        tr:not(:last-child) td { border-bottom: 1px dashed #ccc; }
        .footer { text-align:center; font-size:11px; margin-top:10px; border-top:1px dashed #000; padding-top:6px; }
        @media print { @page { margin:0; size:80mm auto; } }
      </style>
    </head>
    <body>
      <h2>طلب قسم</h2>
      <div class="dept">${department}</div>
      <div class="order-no">طلب رقم: ${orderNumber}</div>
      <div class="time">${dateStr} - ${time}</div>
      <table>
        <thead><tr><th>الصنف</th><th>الكمية</th><th>الوحدة</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${note ? `<div class="footer">${note}</div>` : ""}
    </body>
    </html>
  `;
}

/**
 * إنشاء محتوى HTML للإيصال الكامل للعميل
 * يدعم إعدادات قالب الطباعة للـ POS
 */
export function buildReceiptHTML({ items, orderNumber, date, subtotal, discount, total, paid, change, paymentMethod, clientName, companyName = "نقطة البيع", receiptNote = "", cashierName = "", printSettings = null, company = null }) {
  const time = new Date().toLocaleTimeString("ar-SA");
  const dateStr = date ? new Date(date).toLocaleDateString("ar-SA") : new Date().toLocaleDateString("ar-SA");

  // Use print settings if available
  const ps = printSettings || {};
  const comp = company || {};

  if (ps.template) {
    // Use the bound template for styled POS receipt
    const font = ps.font || "Tajawal";
    const color = ps.primaryColor || "#1d4ed8";
    const logo = ps.showLogo ? (ps.logoUrl || comp.logo) : null;
    const cur = ps.currencySymbol || "";
    const fontSize = { small: "10px", normal: "12px", large: "14px" }[ps.fontSize] || "12px";

    const rows = items.map(item => `
      <tr>
        <td style="padding:4px 6px;font-size:${fontSize};border-bottom:1px solid #e2e8f0;">${item.product_name}</td>
        <td style="padding:4px 6px;font-size:${fontSize};text-align:center;border-bottom:1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding:4px 6px;font-size:${fontSize};text-align:left;border-bottom:1px solid #e2e8f0;">${(item.total || 0).toLocaleString()} ${cur}</td>
      </tr>
    `).join("");

    return `
      <html dir="rtl">
      <head>
        <meta charset="UTF-8"/>
        <style>
          body { font-family: '${font}', 'Tajawal', Arial, sans-serif; width: 80mm; margin: 0; padding: 0; direction:rtl; }
          h2 { text-align:center; font-size:16px; margin:0; padding:8px 0 2px; }
          .top-bar { background:${color}; height:4px; }
          .header { padding:8px 10px; text-align:center; }
          .order-no { text-align:center; font-size:11px; color:#555; margin-bottom:4px; }
          .divider { border-top:1px dashed #cbd5e1; margin:4px 0; }
          table { width:100%; border-collapse:collapse; }
          th { border-bottom:2px solid ${color}; padding:4px 6px; font-size:11px; color:${color}; }
          .totals { width:100%; margin-top:4px; }
          .totals td { padding:2px 6px; font-size:11px; }
          .total-row td { font-size:13px; font-weight:bold; border-top:2px solid ${color}; background:${color}12; color:${color}; }
          .footer { text-align:center; font-size:10px; margin-top:6px; padding:6px; background:${color}; color:white; }
          @media print { @page { margin:0; size:80mm auto; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
        </style>
      </head>
      <body>
        <div class="top-bar"></div>
        <div class="header">
          ${logo ? `<img src="${logo}" alt="logo" style="height:40px;max-width:120px;object-fit:contain;margin-bottom:4px;" />` : ""}
          <h2 style="color:${color}">${comp.name || companyName}</h2>
          ${comp.phone ? `<div style="font-size:10px;color:#666;">${comp.phone}</div>` : ""}
          ${ps.showTaxNumber && comp.taxNumber ? `<div style="font-size:9px;color:#999;">الرقم الضريبي: ${comp.taxNumber}</div>` : ""}
        </div>
        <div class="divider"></div>
        <div class="order-no">رقم الطلب: ${orderNumber} | ${dateStr} ${time}</div>
        ${clientName ? `<div class="order-no">العميل: ${clientName}</div>` : ""}
        ${cashierName ? `<div class="order-no">الكاشير: ${cashierName}</div>` : ""}
        <div class="divider"></div>
        <table>
          <thead><tr><th>الصنف</th><th>الكمية</th><th>الإجمالي</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="divider"></div>
        <table class="totals">
          <tr><td>المجموع</td><td style="text-align:left;">${subtotal.toLocaleString()} ${cur}</td></tr>
          ${discount > 0 ? `<tr><td>الخصم</td><td style="text-align:left;color:#dc2626;">- ${discount.toLocaleString()} ${cur}</td></tr>` : ""}
          <tr class="total-row"><td>الإجمالي</td><td style="text-align:left;">${total.toLocaleString()} ${cur}</td></tr>
          ${paid > 0 ? `<tr><td>المدفوع (${paymentMethod})</td><td style="text-align:left;">${paid.toLocaleString()} ${cur}</td></tr>` : ""}
          ${change > 0 ? `<tr><td>الباقي</td><td style="text-align:left;">${change.toLocaleString()} ${cur}</td></tr>` : ""}
        </table>
        <div class="divider"></div>
        <div class="footer">${ps.footerText || receiptNote || "شكراً لزيارتكم"}</div>
      </body>
      </html>
    `;
  }

  // Fallback to basic thermal receipt
  const rows = items.map(item => `
    <tr>
      <td style="padding:3px 2px;font-size:12px;">${item.product_name}</td>
      <td style="padding:3px 2px;font-size:12px;text-align:center;">${item.quantity}</td>
      <td style="padding:3px 2px;font-size:12px;text-align:left;">${item.price.toLocaleString()}</td>
      <td style="padding:3px 2px;font-size:12px;text-align:left;">${item.total.toLocaleString()}</td>
    </tr>
  `).join("");

  return `
    <html dir="rtl">
    <head>
      <meta charset="UTF-8"/>
      <style>
        body { font-family: 'Courier New', monospace; width: 80mm; margin: 0; padding: 8px; }
        h2 { text-align:center; font-size:16px; margin:0 0 2px; }
        .order-no { text-align:center; font-size:13px; color:#555; margin-bottom:6px; }
        .divider { border-top:1px dashed #000; margin:6px 0; }
        table { width:100%; border-collapse:collapse; }
        th { border-bottom:1px solid #000; padding:3px 2px; font-size:11px; }
        .totals { width:100%; margin-top:6px; }
        .totals td { padding:2px; font-size:12px; }
        .total-row td { font-size:14px; font-weight:bold; border-top:1px solid #000; }
        .footer { text-align:center; font-size:11px; margin-top:8px; }
        @media print { @page { margin:0; size:80mm auto; } }
      </style>
    </head>
    <body>
      <h2>${companyName}</h2>
      <div class="order-no">رقم الطلب: ${orderNumber} | ${dateStr} ${time}</div>
      ${clientName ? `<div class="order-no">العميل: ${clientName}</div>` : ""}
      <div class="divider"></div>
      <table>
        <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="divider"></div>
      <table class="totals">
        <tr><td>المجموع</td><td style="text-align:left;">${subtotal.toLocaleString()}</td></tr>
        ${discount > 0 ? `<tr><td>الخصم</td><td style="text-align:left;">- ${discount.toLocaleString()}</td></tr>` : ""}
        <tr class="total-row"><td>الإجمالي</td><td style="text-align:left;">${total.toLocaleString()}</td></tr>
        ${paid > 0 ? `<tr><td>المدفوع (${paymentMethod})</td><td style="text-align:left;">${paid.toLocaleString()}</td></tr>` : ""}
        ${change > 0 ? `<tr><td>الباقي</td><td style="text-align:left;">${change.toLocaleString()}</td></tr>` : ""}
      </table>
      <div class="divider"></div>
      <div class="footer">${receiptNote || "شكراً لزيارتكم"}</div>
    </body>
    </html>
  `;
}

/**
 * فتح نافذة الطباعة في المتصفح
 */
export function printHTML(html) {
  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) { alert("يرجى السماح بالنوافذ المنبثقة لتفعيل الطباعة"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
}

/**
 * الدالة الرئيسية: طباعة طلب POS على الطابعات المناسبة
 */
export async function printPOSOrder({ cart, products, printers, orderNumber, date, discount, total, subtotal, paid, change, paymentMethod, clientName, companyName, receiptNote, cashierName, printSettings, company }) {
  const groups = groupItemsByDepartment(cart, products);

  // طباعة ورقة لكل قسم
  for (const [dept, items] of Object.entries(groups)) {
    const printer = printers.find(p => p.department === dept && p.is_active && !p.is_main);
    if (printer || Object.keys(groups).length > 0) {
      const html = buildDepartmentTicketHTML({ department: dept, items, orderNumber, date });
      printHTML(html);
      await new Promise(r => setTimeout(r, 400)); // فاصل بين نوافذ الطباعة
    }
  }

  // طباعة إيصال العميل (الطابعة الرئيسية أو افتراضياً)
  const mainPrinter = printers.find(p => p.is_main && p.is_active);
  if (mainPrinter || printers.length === 0) {
    const html = buildReceiptHTML({ items: cart, orderNumber, date, subtotal, discount, total, paid, change, paymentMethod, clientName, companyName, receiptNote, cashierName, printSettings, company });
    printHTML(html);
  }
}