import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, RotateCcw, Loader2, Check, Minus, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SalesReturnDialog({ open, onClose, onDone, cashierName }) {
  const [originalNumber, setOriginalNumber] = useState("");
  const [originalSession, setOriginalSession] = useState(null);
  const [searching, setSearching] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [saving, setSaving] = useState(false);

  async function searchSession() {
    const num = originalNumber.trim();
    if (!num) { toast.error("أدخل رقم الفاتورة الأصلية"); return; }
    setSearching(true);
    try {
      const sessions = await base44.entities.POSSession.filter({ session_number: num, is_return: { $ne: true } });
      if (!sessions || sessions.length === 0) {
        toast.error("لم يتم العثور على فاتورة بيع بهذا الرقم");
        setOriginalSession(null);
        setReturnItems([]);
        return;
      }
      const session = sessions[0];
      if (session.status === "ملغاة") { toast.error("هذه الفاتورة ملغاة"); return; }
      setOriginalSession(session);
      setReturnItems((session.items || []).map(item => ({
        ...item,
        return_quantity: 0,
        max_quantity: item.quantity,
        selected: false,
      })));
      toast.success(`تم العثور على فاتورة ${session.session_number}`);
    } catch (err) {
      toast.error("خطأ في البحث");
    } finally {
      setSearching(false);
    }
  }

  function toggleItem(idx) {
    setReturnItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, selected: !item.selected, return_quantity: !item.selected ? item.max_quantity : 0 } : item
    ));
  }

  function updateReturnQty(idx, delta) {
    setReturnItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newQty = Math.max(0, Math.min(item.max_quantity, item.return_quantity + delta));
      return { ...item, return_quantity: newQty, selected: newQty > 0 };
    }));
  }

  function setReturnQty(idx, val) {
    const qty = Math.max(0, Math.min(returnItems[idx].max_quantity, parseFloat(val) || 0));
    setReturnItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, return_quantity: qty, selected: qty > 0 } : item
    ));
  }

  const selectedItems = returnItems.filter(i => i.selected && i.return_quantity > 0);
  const returnTotal = selectedItems.reduce((s, i) => s + i.return_quantity * i.price, 0);

  async function handleSubmit() {
    if (selectedItems.length === 0) { toast.error("اختر صنفاً واحداً على الأقل للإرجاع"); return; }
    setSaving(true);
    try {
      const sessions = await base44.entities.POSSession.list();
      const num = "R" + String(sessions.length + 1).padStart(5, "0");
      const returnItemsData = selectedItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.return_quantity,
        price: item.price,
        total: item.return_quantity * item.price,
      }));
      const subtotal = returnItemsData.reduce((s, i) => s + i.total, 0);
      const rec = await base44.entities.POSSession.create({
        session_number: num,
        date: new Date().toISOString().split("T")[0],
        items: returnItemsData,
        subtotal,
        discount: 0,
        tax: 0,
        total: subtotal,
        paid: subtotal,
        change: 0,
        payment_method: originalSession.payment_method || "نقداً",
        client_name: originalSession.client_name || "",
        cashier_name: cashierName || undefined,
        status: "مكتملة",
        is_return: true,
        original_session_number: originalSession.session_number,
        description: `مرتجع من الفاتورة الأصلية ${originalSession.session_number}`,
      });
      toast.success(`تم إنشاء فاتورة المرتجع ${num}`);
      if (onDone) onDone(rec);
      handleClose();
    } catch (err) {
      toast.error("خطأ في حفظ المرتجع");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setOriginalNumber("");
    setOriginalSession(null);
    setReturnItems([]);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-destructive" />
            فاتورة مرتجع مبيعات
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* البحث عن الفاتورة الأصلية */}
          <div className="space-y-2">
            <Label>رقم فاتورة البيع الأصلية</Label>
            <div className="flex gap-2">
              <Input
                placeholder="أدخل رقم الجلسة..."
                value={originalNumber}
                onChange={(e) => setOriginalNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchSession()}
              />
              <Button onClick={searchSession} disabled={searching} variant="outline">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                بحث
              </Button>
            </div>
          </div>

          {/* تفاصيل الفاتورة الأصلية */}
          {originalSession && (
            <>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الرقم:</span>
                  <span className="font-semibold">{originalSession.session_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">التاريخ:</span>
                  <span>{originalSession.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">العميل:</span>
                  <span>{originalSession.client_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الإجمالي الأصلي:</span>
                  <span className="font-bold">{(originalSession.total || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* قائمة الأصناف */}
              <div className="space-y-2">
                <Label>الأصناف — حدد الكميات المرتجعة</Label>
                {returnItems.map((item, idx) => (
                  <div key={idx} className={`rounded-lg p-2.5 border transition-colors ${
                    item.selected ? "bg-destructive/5 border-destructive/30" : "bg-muted/30 border-border"
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => toggleItem(idx)}
                        className="flex items-center gap-2 flex-1 text-right"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          item.selected ? "bg-destructive text-destructive-foreground border-destructive" : "border-border"
                        }`}>
                          {item.selected && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{item.product_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            الكمية الأصلية: {item.max_quantity} | السعر: {item.price.toLocaleString()}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        {item.selected && (
                          <>
                            <button
                              onClick={() => updateReturnQty(idx, -1)}
                              className="h-6 w-6 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <Input
                              type="number"
                              value={item.return_quantity}
                              onChange={(e) => setReturnQty(idx, e.target.value)}
                              className="h-7 w-14 text-xs text-center"
                              min="0"
                              max={item.max_quantity}
                            />
                            <button
                              onClick={() => updateReturnQty(idx, 1)}
                              className="h-6 w-6 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {item.selected && item.return_quantity > 0 && (
                      <div className="mt-1 text-left">
                        <Badge variant="secondary" className="text-[10px]">
                          إجمالي الإرجاع: {(item.return_quantity * item.price).toLocaleString()}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ملخص المرتجع */}
              {selectedItems.length > 0 && (
                <div className="bg-destructive/5 rounded-lg p-3 space-y-1 text-sm border border-destructive/20">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">عدد الأصناف المرتجعة:</span>
                    <span className="font-semibold">{selectedItems.length}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-destructive/20 pt-1.5 mt-1">
                    <span>إجمالي المرتجع</span>
                    <span className="text-destructive">{returnTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {!originalSession && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">أدخل رقم فاتورة البيع الأصلية لعرض الأصناف</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>إلغاء</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || selectedItems.length === 0}
            variant="destructive"
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {saving ? "جاري الحفظ..." : "تأكيد المرتجع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}