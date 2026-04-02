import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, RotateCcw, CheckCircle } from "lucide-react";
import { toBaseUnit, priceForUnit, getBaseUnit } from "@/utils/unitConvert";
import { toast } from "sonner";

export default function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("نقداً");
  const [paid, setPaid] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  useEffect(() => {
    base44.entities.Product.list().then((p) => { setProducts(p); setLoading(false); });
  }, []);

  const filtered = products.filter((p) =>
    p.name?.includes(search) || p.item_code?.includes(search) || p.barcode?.includes(search)
  );

  function addToCart(product, selectedUnit = null) {
    const unit = selectedUnit || getBaseUnit(product.units || [{ name: "قطعة", conversion_factor: 1 }]);
    const price = priceForUnit(product.retail_price || 0, unit);
    setCart((prev) => {
      const key = `${product.id}_${unit.name}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => i.key === key ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i);
      return [...prev, {
        key,
        product_id: product.id,
        product_name: product.name,
        unit_name: unit.name,
        conversion_factor: parseFloat(unit.conversion_factor) || 1,
        quantity: 1,
        price,
        total: price,
        available_units: product.units || [],
      }];
    });
  }

  function updateQty(key, delta) {
    setCart((prev) => prev.map((i) => i.key === key ? { ...i, quantity: Math.max(1, i.quantity + delta), total: Math.max(1, i.quantity + delta) * i.price } : i));
  }

  function updatePrice(key, price) {
    const p = parseFloat(price) || 0;
    setCart((prev) => prev.map((i) => i.key === key ? { ...i, price: p, total: i.quantity * p } : i));
  }

  function changeUnit(key, newUnitName, product) {
    const unit = (product.units || []).find((u) => u.name === newUnitName);
    if (!unit) return;
    const price = priceForUnit(product.retail_price || 0, unit);
    setCart((prev) => prev.map((i) => i.key === key ? {
      ...i,
      key: `${i.product_id}_${newUnitName}`,
      unit_name: newUnitName,
      conversion_factor: parseFloat(unit.conversion_factor) || 1,
      price,
      total: i.quantity * price,
    } : i));
  }

  function removeFromCart(key) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);
  const paidAmt = parseFloat(paid) || 0;
  const change = Math.max(0, paidAmt - total);

  async function checkout() {
    if (cart.length === 0) { toast.error("السلة فارغة"); return; }
    setSaving(true);
    const sessions = await base44.entities.POSSession.list();
    const num = String(sessions.length + 1).padStart(5, "0");
    // تحويل البنود للوحدة الأساسية قبل الحفظ
    const cartWithBase = cart.map((item) => ({
      ...item,
      base_quantity: toBaseUnit(item.quantity, { conversion_factor: item.conversion_factor }),
    }));
    const rec = await base44.entities.POSSession.create({
      session_number: num,
      date: new Date().toISOString().split("T")[0],
      items: cartWithBase,
      subtotal,
      discount: discountAmt,
      tax: 0,
      total,
      paid: paidAmt,
      change,
      payment_method: paymentMethod,
      client_name: clientName,
      status: "مكتملة",
    });
    setLastReceipt(rec);
    setCart([]);
    setDiscount(0);
    setPaid("");
    setClientName("");
    setSaving(false);
    toast.success("تمت عملية البيع بنجاح");
  }

  function resetAll() {
    setCart([]);
    setDiscount(0);
    setPaid("");
    setClientName("");
    setLastReceipt(null);
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-0 overflow-hidden -m-6">
      {/* Products Panel */}
      <div className="flex-1 flex flex-col bg-muted/20 p-4 overflow-hidden min-h-0">
        <div className="mb-3">
          <h1 className="text-xl font-bold mb-2">نقطة البيع</h1>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو الكود أو الباركود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="bg-card border border-border rounded-xl p-3 text-right hover:border-primary/50 hover:shadow-md transition-all duration-150 active:scale-95"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs font-semibold leading-tight line-clamp-2">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.item_code}</p>
                <p className="text-sm font-bold text-primary mt-1">{(p.retail_price || 0).toLocaleString()}</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-12">لا توجد منتجات</div>
            )}
          </div>
        )}
      </div>

      {/* Cart Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-card border-r border-border shadow-xl overflow-hidden">
        {/* Cart header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-bold">السلة ({cart.length})</span>
          </div>
          <button onClick={resetAll} className="text-muted-foreground hover:text-destructive transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {cart.length === 0 && (
            <div className="text-center text-muted-foreground py-12 text-sm">أضف منتجات من القائمة</div>
          )}
          {cart.map((item) => {
            const prod = products.find((p) => p.id === item.product_id);
            return (
            <div key={item.key} className="bg-muted/30 rounded-lg p-2.5">
              <div className="flex items-start justify-between mb-1">
                <button onClick={() => removeFromCart(item.key)} className="text-destructive/60 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="text-right flex-1 mr-1">
                  <p className="text-xs font-semibold">{item.product_name}</p>
                  {item.conversion_factor > 1 && (
                    <p className="text-[10px] text-muted-foreground">{item.unit_name} = {item.conversion_factor} {prod?.units?.[0]?.name || "وحدة"} | إجمالي الأساسي: {toBaseUnit(item.quantity, { conversion_factor: item.conversion_factor })}</p>
                  )}
                </div>
              </div>
              {/* Unit selector */}
              {item.available_units?.length > 1 && (
                <div className="mb-1.5">
                  <Select value={item.unit_name} onValueChange={(v) => prod && changeUnit(item.key, v, prod)}>
                    <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {item.available_units.map((u) => (
                        <SelectItem key={u.name} value={u.name} className="text-xs">{u.name} ({u.conversion_factor} وحدة أساسية)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-primary">{item.total.toLocaleString()}</p>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={item.price}
                    onChange={(e) => updatePrice(item.key, e.target.value)}
                    className="h-7 w-20 text-xs text-center"
                  />
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => updateQty(item.key, -1)} className="h-6 w-6 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.key, 1)} className="h-6 w-6 rounded bg-muted flex items-center justify-center hover:bg-muted-foreground/20">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {/* Totals & Checkout */}
        <div className="p-4 border-t border-border space-y-3">
          <Input placeholder="اسم العميل (اختياري)" value={clientName} onChange={(e) => setClientName(e.target.value)} className="h-8 text-sm" />
          <div className="flex items-center gap-2">
            <Input type="number" placeholder="خصم" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-8 text-sm" />
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="نقداً">نقداً</SelectItem>
                <SelectItem value="بطاقة">بطاقة</SelectItem>
                <SelectItem value="تحويل">تحويل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">المجموع</span><span>{subtotal.toLocaleString()}</span></div>
            {discountAmt > 0 && <div className="flex justify-between text-red-500"><span>الخصم</span><span>- {discountAmt.toLocaleString()}</span></div>}
            <div className="flex justify-between font-bold text-base border-t border-border pt-1.5 mt-1"><span>الإجمالي</span><span className="text-primary">{total.toLocaleString()}</span></div>
          </div>

          {paymentMethod === "نقداً" && (
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="المبلغ المدفوع" value={paid} onChange={(e) => setPaid(e.target.value)} className="h-8 text-sm" />
              {change > 0 && <Badge variant="secondary" className="text-xs whitespace-nowrap">الباقي: {change.toLocaleString()}</Badge>}
            </div>
          )}

          <Button onClick={checkout} disabled={saving || cart.length === 0} className="w-full h-10 text-base font-bold gap-2">
            <CheckCircle className="h-5 w-5" />
            {saving ? "جاري الحفظ..." : "إتمام البيع"}
          </Button>
        </div>
      </div>
    </div>
  );
}