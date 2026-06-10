import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { autoUpdateExchangeRates } from "@/utils/currencyEngine";
import { RefreshCw, TrendingUp, Clock, Globe, CheckCircle2 } from "lucide-react";

export default function Currencies() {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", symbol: "", unit_name: "", sub_unit: "", exchange_rate: 1, is_local: false });
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateResults, setUpdateResults] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await base44.entities.Currency.list();
    setCurrencies(data);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: "", symbol: "", unit_name: "", sub_unit: "", exchange_rate: 1, is_local: false });
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ name: item.name, symbol: item.symbol, unit_name: item.unit_name || "", sub_unit: item.sub_unit || "", exchange_rate: item.exchange_rate || 1, is_local: item.is_local || false });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editing) {
      await base44.entities.Currency.update(editing.id, form);
      toast.success("تم التحديث");
    } else {
      await base44.entities.Currency.create(form);
      toast.success("تم الإضافة");
    }
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(item) {
    if (confirm("هل أنت متأكد؟")) {
      await base44.entities.Currency.delete(item.id);
      toast.success("تم الحذف");
      loadData();
    }
  }

  async function handleAutoUpdate() {
    setUpdating(true);
    const { updated, errors, rates } = await autoUpdateExchangeRates();
    setUpdating(false);
    if (updated > 0) {
      toast.success(`تم تحديث ${updated} عملة بأسعار الصرف الحالية`);
      setLastUpdate(new Date());
      setUpdateResults(rates || []);
      loadData();
    } else {
      toast.warning("لم يتم تحديث أي عملة. تأكد من وجود عملات أجنبية مضافة.");
    }
    if (errors.length) errors.forEach(e => toast.error(e));
  }

  const columns = [
    { key: "name", label: "اسم العملة" },
    { key: "symbol", label: "الرمز" },
    { key: "unit_name", label: "الوحدة" },
    { key: "sub_unit", label: "جزء العملة" },
    { key: "exchange_rate", label: "سعر التعادل" },
    { key: "is_local", label: "النوع", render: (val) => val ? <Badge>محلية</Badge> : <Badge variant="outline">أجنبية</Badge> },
  ];

  const localCurrency = currencies.find(c => c.is_local);
  const foreignCurrencies = currencies.filter(c => !c.is_local);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="العملات" subtitle="إدارة العملات وأسعار الصرف" onAdd={openNew} addLabel="عملة جديدة" />
        <Button onClick={handleAutoUpdate} disabled={updating} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${updating ? "animate-spin" : ""}`} />
          {updating ? "جاري التحديث..." : "تحديث أسعار الصرف الآن"}
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">العملة المحلية</p>
              <p className="font-bold text-sm">{localCurrency ? `${localCurrency.symbol} — ${localCurrency.name}` : "غير محددة"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">العملات الأجنبية</p>
              <p className="font-bold text-sm">{foreignCurrencies.length} عملة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">آخر تحديث</p>
              <p className="font-bold text-sm">{lastUpdate ? lastUpdate.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">الجدولة التلقائية</p>
              <p className="font-bold text-sm text-green-600">يومياً 8 صباحاً ✓</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live rates after update */}
      {updateResults.length > 0 && (
        <Card className="border border-green-200 bg-green-50">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> أسعار الصرف المحدّثة
            </p>
            <div className="flex flex-wrap gap-2">
              {updateResults.map(r => (
                <Badge key={r.symbol} variant="outline" className="border-green-300 text-green-800 bg-white text-xs">
                  {r.symbol}: {r.rate}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable columns={columns} data={currencies} onEdit={openEdit} onDelete={handleDelete} emptyMessage="لا توجد عملات" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل العملة" : "عملة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>اسم العملة</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: دولار أمريكي" /></div>
              <div><Label>الرمز</Label><Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="مثال: USD" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>الوحدة</Label><Input value={form.unit_name} onChange={(e) => setForm({ ...form, unit_name: e.target.value })} placeholder="مثال: دولار" /></div>
              <div><Label>جزء العملة</Label><Input value={form.sub_unit} onChange={(e) => setForm({ ...form, sub_unit: e.target.value })} placeholder="مثال: سنت" /></div>
            </div>
            <div><Label>سعر التعادل</Label><Input type="number" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: parseFloat(e.target.value) || 0 })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_local} onCheckedChange={(v) => setForm({ ...form, is_local: v })} />
              <Label>عملة محلية</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.symbol}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}