import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Printer, X, Eye } from "lucide-react";
import { buildReceiptHTML, buildDepartmentTicketHTML } from "@/utils/posPrinter";
import { getBoundPrintSettings, getCompanySettings } from "@/utils/printBinding";

/**
 * POS Receipt Preview Dialog
 * Shows a preview of the POS receipt before printing.
 * Uses bound print template if available.
 */
export default function POSReceiptPreview({ open, onClose, receiptData }) {
  const printRef = useRef(null);
  const [printSettings, setPrintSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getBoundPrintSettings("إيصال نقطة بيع").then(s => {
        setPrintSettings(s);
        setLoading(false);
      });
    }
  }, [open]);

  if (!receiptData || !open) return null;

  const {
    cart, products, printers, orderNumber, date, subtotal,
    discount, total, paid, change, paymentMethod, clientName,
    companyName, receiptNote, cashierName, departments
  } = receiptData;

  const company = getCompanySettings();

  const receiptHTML = buildReceiptHTML({
    items: cart,
    orderNumber,
    date,
    subtotal,
    discount,
    total,
    paid,
    change,
    paymentMethod,
    clientName,
    companyName,
    receiptNote,
    cashierName,
    printSettings,
    company,
  });

  function handlePrint() {
    // Print department tickets
    if (departments) {
      for (const [dept, items] of Object.entries(departments)) {
        const html = buildDepartmentTicketHTML({ department: dept, items, orderNumber, date });
        const win = window.open("", "_blank", "width=400,height=600");
        if (win) {
          win.document.write(html);
          win.document.close();
          win.focus();
          setTimeout(() => win.print(), 300);
        }
      }
    }

    // Print receipt
    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;
    win.document.write(receiptHTML);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <h2 className="font-bold text-sm">معاينة إيصال نقطة البيع</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" onClick={handlePrint} className="gap-1 h-7 text-xs">
              <Printer className="h-3.5 w-3.5" /> طباعة
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-200 flex justify-center p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div
              ref={printRef}
              dir="rtl"
              className="bg-white shadow-lg mx-auto"
              style={{ width: 320, minHeight: 400 }}
            >
              {/* Render styled or basic receipt */}
              {printSettings?.template ? (
                <StyledReceipt receiptData={receiptData} ps={printSettings} company={company} />
              ) : (
                <BasicReceipt receiptData={receiptData} />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StyledReceipt({ receiptData, ps, company }) {
  const { cart, orderNumber, date, subtotal, discount, total, paid, change, paymentMethod, clientName, cashierName, receiptNote, companyName } = receiptData;
  const color = ps.primaryColor || "#1d4ed8";
  const logo = ps.showLogo ? (ps.logoUrl || company.logo) : null;
  const cur = ps.currencySymbol || "";
  const font = ps.font || "Tajawal";
  const fontSize = { small: "10px", normal: "12px", large: "14px" }[ps.fontSize] || "12px";

  const time = new Date().toLocaleTimeString("ar-SA");
  const dateStr = date ? new Date(date).toLocaleDateString("ar-SA") : new Date().toLocaleDateString("ar-SA");

  return (
    <div style={{ fontFamily: `${font}, Tajawal, Arial, sans-serif`, fontSize, color: "#1e293b", direction: "rtl" }}>
      <div style={{ background: color, height: 4 }} />
      <div style={{ padding: "8px 10px", textAlign: "center" }}>
        {logo && <img src={logo} alt="logo" style={{ height: 40, maxWidth: 120, objectFit: "contain", marginBottom: 4 }} />}
        <h2 style={{ margin: 0, fontSize: 16, color }}>{company.name || companyName || "نقطة البيع"}</h2>
        {company.phone && <div style={{ fontSize: 10, color: "#666" }}>{company.phone}</div>}
        {ps.showTaxNumber && company.taxNumber && <div style={{ fontSize: 9, color: "#999" }}>الرقم الضريبي: {company.taxNumber}</div>}
      </div>
      <div style={{ borderTop: "1px dashed #cbd5e1", margin: "4px 0" }} />
      <div style={{ textAlign: "center", fontSize: 11, color: "#555", marginBottom: 4 }}>
        رقم الطلب: {orderNumber} | {dateStr} {time}
      </div>
      {clientName && <div style={{ textAlign: "center", fontSize: 11, color: "#555" }}>العميل: {clientName}</div>}
      {cashierName && <div style={{ textAlign: "center", fontSize: 11, color: "#555" }}>الكاشير: {cashierName}</div>}
      <div style={{ borderTop: "1px dashed #cbd5e1", margin: "4px 8px" }} />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize }}>
        <thead>
          <tr>
            <th style={{ borderBottom: `2px solid ${color}`, padding: "4px 6px", color, textAlign: "right" }}>الصنف</th>
            <th style={{ borderBottom: `2px solid ${color}`, padding: "4px 6px", color, textAlign: "center" }}>الكمية</th>
            <th style={{ borderBottom: `2px solid ${color}`, padding: "4px 6px", color, textAlign: "left" }}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {(cart || []).map((item, i) => (
            <tr key={i}>
              <td style={{ padding: "4px 6px", borderBottom: "1px solid #e2e8f0" }}>{item.product_name}</td>
              <td style={{ padding: "4px 6px", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>{item.quantity}</td>
              <td style={{ padding: "4px 6px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>{(item.total || 0).toLocaleString()} {cur}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ borderTop: "1px dashed #cbd5e1", margin: "4px 8px" }} />
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4, fontSize }}>
        <tbody>
          <tr><td style={{ padding: "2px 8px" }}>المجموع</td><td style={{ padding: "2px 8px", textAlign: "left" }}>{subtotal.toLocaleString()} {cur}</td></tr>
          {discount > 0 && <tr><td style={{ padding: "2px 8px" }}>الخصم</td><td style={{ padding: "2px 8px", textAlign: "left", color: "#dc2626" }}>- {discount.toLocaleString()} {cur}</td></tr>}
          <tr style={{ background: `${color}12` }}>
            <td style={{ padding: "3px 8px", fontWeight: "bold", borderTop: `2px solid ${color}`, color }}>الإجمالي</td>
            <td style={{ padding: "3px 8px", textAlign: "left", fontWeight: "bold", borderTop: `2px solid ${color}`, color }}>{total.toLocaleString()} {cur}</td>
          </tr>
          {paid > 0 && <tr><td style={{ padding: "2px 8px" }}>المدفوع ({paymentMethod})</td><td style={{ padding: "2px 8px", textAlign: "left" }}>{paid.toLocaleString()} {cur}</td></tr>}
          {change > 0 && <tr><td style={{ padding: "2px 8px" }}>الباقي</td><td style={{ padding: "2px 8px", textAlign: "left" }}>{change.toLocaleString()} {cur}</td></tr>}
          {receiptData.isForeign && receiptData.fxTotal != null && (
            <tr style={{ background: "#eff6ff" }}>
              <td style={{ padding: "3px 8px", color: "#1d4ed8", fontWeight: "bold" }}>الإجمالي ({receiptData.currencySymbol}) × {receiptData.exchangeRate}</td>
              <td style={{ padding: "3px 8px", textAlign: "left", color: "#1d4ed8", fontWeight: "bold" }}>{receiptData.fxTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {receiptData.currencySymbol}</td>
            </tr>
          )}
        </tbody>
      </table>
      <div style={{ borderTop: "1px dashed #cbd5e1", margin: "6px 8px" }} />
      <div style={{ padding: "6px", background: color, color: "white", textAlign: "center", fontSize: 10 }}>
        {ps.footerText || receiptNote || "شكراً لزيارتكم"}
      </div>
    </div>
  );
}

function BasicReceipt({ receiptData }) {
  const { cart, orderNumber, date, subtotal, discount, total, paid, change, paymentMethod, clientName, receiptNote, companyName } = receiptData;
  const time = new Date().toLocaleTimeString("ar-SA");
  const dateStr = date ? new Date(date).toLocaleDateString("ar-SA") : new Date().toLocaleDateString("ar-SA");

  return (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, padding: 8 }}>
      <h2 style={{ textAlign: "center", fontSize: 16, margin: 0 }}>{companyName || "نقطة البيع"}</h2>
      <div style={{ textAlign: "center", fontSize: 13, color: "#555", marginBottom: 6 }}>رقم الطلب: {orderNumber} | {dateStr} {time}</div>
      {clientName && <div style={{ textAlign: "center", fontSize: 13, color: "#555" }}>العميل: {clientName}</div>}
      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={{ borderBottom: "1px solid #000", padding: "3px 2px", fontSize: 11 }}>الصنف</th><th style={{ borderBottom: "1px solid #000", padding: "3px 2px", fontSize: 11, textAlign: "center" }}>الكمية</th><th style={{ borderBottom: "1px solid #000", padding: "3px 2px", fontSize: 11, textAlign: "left" }}>الإجمالي</th></tr></thead>
        <tbody>
          {(cart || []).map((item, i) => (
            <tr key={i}>
              <td style={{ padding: "3px 2px" }}>{item.product_name}</td>
              <td style={{ padding: "3px 2px", textAlign: "center" }}>{item.quantity}</td>
              <td style={{ padding: "3px 2px", textAlign: "left" }}>{item.total.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      <table style={{ width: "100%", marginTop: 6 }}>
        <tbody>
          <tr><td>المجموع</td><td style={{ textAlign: "left" }}>{subtotal.toLocaleString()}</td></tr>
          {discount > 0 && <tr><td>الخصم</td><td style={{ textAlign: "left" }}>- {discount.toLocaleString()}</td></tr>}
          <tr><td style={{ fontSize: 14, fontWeight: "bold", borderTop: "1px solid #000" }}>الإجمالي</td><td style={{ fontSize: 14, fontWeight: "bold", borderTop: "1px solid #000", textAlign: "left" }}>{total.toLocaleString()}</td></tr>
          {paid > 0 && <tr><td>المدفوع ({paymentMethod})</td><td style={{ textAlign: "left" }}>{paid.toLocaleString()}</td></tr>}
          {change > 0 && <tr><td>الباقي</td><td style={{ textAlign: "left" }}>{change.toLocaleString()}</td></tr>}
          {receiptData.isForeign && receiptData.fxTotal != null && (
            <tr><td style={{ fontSize: 11, color: "#1d4ed8" }}>الإجمالي ({receiptData.currencySymbol})</td><td style={{ textAlign: "left", fontSize: 11, color: "#1d4ed8", fontWeight: "bold" }}>{receiptData.fxTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {receiptData.currencySymbol}</td></tr>
          )}
        </tbody>
      </table>
      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      <div style={{ textAlign: "center", fontSize: 11, marginTop: 8 }}>{receiptNote || "شكراً لزيارتكم"}</div>
    </div>
  );
}