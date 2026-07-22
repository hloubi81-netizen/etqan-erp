import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer } from "lucide-react";

const TIER_COLORS = {
  "برونزي": "bg-amber-100 text-amber-800",
  "فضي": "bg-gray-100 text-gray-700",
  "ذهبي": "bg-yellow-100 text-yellow-800",
  "بلاتيني": "bg-purple-100 text-purple-800",
};

export default function LoyaltyCardDialog({ client, onClose }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && client?.card_number) {
      try {
        JsBarcode(barcodeRef.current, client.card_number, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
        });
      } catch (_) { /* ignore */ }
    }
  }, [client?.card_number]);

  if (!client) return null;

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=420,height=360");
    if (!win) return;
    const svg = barcodeRef.current?.outerHTML || "";
    win.document.write(`
      <html dir="rtl"><head><title>بطاقة ولاء - ${client.client_name}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 24px; }
        .card { border: 2px solid #ddd; border-radius: 14px; padding: 22px; max-width: 340px; margin: auto; }
        .name { font-size: 18px; font-weight: bold; margin: 8px 0; }
        .tier { display: inline-block; padding: 3px 12px; border-radius: 999px; background: #eee; font-size: 12px; }
        .points { color: #555; font-size: 13px; margin: 6px 0; }
        .num { font-family: monospace; font-size: 13px; color: #444; margin-top: 8px; }
        svg { max-width: 100%; }
      </style></head>
      <body><div class="card">
        <div class="name">${client.client_name}</div>
        <div class="tier">${client.tier || "برونزي"}</div>
        <div class="points">النقاط المتاحة: ${(client.available_points || 0).toLocaleString()}</div>
        ${svg}
        <div class="num">${client.card_number}</div>
      </div>
      <script>window.onload = function(){ window.print(); }</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>بطاقة الولاء</DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-3">
          <p className="text-lg font-bold">{client.client_name}</p>
          <Badge className={TIER_COLORS[client.tier] || TIER_COLORS["برونزي"]}>{client.tier || "برونزي"}</Badge>
          <div className="p-4 bg-white border rounded-lg">
            {client.card_number ? (
              <svg ref={barcodeRef} className="mx-auto" />
            ) : (
              <p className="text-sm text-muted-foreground">لا يوجد رقم بطاقة</p>
            )}
          </div>
          <p className="font-mono text-sm text-muted-foreground">{client.card_number || "—"}</p>
          <div className="flex justify-between text-sm bg-muted/40 rounded-lg p-3">
            <span className="text-muted-foreground">النقاط المتاحة</span>
            <span className="font-bold text-green-600">{(client.available_points || 0).toLocaleString()}</span>
          </div>
          <Button className="w-full gap-1.5" onClick={handlePrint} disabled={!client.card_number}>
            <Printer className="h-4 w-4" /> طباعة البطاقة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}