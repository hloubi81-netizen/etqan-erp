import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, RotateCcw, XCircle, ArrowLeft } from "lucide-react";

const ORDER = ["تم الإنشاء", "قيد التجهيز", "قيد الشحن", "تم التسليم"];
const STATUS_COLOR = { "تم الإنشاء": "secondary", "قيد التجهيز": "default", "قيد الشحن": "default", "تم التسليم": "success", "مرتجع": "destructive", "مفقود": "destructive" };

function fmtDateTime(h) {
  if (h.timestamp) {
    const d = new Date(h.timestamp);
    return d.toLocaleDateString("ar-EG") + " — " + d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  }
  return h.date + (h.time ? " — " + h.time : "");
}

export default function ShipmentStatusUpdate({ shipment, onClose, onUpdated }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    base44.auth.me().then(u => setUserName(u?.full_name || "")).catch(() => {});
  }, []);

  const curIdx = ORDER.indexOf(shipment.status);
  const next = curIdx >= 0 && curIdx < ORDER.length - 1 ? ORDER[curIdx + 1] : null;
  const history = Array.isArray(shipment.status_history) ? shipment.status_history : [];
  const isTerminal = ["تم التسليم", "مرتجع", "مفقود"].includes(shipment.status);

  async function apply(newStatus) {
    setSaving(true);
    try {
      const ts = new Date().toISOString();
      const entry = {
        status: newStatus,
        date: ts.slice(0, 10),
        time: ts.slice(11, 16),
        timestamp: ts,
        updated_by: userName,
        note: note || "",
      };
      const payload = {
        status: newStatus,
        status_history: [...history, entry],
        actual_delivery: newStatus === "تم التسليم" ? ts.slice(0, 10) : shipment.actual_delivery,
      };
      await base44.entities.Shipment.update(shipment.id, payload);
      toast.success(`تم تحديث الحالة إلى: ${newStatus}`);
      onUpdated();
      onClose();
    } catch (e) {
      toast.error("تعذّر تحديث الحالة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>تتبع الشحنة — {shipment.tracking_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/30">
            <span className="text-sm text-muted-foreground">الحالة الحالية</span>
            <Badge variant={STATUS_COLOR[shipment.status] || "secondary"} className="text-sm px-3 py-1">{shipment.status}</Badge>
          </div>

          <div className="border rounded-lg p-3 bg-muted/20">
            <div className="text-sm font-medium mb-2">سجل التتبع لدى العميل</div>
            {history.length === 0 ? (
              <div className="text-xs text-muted-foreground">لا توجد تحديثات بعد</div>
            ) : (
              <div className="relative pr-4">
                <div className="absolute right-[7px] top-1 bottom-1 w-px bg-border" />
                <div className="space-y-3">
                  {history.map((h, i) => (
                    <div key={i} className="relative text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
                        <span className="text-muted-foreground font-medium">{fmtDateTime(h)}</span>
                        <Badge variant={STATUS_COLOR[h.status] || "secondary"}>{h.status}</Badge>
                      </div>
                      {(h.note || h.updated_by) && (
                        <div className="pr-6 mt-0.5 text-muted-foreground">
                          {h.updated_by && <span>بواسطة {h.updated_by} </span>}
                          {h.note && <span>— {h.note}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isTerminal && (
            <div>
              <Label>ملاحظة على التحديث (اختيارية)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: تم استلام الشحنة من المستودع" rows={2} />
            </div>
          )}

          {!isTerminal && (
            <div className="flex flex-wrap gap-2">
              {next && (
                <Button onClick={() => apply(next)} disabled={saving}>
                  <ArrowLeft className="h-4 w-4" /> تقديم إلى: {next}
                </Button>
              )}
              {shipment.status !== "تم التسليم" && (
                <Button onClick={() => apply("تم التسليم")} disabled={saving} className="bg-success text-success-foreground hover:bg-success/90">
                  <CheckCircle2 className="h-4 w-4" /> تسليم نهائي
                </Button>
              )}
              <Button variant="destructive" onClick={() => apply("مرتجع")} disabled={saving}>
                <RotateCcw className="h-4 w-4" /> مرتجع
              </Button>
              <Button variant="destructive" onClick={() => apply("مفقود")} disabled={saving}>
                <XCircle className="h-4 w-4" /> مفقود
              </Button>
            </div>
          )}
          {isTerminal && <div className="text-xs text-muted-foreground text-center">وصلت الشحنة لحالة نهائية، لا يمكن تحديثها.</div>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>إغلاق</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}