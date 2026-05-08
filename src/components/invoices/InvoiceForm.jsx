import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Zap } from "lucide-react";
import { priceForUnit, toBaseUnit, getBaseUnit } from "@/utils/unitConvert";
import { refreshAccountBalances } from "@/utils/journalEngine";
import { deductSalesInventory, addPurchaseInventory } from "@/utils/inventoryEngine";
import { createCurrencyDiffEntry, toLocalCurrency } from "@/utils/currencyEngine";
import { toast } from "sonner";
import AccountSearchInput from "@/components/shared/AccountSearchInput";

async function createCostEntryFromInvoice(invoice, costCenters) {
  if (!invoice.cost_center_id || !invoice.total || invoice.total <= 0) return;
  const cc = costCenters.find(c => c.id === invoice.cost_center_id);
  const costType = invoice.pattern_type?.includes("مشتريات") ? "مواد مباشرة" : "مصروفات بيع";
  await base44.entities.CostEntry.create({
    date: invoice.date,
    cost_center_id: invoice.cost_center_id,
    cost_center_name: cc?.name || invoice.cost_center_id,
    cost_type: costType,
    description: `${invoice.pattern_type} - فاتورة ${invoice.invoice_number} - ${invoice.client_name || ""}`,
    quantity: 1,
    unit: "فاتورة",
    unit_cost: invoice.total,
    total_cost: invoice.total,
    period: invoice.date?.slice(0, 7),
    status: "مرحّل",
    notes: `مصدر: فاتورة ${invoice.invoice_number}`,
  });
}

const EMPTY_ITEM = () => ({ product_id: "", product_name: "", quantity: 1, unit: "", price: 0, discount_percent: 0, discount_value: 0, total: 0 });
const MIN_ROWS = 10;

function buildDefaultItems(existing) {
  const rows = existing?.length ? [...existing] : [];
  while (rows.length < MIN_ROWS) rows.push(EMPTY_ITEM());
  return rows;
}

export default function InvoiceForm({ open, onClose, onSave, invoice, invoiceType, pattern }) {
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);

  const [form, setForm] = useState({
    invoice_number: invoice?.invoice_number || "",
    pattern_id: invoice?.pattern_id || pattern?.id || "",
    pattern_name: invoice?.pattern_name || pattern?.name || "",
    pattern_type: invoiceType,
    date: invoice?.date || new Date().toISOString().split("T")[0],
    client_account_id: invoice?.client_account_id || "",
    client_name: invoice?.client_name || "",
    warehouse_id: invoice?.warehouse_id || pattern?.default_warehouse_id || "",
    warehouse_name: invoice?.warehouse_name || "",
    payment_method: invoice?.payment_method || "نقداً",
    currency: invoice?.currency || pattern?.default_currency || "",
    exchange_rate: invoice?.exchange_rate || 1,
    items: buildDefaultItems(invoice?.items),
    subtotal: invoice?.subtotal || 0,
    discount_value: invoice?.discount_value || 0,
    discount_percent: invoice?.discount_percent || 0,
    tax_amount: invoice?.tax_amount || 0,
    total: invoice?.total || 0,
    total_local: invoice?.total_local || 0,
    paid_amount: invoice?.paid_amount || 0,
    remaining_amount: invoice?.remaining_amount || 0,
    notes: invoice?.notes || "",
    cost_center_id: invoice?.cost_center_id || pattern?.cost_center_id || "",
    cost_center_name: invoice?.cost_center_name || "",
    status: invoice?.status || "مسودة",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [prods, accs, whs, currs, invs, ccs] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.Account.list(),
      base44.entities.Warehouse.list(),
      base44.entities.Currency.list(),
      base44.entities.Invoice.filter({ pattern_type: invoiceType }),
      base44.entities.CostCenter.list(),
    ]);
    setProducts(prods);
    setAccounts(accs);
    setWarehouses(whs);
    setCurrencies(currs);
    setAllInvoices(invs);
    setCostCenters(ccs);

    if (!invoice) {
      const nextNum = invs.length + 1;
      const wh = pattern?.default_warehouse_id ? whs.find(w => w.id === pattern.default_warehouse_id) : null;
      const cc = pattern?.cost_center_id ? ccs.find(c => c.id === pattern.cost_center_id) : null;
      const localCur = currs.find(c => c.is_local);
      const defaultCurName = pattern?.default_currency || localCur?.name || "";
      const defaultCur = currs.find(c => c.name === defaultCurName);
      setForm((prev) => ({
        ...prev,
        invoice_number: String(nextNum).padStart(4, "0"),
        warehouse_id: prev.warehouse_id || (wh?.id ?? ""),
        warehouse_name: prev.warehouse_name || (wh?.name ?? ""),
        currency: prev.currency || defaultCurName,
        exchange_rate: defaultCur?.exchange_rate || 1,
        cost_center_id: prev.cost_center_id || (cc?.id ?? ""),
        cost_center_name: prev.cost_center_name || (cc?.name ?? ""),
      }));
    }
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, EMPTY_ITEM()],
    }));
  }

  function removeItem(idx) {
    const newItems = form.items.map((item, i) => i === idx ? EMPTY_ITEM() : item);
    // If all last rows are empty, keep MIN_ROWS; otherwise trim trailing empty beyond MIN_ROWS
    const trimmed = newItems.length > MIN_ROWS
      ? newItems.filter((item, i) => i < MIN_ROWS || item.product_id !== "")
      : newItems;
    setForm((prev) => ({ ...prev, items: trimmed }));
    recalculate(trimmed, form.discount_percent, form.discount_value);
  }

  function updateItem(idx, key, value) {
    const newItems = form.items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [key]: value };
      if (key === "product_id") {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          const baseUnit = getBaseUnit(prod.units || []);
          updated.product_name = prod.name;
          updated.unit = baseUnit?.name || "قطعة";
          updated.conversion_factor = parseFloat(baseUnit?.conversion_factor) || 1;
          updated.price = prod.retail_price || 0;
          updated.available_units = prod.units || [];
        }
      }
      if (key === "unit") {
        const prod = products.find((p) => p.id === item.product_id);
        if (prod) {
          const selUnit = (prod.units || []).find((u) => u.name === value);
          updated.conversion_factor = parseFloat(selUnit?.conversion_factor) || 1;
          updated.price = priceForUnit(prod.retail_price || 0, selUnit);
        }
      }
      const baseQty = toBaseUnit(updated.quantity || 0, { conversion_factor: updated.conversion_factor || 1 });
      updated.base_quantity = baseQty;
      updated.total = (updated.quantity || 0) * (updated.price || 0) * (1 - (updated.discount_percent || 0) / 100) - (updated.discount_value || 0);
      return updated;
    });
    setForm((prev) => ({ ...prev, items: newItems }));
    recalculate(newItems, form.discount_percent, form.discount_value);
  }

  function recalculate(items, discPct, discVal, overrideRate) {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    let discount = discVal || 0;
    if (discPct > 0) discount = subtotal * discPct / 100;
    const afterDiscount = subtotal - discount;
    const taxAmount = 0;
    const total = afterDiscount + taxAmount;
    const paid = form.payment_method === "نقداً" ? total : form.paid_amount;
    const rate = overrideRate !== undefined ? overrideRate : form.exchange_rate;
    const total_local = toLocalCurrency(total, rate);
    setForm((prev) => ({
      ...prev,
      items,
      subtotal,
      discount_value: discount,
      discount_percent: discPct,
      tax_amount: taxAmount,
      total,
      total_local,
      paid_amount: paid,
      remaining_amount: total - paid,
      exchange_rate: rate,
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
          {invoice ? "تعديل" : "إنشاء"} فاتورة {invoiceType}
          {form.pattern_name && <span className="text-sm font-normal text-muted-foreground mr-2">| نمط: {form.pattern_name}</span>}
        </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>رقم الفاتورة</Label>
              <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>{invoiceType.includes("مبيعات") ? "العميل" : "المورد"}</Label>
              <AccountSearchInput
                accounts={accounts}
                value={form.client_account_id}
                onChange={(id, name) => setForm({ ...form, client_account_id: id, client_name: name })}
                placeholder={`ابحث عن ${invoiceType.includes("مبيعات") ? "العميل" : "المورد"}...`}
              />
            </div>
            <div>
              <Label>المستودع</Label>
              <Select
                value={form.warehouse_id}
                onValueChange={(v) => {
                  const wh = warehouses.find((w) => w.id === v);
                  setForm({ ...form, warehouse_id: v, warehouse_name: wh?.name || "" });
                }}
              >
                <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="نقداً">نقداً</SelectItem>
                  <SelectItem value="آجل">آجل</SelectItem>
                  <SelectItem value="بنك">بنك</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>العملة</Label>
              <Select value={form.currency} onValueChange={(v) => {
                const cur = currencies.find(c => c.name === v);
                const rate = cur?.exchange_rate || 1;
                const total_local = toLocalCurrency(form.total, rate);
                setForm(prev => ({ ...prev, currency: v, exchange_rate: rate, total_local }));
              }}>
                <SelectTrigger><SelectValue placeholder="اختر العملة" /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name} {c.is_local ? "🏠" : `(${c.exchange_rate})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>سعر الصرف</Label>
              <Input
                type="number"
                value={form.exchange_rate}
                onChange={(e) => {
                  const rate = parseFloat(e.target.value) || 1;
                  recalculate(form.items, form.discount_percent, form.discount_value, rate);
                }}
                min="0.0001"
                step="0.0001"
              />
            </div>
            <div>
              <Label>مركز التكلفة</Label>
              <Select
                value={form.cost_center_id}
                onValueChange={(v) => {
                  const cc = costCenters.find(c => c.id === v);
                  setForm({ ...form, cost_center_id: v, cost_center_name: cc?.name || "" });
                }}
              >
                <SelectTrigger><SelectValue placeholder="اختر مركز التكلفة" /></SelectTrigger>
                <SelectContent>
                  {costCenters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">بنود الفاتورة</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 ml-1" /> إضافة بند
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-end p-3 bg-muted/30 rounded-lg">
                  <div className="col-span-2">
                   <Label className="text-xs">الصنف</Label>
                   <Select value={item.product_id} onValueChange={(v) => updateItem(idx, "product_id", v)}>
                     <SelectTrigger className="h-9"><SelectValue placeholder="اختر" /></SelectTrigger>
                     <SelectContent>
                       {products.map((p) => (
                         <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                  </div>
                  <div>
                   <Label className="text-xs">الوحدة</Label>
                   <Select value={item.unit || ""} onValueChange={(v) => updateItem(idx, "unit", v)}>
                     <SelectTrigger className="h-9"><SelectValue placeholder="-" /></SelectTrigger>
                     <SelectContent>
                       {(item.available_units || [{ name: item.unit || "قطعة", conversion_factor: 1 }]).map((u) => (
                         <SelectItem key={u.name} value={u.name}>
                           {u.name} {parseFloat(u.conversion_factor) > 1 ? `(×${u.conversion_factor})` : ""}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                  </div>
                  <div>
                   <Label className="text-xs">الكمية</Label>
                   <Input className="h-9" type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                   <Label className="text-xs">السعر</Label>
                   <Input className="h-9" type="number" value={item.price} onChange={(e) => updateItem(idx, "price", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">الإجمالي</Label>
                    <Input className="h-9" value={(item.total || 0).toLocaleString()} readOnly />
                  </div>
                  <div className="flex items-end">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>المجموع الفرعي</span>
              <span className="font-semibold">{form.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>خصم</span>
              <Input
                className="h-7 w-20"
                type="number"
                placeholder="%"
                value={form.discount_percent}
                onChange={(e) => {
                  const pct = parseFloat(e.target.value) || 0;
                  recalculate(form.items, pct, 0);
                }}
              />
              <span>%</span>
              <span className="text-muted-foreground">أو</span>
              <Input
                className="h-7 w-24"
                type="number"
                placeholder="قيمة"
                value={form.discount_value}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  recalculate(form.items, 0, val);
                }}
              />
            </div>
            {form.payment_method === "آجل" && (
              <div className="flex items-center gap-2 text-sm">
                <span>المدفوع</span>
                <Input
                  className="h-7 w-24"
                  type="number"
                  value={form.paid_amount}
                  onChange={(e) => {
                    const paid = parseFloat(e.target.value) || 0;
                    setForm((prev) => ({ ...prev, paid_amount: paid, remaining_amount: prev.total - paid }));
                  }}
                />
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>الإجمالي {form.currency && `(${form.currency})`}</span>
              <span>{form.total.toLocaleString()}</span>
            </div>
            {form.exchange_rate !== 1 && form.total_local > 0 && (
              <div className="flex justify-between text-sm text-blue-600 bg-blue-50 rounded px-2 py-1">
                <span>الإجمالي بالعملة المحلية (× {form.exchange_rate})</span>
                <span className="font-semibold">{form.total_local.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {form.remaining_amount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>المتبقي</span>
                <span>{form.remaining_amount.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div>
            <Label>البيان / ملاحظات</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => onSave({ ...form, items: form.items.filter(i => i.product_id), status: "مسودة" })} disabled={!form.invoice_number} variant="outline">حفظ مسودة</Button>
          <Button
            onClick={async () => {
              const saved = { ...form, items: form.items.filter(i => i.product_id), status: "مرحّلة" };
              await onSave(saved);

              // تحديث أرصدة الحسابات
              if (saved.client_account_id) await refreshAccountBalances([saved.client_account_id]);

              // ترحيل المخزون تلقائياً
              let inventoryMsg = "";
              if (saved.pattern_type?.includes("مبيعات")) {
                const { warnings } = await deductSalesInventory(saved);
                inventoryMsg = " وخصم المخزون";
                if (warnings.length) warnings.forEach(w => toast.warning(w));
              } else if (saved.pattern_type?.includes("مشتريات")) {
                await addPurchaseInventory(saved);
                inventoryMsg = " وإضافة المخزون";
              }

              // قيد مركز التكلفة
              if (saved.cost_center_id) await createCostEntryFromInvoice(saved, costCenters);

              // قيد فرق العملة (إن وُجد)
              let fxMsg = "";
              if (saved.exchange_rate && saved.exchange_rate !== 1 && saved.total > 0) {
                const localAmount = toLocalCurrency(saved.total, saved.exchange_rate);
                const fxEntry = await createCurrencyDiffEntry({
                  sourceDoc: saved,
                  sourceType: saved.pattern_type,
                  sourceNumber: saved.invoice_number,
                  foreignAmount: saved.total,
                  localAmount,
                  foreignCurrency: saved.currency,
                  exchangeRate: saved.exchange_rate,
                  gainAccountId: saved.client_account_id,
                  gainAccountName: saved.client_name,
                  lossAccountId: saved.client_account_id,
                  lossAccountName: saved.client_name,
                  clientAccountId: saved.client_account_id,
                  clientAccountName: saved.client_name,
                }).catch(() => null);
                if (fxEntry) fxMsg = " وقيد فرق الصرف";
              }

              toast.success(`تم ترحيل الفاتورة وتحديث الأرصدة${inventoryMsg}${saved.cost_center_id ? " وقيد مركز التكلفة" : ""}${fxMsg}`);
            }}
            disabled={!form.invoice_number}
            className="gap-1.5"
          >
            <Zap className="h-3.5 w-3.5" />حفظ وترحيل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}