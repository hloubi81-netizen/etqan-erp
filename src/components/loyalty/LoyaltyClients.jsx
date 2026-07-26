import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Star, Gift, TrendingUp, User, ChevronDown, ChevronUp, CreditCard, ScanBarcode, Trash2, SlidersHorizontal, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import LoyaltyCardDialog from "@/components/loyalty/LoyaltyCardDialog";
import LoyaltyCardScanner from "@/components/loyalty/LoyaltyCardScanner";

const TIER_COLORS = {
  "برونزي": "bg-amber-100 text-amber-800",
  "فضي": "bg-gray-100 text-gray-700",
  "ذهبي": "bg-yellow-100 text-yellow-800",
  "بلاتيني": "bg-purple-100 text-purple-800",
};

function getTier(points, settings) {
  if (!settings) return "برونزي";
  if (points >= (settings.platinum_threshold || 5000)) return "بلاتيني";
  if (points >= (settings.gold_threshold || 1500)) return "ذهبي";
  if (points >= (settings.silver_threshold || 500)) return "فضي";
  return "برونزي";
}

export default function LoyaltyClients() {
  const { toast } = useToast();
  const [clients, setClients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showTxDialog, setShowTxDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [form, setForm] = useState({ client_name: "", client_phone: "", card_number: "", notes: "" });
  const [txForm, setTxForm] = useState({ type: "إضافة", points: "", notes: "" });
  const [cardClient, setCardClient] = useState(null);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tier: "all",
    pointsMin: "",
    pointsMax: "",
    lastPurchaseFrom: "",
    lastPurchaseTo: "",
  });

  const load = async () => {
    setLoading(true);
    const [c, t, s] = await Promise.all([
      base44.entities.LoyaltyPoints.list("-created_date"),
      base44.entities.PointsTransaction.list("-created_date", 200),
      base44.entities.PointsSettings.list().then(r => r[0] || null),
    ]);
    setClients(c);
    setTransactions(t);
    setSettings(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Build a map of last purchase (points-awarding transaction) date per client
  const lastPurchaseMap = {};
  transactions.forEach(t => {
    const lid = t.loyalty_id;
    if (!lid) return;
    const d = t.created_date || t.date;
    if (!d) return;
    if (!lastPurchaseMap[lid] || new Date(d) > new Date(lastPurchaseMap[lid])) {
      lastPurchaseMap[lid] = d;
    }
  });

  const hasActiveFilters =
    filters.tier !== "all" ||
    filters.pointsMin !== "" ||
    filters.pointsMax !== "" ||
    filters.lastPurchaseFrom !== "" ||
    filters.lastPurchaseTo !== "";

  const filtered = clients.filter(c => {
    const matchSearch =
      c.client_name?.includes(search) || c.client_phone?.includes(search) || c.card_number?.includes(search);
    if (!matchSearch) return false;
    if (!hasActiveFilters) return true;

    if (filters.tier !== "all" && (c.tier || "برونزي") !== filters.tier) return false;

    const avail = c.available_points || 0;
    if (filters.pointsMin !== "" && avail < Number(filters.pointsMin)) return false;
    if (filters.pointsMax !== "" && avail > Number(filters.pointsMax)) return false;

    const lastDate = lastPurchaseMap[c.id];
    if (filters.lastPurchaseFrom && (!lastDate || new Date(lastDate) < new Date(filters.lastPurchaseFrom))) return false;
    if (filters.lastPurchaseTo && (!lastDate || new Date(lastDate) > new Date(filters.lastPurchaseTo))) return false;

    return true;
  });

  const resetFilters = () =>
    setFilters({ tier: "all", pointsMin: "", pointsMax: "", lastPurchaseFrom: "", lastPurchaseTo: "" });

  const totalPoints = clients.reduce((s, c) => s + (c.total_points || 0), 0);
  const totalAvailable = clients.reduce((s, c) => s + (c.available_points || 0), 0);

  const generateCardNumber = () => {
    const maxNum = clients.reduce((m, c) => {
      const n = parseInt((c.card_number || "").replace(/\D/g, ""), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return "LOY" + String(maxNum + 1).padStart(6, "0");
  };

  const openAdd = () => {
    setForm({ client_name: "", client_phone: "", card_number: generateCardNumber(), notes: "" });
    setSelectedClient(null);
    setShowDialog(true);
  };

  const openEdit = (c) => {
    setForm({ client_name: c.client_name, client_phone: c.client_phone || "", card_number: c.card_number || "", notes: c.notes || "" });
    setSelectedClient(c);
    setShowDialog(true);
  };

  const saveClient = async () => {
    if (!form.client_name) return;
    if (selectedClient) {
      await base44.entities.LoyaltyPoints.update(selectedClient.id, form);
    } else {
      await base44.entities.LoyaltyPoints.create({ ...form, total_points: 0, used_points: 0, available_points: 0, tier: "برونزي" });
    }
    setShowDialog(false);
    load();
    toast({ title: "تم الحفظ بنجاح" });
  };

  const openTransaction = (c) => {
    setSelectedClient(c);
    setTxForm({ type: "إضافة", points: "", notes: "" });
    setShowTxDialog(true);
  };

  const deleteClient = async (c) => {
    if (!window.confirm(`هل أنت متأكد من حذف العميل "${c.client_name}"؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      await base44.entities.LoyaltyPoints.delete(c.id);
      toast({ title: "تم حذف العميل" });
      load();
    } catch (e) {
      toast({ title: "تعذّر الحذف", description: e?.message || "", variant: "destructive" });
    }
  };

  const saveTransaction = async () => {
    if (!txForm.points || !selectedClient) return;
    const pts = Number(txForm.points);
    const isAdd = txForm.type === "إضافة" || txForm.type === "تعديل يدوي";

    let newTotal = selectedClient.total_points || 0;
    let newUsed = selectedClient.used_points || 0;
    if (txForm.type === "إضافة") newTotal += pts;
    else if (txForm.type === "استخدام") newUsed += pts;
    else newTotal += pts; // تعديل يدوي

    const newAvail = newTotal - newUsed;
    const newTier = getTier(newAvail, settings);

    await base44.entities.PointsTransaction.create({
      loyalty_id: selectedClient.id,
      client_name: selectedClient.client_name,
      type: txForm.type,
      points: pts,
      notes: txForm.notes,
    });

    await base44.entities.LoyaltyPoints.update(selectedClient.id, {
      total_points: newTotal,
      used_points: newUsed,
      available_points: newAvail,
      tier: newTier,
    });

    setShowTxDialog(false);
    load();
    toast({ title: "تمت العملية بنجاح" });
  };

  const clientTx = selectedClient
    ? transactions.filter(t => t.loyalty_id === selectedClient.id).slice(0, 10)
    : [];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "إجمالي العملاء", value: clients.length, icon: User, color: "bg-blue-500" },
          { label: "إجمالي النقاط الممنوحة", value: totalPoints.toLocaleString(), icon: Star, color: "bg-yellow-500" },
          { label: "النقاط المتاحة للاسترداد", value: totalAvailable.toLocaleString(), icon: Gift, color: "bg-green-500" },
        ].map((k, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${k.color}`}>
                <k.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="بحث باسم أو هاتف..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(v => !v)} className="gap-1.5">
          <SlidersHorizontal className="h-4 w-4" /> فلترة
          {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-primary" />}
        </Button>
        <Button variant="outline" onClick={() => setShowScanner(true)} className="gap-1.5"><ScanBarcode className="h-4 w-4" /> مسح بطاقة</Button>
        <Button onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" /> إضافة عميل</Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">بحث وفلترة متقدمة</p>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" onClick={resetFilters}>
                  <X className="h-3.5 w-3.5" /> مسح الفلاتر
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">المستوى</label>
                <Select value={filters.tier} onValueChange={v => setFilters({ ...filters, tier: v })}>
                  <SelectTrigger><SelectValue placeholder="كل المستويات" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المستويات</SelectItem>
                    <SelectItem value="برونزي">برونزي</SelectItem>
                    <SelectItem value="فضي">فضي</SelectItem>
                    <SelectItem value="ذهبي">ذهبي</SelectItem>
                    <SelectItem value="بلاتيني">بلاتيني</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">رصيد النقاط (من)</label>
                <Input type="number" value={filters.pointsMin} onChange={e => setFilters({ ...filters, pointsMin: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">رصيد النقاط (إلى)</label>
                <Input type="number" value={filters.pointsMax} onChange={e => setFilters({ ...filters, pointsMax: e.target.value })} placeholder="∞" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">آخر عملية شراء (من)</label>
                <Input type="date" value={filters.lastPurchaseFrom} onChange={e => setFilters({ ...filters, lastPurchaseFrom: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">آخر عملية شراء (إلى)</label>
                <Input type="date" value={filters.lastPurchaseTo} onChange={e => setFilters({ ...filters, lastPurchaseTo: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              نتائج الفلترة: <span className="font-medium text-foreground">{filtered.length}</span> من {clients.length} عميل
            </p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">العميل</th>
                  <th className="px-4 py-3 text-right font-medium">الهاتف</th>
                  <th className="px-4 py-3 text-right font-medium">رقم البطاقة</th>
                  <th className="px-4 py-3 text-right font-medium">المستوى</th>
                  <th className="px-4 py-3 text-right font-medium">إجمالي النقاط</th>
                  <th className="px-4 py-3 text-right font-medium">النقاط المتاحة</th>
                  <th className="px-4 py-3 text-right font-medium">آخر عملية شراء</th>
                  <th className="px-4 py-3 text-right font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">جارٍ التحميل...</td></tr>
                  ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد بيانات</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.client_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.client_phone || "—"}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs">{c.card_number || "—"}</span></td>
                    <td className="px-4 py-3">
                      <Badge className={TIER_COLORS[c.tier] || TIER_COLORS["برونزي"]}>{c.tier || "برونزي"}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold">{(c.total_points || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-700 font-semibold">{(c.available_points || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {lastPurchaseMap[c.id]
                        ? new Date(lastPurchaseMap[c.id]).toLocaleDateString("ar-EG")
                        : <span className="text-muted-foreground/60">لا توجد</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openTransaction(c)}>نقاط</Button>
                        <Button size="sm" variant="outline" onClick={() => { setCardClient(c); setShowCardDialog(true); }}><CreditCard className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>تعديل</Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteClient(c)} title="حذف"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Client Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedClient ? "تعديل عميل" : "إضافة عميل جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">اسم العميل *</label>
              <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="الاسم الكامل" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">رقم بطاقة الولاء</label>
              <Input value={form.card_number} onChange={e => setForm({ ...form, card_number: e.target.value })} placeholder="LOY000001" className="font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">رقم الهاتف</label>
              <Input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} placeholder="05xxxxxxxx" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">ملاحظات</label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button className="w-full" onClick={saveClient}>حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={showTxDialog} onOpenChange={setShowTxDialog}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>إدارة نقاط - {selectedClient?.client_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted/40 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">النقاط المتاحة</p>
              <p className="text-2xl font-bold text-green-600">{(selectedClient?.available_points || 0).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">نوع العملية</label>
              <Select value={txForm.type} onValueChange={v => setTxForm({ ...txForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="إضافة">إضافة نقاط</SelectItem>
                  <SelectItem value="استخدام">استخدام نقاط</SelectItem>
                  <SelectItem value="تعديل يدوي">تعديل يدوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">عدد النقاط</label>
              <Input type="number" value={txForm.points} onChange={e => setTxForm({ ...txForm, points: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">ملاحظات</label>
              <Input value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} />
            </div>

            {clientTx.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">آخر العمليات</p>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {clientTx.map(t => (
                    <div key={t.id} className="flex justify-between text-xs p-2 bg-muted/30 rounded">
                      <span className={t.type === "استخدام" ? "text-red-600" : "text-green-600"}>
                        {t.type === "استخدام" ? "-" : "+"}{t.points} نقطة
                      </span>
                      <span className="text-muted-foreground">{t.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={saveTransaction}>تنفيذ العملية</Button>
          </div>
        </DialogContent>
      </Dialog>

      {showCardDialog && cardClient && (
        <LoyaltyCardDialog client={cardClient} onClose={() => { setShowCardDialog(false); setCardClient(null); }} />
      )}

      <LoyaltyCardScanner open={showScanner} clients={clients} onClose={() => setShowScanner(false)} />
    </div>
  );
}