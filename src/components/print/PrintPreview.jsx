import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Printer, X } from "lucide-react";

/**
 * Universal Print Preview component
 * Renders any HTML content in a preview dialog with print capability.
 *
 * @param {boolean} open - Dialog open state
 * @param {function} onClose - Close callback
 * @param {string} title - Dialog title
 * @param {object} style - CSS style object for the preview container
 * @param {React.ReactNode} children - Content to preview
 * @param {string} printTitle - Title for the print window
 */
export default function PrintPreview({ open, onClose, title, style, children, printTitle }) {
  const printRef = useRef(null);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <html dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>${printTitle || title || "طباعة"}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: 'Tajawal', 'Cairo', Arial, sans-serif; direction:rtl; }
            @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden p-0 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white border-b px-5 py-3 shrink-0">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Printer className="h-4 w-4 text-primary" />
            {title || "معاينة قبل الطباعة"}
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

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div
            ref={printRef}
            dir="rtl"
            className="bg-white shadow-lg rounded-xl mx-auto overflow-hidden"
            style={{
              maxWidth: 800,
              fontFamily: "'Tajawal', 'Cairo', Arial, sans-serif",
              color: "#1e293b",
              fontSize: "13px",
              ...style,
            }}
          >
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}