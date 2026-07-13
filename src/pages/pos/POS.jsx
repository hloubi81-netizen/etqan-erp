import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, RotateCcw, CheckCircle, ScanBarcode, X, Tag, Undo2 } from "lucide-react";
import SalesReturnDialog from "@/components/pos/SalesReturnDialog";
import { toBaseUnit, priceForUnit, getBaseUnit } from "@/utils/unitConvert";
import { printPOSOrder, buildReceiptHTML, printHTML } from "@/utils/posPrinter";
import { getBoundPrintSettings, getCompanySettings } from "@/utils/printBinding";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings.jsx";
import POSReceiptPreview from "@/components/pos/POSReceiptPreview";

// حساب سعر الصنف بناءً على قائمة الأسعار المختارة
function calcPriceFromList(product, priceList) {
  if (!priceList) return product.retail_price || 0;

  // هل يوجد سعر مخصص لهذا الصنف في القائمة؟
  const override = (priceList.items || []).find(i => i.product_id === product.id);
  if (override) {
    const base = override.price || product.retail_price || 0;
    const disc = override.discount_percent || 0;
    return base * (1 - disc / 100);
  }

  // السعر الأساسي بحسب مستوى القائمة
  let basePrice;
  switch (priceList.price_level) {
    case "سعر الجملة":
      basePrice = product.wholesale_price || product.retail_price || 0;
      break;
    case "سعر التكلفة + هامش":
      const cost = product.cost_price || product.avg_purchase_price || product.last_purchase_price || 0;
      basePrice = cost * (1 + (priceList.margin_percent || 0) / 100);
      break;
    case "سعر التجزئة":
    default:
      basePrice = product.retail_price || 0;
      break;
  }

  // تطبيق الخصم الإجمالي
  const disc = priceList.discount_percent || 0;
  return basePrice * (1 - disc / 100);
}

export default function POS() {
  const { getSection } = useAppSettings();
  const posSettings = getSection("pos");

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("نقداً");
  const [paid, setPaid] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [scanMode, setScanMode] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptPreviewData, setReceiptPreviewData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState("all");
  const [priceLists, setPriceLists] = useState([]);
  const [selectedPriceList, setSelectedPriceList] = useState(null); // null = سعر التجزئة الافتراضي
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  // POS settings defaults
  const enableDiscount = posSettings.enableDiscount !== false;
  const maxDiscountPercent = posSettings.maxDiscountPercent || 20;
  const enableTax = posSettings.enableTax !== false;
  const taxRate = posSettings.taxRate || 0;
  const printReceipt = posSettings.printReceipt !== false;
  const receiptNote = posSettings.receiptNote || "شكراً لزيارتكم";
  const cashierName = posSettings.cashierName || "";
  const companyName = useAppSettings().getSection("company").name || "نقطة البيع";

  useEffect(() => {
    base44.entities.Product.list().then((p) => { setProducts(p); setLoading(false); });
    base44.entities.ProductGroup.list().then(setGroups);
    base44.entities.Printer.list().then(setPrinters);
    base44.entities.PriceList.filter({ is_active: true }).catch(() => []).then(pl => {
      // فلترة القوائم الصالحة حسب التاريخ
      const today = new Date().toISOString().split("T")[0];
      setPriceLists(pl.filter(l =>
        (!l.valid_from || l.valid_from <= today) &&
        (!l.valid_to || l.valid_to >= today)
      ));
    });
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  function handleSearchKeyDown(e) {
    if (e.key === "Enter") {
      // ماسح الباركود يرسل Enter بعد المسح
      const term = search.trim();
      if (!term) return;
      const match = products.find(
        (p) => p.barcode === term || p.item_code === term
      );
      if (match) {
        addToCart(match);
        setSearch("");
        toast.success(`تم إضافة: ${match.name}`);
      } else {
        // إذا كان النص بحثاً ولم يكن باركود، تجاهل Enter
        if (filtered.length === 1) {
          addToCart(filtered[0]);
          setSearch("");
          toast.success(`تم إضافة: ${filtered[0].name}`);
        } else {
          toast.error("لم يتم العثور على منتج بهذا الباركود");
        }
      }
    }
  }

  const filtered = products.filter((p) =>
    (activeGroup === "all" || p.group_id === activeGroup) &&
    (p.name?.includes(search) || p.item_code?.includes(search) || p.barcode?.includes(search))
  );

  // المجموعات التي تحتوي على منتجات فقط
  const groupsWithProducts = groups.filter((g) => products.some((p) => p.group_id === g.id));

  function addToCart(product, selectedUnit = null) {
    const unit = selectedUnit || getBaseUnit(product.units || [{ name: "قطعة", conversion_factor: 1 }]);
    const basePrice = calcPriceFromList(product, selectedPriceList);
    const price = priceForUnit(basePrice, unit);
    setCart((prev) => {
      const key = `${product.id}_${unit.name}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => i.key === key ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i);
      return [...prev, {
        key,
        product_id: product.id,
        product_name: product.name,
        print_department: product.print_department || "",
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
  const discountAmt = enableDiscount ? Math.min(parseFloat(discount) || 0, subtotal * maxDiscountPercent / 100) : 0;
  const taxAmt = enableTax ? (subtotal - discountAmt) * taxRate / 100 : 0;
  const total = Math.max(0, subtotal - discountAmt + taxAmt);
  const paidAmt = parseFloat(paid) || 0;
  const change = Math.max(0, paidAmt - total);

  async function checkout() {
    if (cart.length === 0) { toast.error("السلة فارغة"); return; }
    if (enableDiscount && discountAmt > subtotal * maxDiscountPercent / 100) {
      toast.error(`الخصم لا يمكن أن يتجاوز ${maxDiscountPercent}%`);
      return;
    }
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
      tax: taxAmt,
      total,
      paid: paidAmt,
      change,
      payment_method: paymentMethod,
      client_name: clientName,
      cashier_name: cashierName || undefined,
      status: "مكتملة",
    });
    setLastReceipt(rec);

    // إظهار معاينة قبل الطباعة
    if (printReceipt) {
      const depts = {};
      cart.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const dept = product?.print_department || "عام";
        if (!depts[dept]) depts[dept] = [];
        depts[dept].push({ ...item, print_department: dept });
      });

      setReceiptPreviewData({
        cart,
        products,
        printers,
        orderNumber: num,
        date: new Date().toISOString(),
        subtotal,
        discount: discountAmt,
        tax: taxAmt,
        total,
        paid: paidAmt,
        change,
        paymentMethod,
        clientName,
        companyName,
        receiptNote,
        cashierName,
        departments: depts,
      });
      setShowReceiptPreview(true);
    }

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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">نقطة البيع</h1>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/30"
              onClick={() => setReturnDialogOpen(true)}
            >
              <Undo2 className="h-4 w-4" />
              مرتجع مبيعات
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder={scanMode ? "وجّه الماسح ومسح الباركود…" : "ابحث بالاسم أو الكود أو الباركود…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className={`pr-9 pl-10 transition-all ${scanMode ? "border-primary ring-1 ring-primary bg-primary/5" : ""}`}
            />
            <button
              onClick={() => { setScanMode(v => !v); setTimeout(() => searchRef.current?.focus(), 50); }}
              title={scanMode ? "إيقاف وضع المسح" : "تفعيل وضع ماسح الباركود"}
              className={`absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center transition-all ${
                scanMode ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              }`}
            >
              {scanMode ? <X className="h-4 w-4" /> : <ScanBarcode className="h-4 w-4" />}
            </button>
          </div>
          {scanMode && (
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
              <ScanBarcode className="h-3 w-3" />
              وضع المسح مفعّل — امسح الباركود الآن
            </p>
          )}
          {/* شريط المجموعات */}
          {groupsWithProducts.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 mt-2">
              <button
                onClick={() => setActiveGroup("all")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeGroup === "all"
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                الكل
              </button>
              {groupsWithProducts.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroup(g.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeGroup === g.id
                      ? "bg-primary text-primary-foreground shadow"
                      : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
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
                      {item.available_units.filter((u) => u.name).map((u) => (
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
          {/* قائمة الأسعار */}
          {priceLists.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                <span>قائمة الأسعار</span>
              </div>
              <Select
                value={selectedPriceList?.id || "__default__"}
                onValueChange={v => {
                  const pl = priceLists.find(l => l.id === v);
                  setSelectedPriceList(pl || null);
                  // إعادة حساب أسعار عناصر السلة الحالية
                  if (cart.length > 0) {
                    setCart(prev => prev.map(item => {
                      const product = products.find(p => p.id === item.product_id);
                      if (!product) return item;
                      const newBase = calcPriceFromList(product, pl || null);
                      const unit = (product.units || []).find(u => u.name === item.unit_name);
                      const newPrice = priceForUnit(newBase, unit || { conversion_factor: 1 });
                      return { ...item, price: newPrice, total: item.quantity * newPrice };
                    }));
                    toast.success("تم تحديث أسعار السلة");
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">سعر التجزئة (افتراضي)</SelectItem>
                  {priceLists.map(pl => (
                    <SelectItem key={pl.id} value={pl.id}>
                      {pl.name} — {pl.customer_type}
                      {pl.discount_percent > 0 ? ` (خصم ${pl.discount_percent}%)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPriceList && (
                <p className="text-[10px] text-primary flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {selectedPriceList.price_level}
                  {selectedPriceList.discount_percent > 0 && ` — خصم ${selectedPriceList.discount_percent}%`}
                  {selectedPriceList.margin_percent > 0 && ` + ${selectedPriceList.margin_percent}% هامش`}
                </p>
              )}
            </div>
          )}
          <Input placeholder="اسم العميل (اختياري)" value={clientName} onChange={(e) => setClientName(e.target.value)} className="h-8 text-sm" />
          <div className="flex items-center gap-2">
            {enableDiscount && (
              <Input type="number" placeholder={`خصم (حد أقصى ${maxDiscountPercent}%)`} value={discount}
                onChange={(e) => setDiscount(e.target.value)} className="h-8 text-sm" />
            )}
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
            {taxAmt > 0 && <div className="flex justify-between text-blue-500"><span>الضريبة ({taxRate}%)</span><span>+ {taxAmt.toLocaleString()}</span></div>}
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

      {/* Receipt Preview Dialog */}
      {showReceiptPreview && receiptPreviewData && (
        <POSReceiptPreview
          open={showReceiptPreview}
          onClose={() => { setShowReceiptPreview(false); setReceiptPreviewData(null); }}
          receiptData={receiptPreviewData}
        />
      )}

      {/* Sales Return Dialog */}
      <SalesReturnDialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        onDone={() => toast.success("تم حفظ المرتجع")}
        cashierName={cashierName}
      />
    </div>
  );
}