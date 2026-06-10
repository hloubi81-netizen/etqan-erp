import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Building2, TrendingDown, CheckCircle, AlertCircle,
  LayoutGrid, List, MapPin, Filter, Search
} from "lucide-react";
import { toast } from "sonner";
import AssetForm from "@/components/assets/AssetForm";
import AssetCard from "@/components/assets/AssetCard";

const CATEGORIES = ["الكل", "مباني", "آلات ومعدات", "سيارات", "أثاث ومفروشات", "أجهزة حاسوب", "أصول أخرى"];

export default function FixedAssets() {
  const [assets, setAssets] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [depOpen, setDepOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [depAsset, setDepAsset] = useState(null);
  const [depDate, setDepDate] = useState(new Date().toISOString().split("T")[0]);
  const [depNotes, setDepNotes] = useState("");
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("الكل");
  const [filterCategory, setFilterCategory] = useState("الكل");
  const [filterStatus, setFilterStatus] = useState("الكل");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [a, br] = await Promise.all([
      base44.entities.FixedAsset.list("-purchase_date"),
      base44.entities.Branch.list(),
    ]);
    setAssets(a); setBranches(br); setLoading(false);
  }

  function openAdd() { setEditing(null); setFormOpen(true); }
  function openEdit(asset) { setEditing(asset); setFormOpen(true); }

  async function handleSave(data) {
    const annual = calcDepreciation(data);
    const record = {
      ...data,
      annual_depreciation: annual,
      net_book_value: Math.max(0, (data.purchase_cost || 0) - (data.accumulated_depreciation || 0)),
    };
    if (editing) {
      await base44.entities.FixedAsset.update(editing.id, record);
      toast.success("تم تحديث بيانات الأصل");
    } else {
      await base44.entities.FixedAsset.create(record);
      toast.success("تم تسجيل الأصل بنجاح ✅");
    }
    setFormOpen(false);
    loadData();
  }

  async function handleDelete(id) {
    if (!confirm("حذف هذا الأصل نهائياً؟")) return;
    await base44.entities.FixedAsset.delete(id);
    setAssets((p) => p.filter((a) => a.id !== id));
    toast.success("تم الحذف");
  }

  function openDepreciate(asset) {
    setDepAsset(asset);
    setDepNotes(`إهلاك الأصل: ${asset.name}`);
    setDepOpen(true);
  }

  async function postDepreciation() {
    if (!depAsset.depreciation_account_id || !depAsset.accumulated_account_id) {
      toast.error("يجب تحديد حسابات الإهلاك في بيانات الأصل أولاً"); return;
    }
    const amount = depAsset.annual_depreciation || 0;
    if (amount <= 0) { toast.error("مبلغ الإهلاك يجب أن يكون أكبر من صفر"); return; }

    await base44.entities.JournalEntry.create({
      entry_number: `DEP-${Date.now()}`,
      date: depDate,
      source_type: "سند قيد",
      debit_account_id: depAsset.depreciation_account_id,
      debit_account_name: depAsset.depreciation_account_name,
      credit_account_id: depAsset.accumulated_account_id,
      credit_account_name: depAsset.accumulated_account_name,
      amount,
      notes: depNotes || `إهلاك: ${depAsset.name}`,
    });

    const newAccumulated = (depAsset.accumulated_depreciation || 0) + amount;
    const newNBV = Math.max(0, (depAsset.purchase_cost || 0) - newAccumulated);
    const newStatus = newNBV <= (depAsset.salvage_value || 0) ? "مستهلك بالكامل" : "نشط";
    await base44.entities.FixedAsset.update(depAsset.id, {
      accumulated_depreciation: newAccumulated,
      net_book_value: newNBV,
      status: newStatus,
    });
    loadData();
    toast.success(`تم ترحيل قيد الإهلاك بمبلغ ${amount.toLocaleString()}`);
    setDepOpen(false);
  }

  function calcDepreciation(form) {
    const cost = parseFloat(form.purchase_cost) || 0;
    const salvage = parseFloat(form.salvage_value) || 0;
    const life = parseFloat(form.useful_life_years) || 1;
    if (form.depreciation_method === "القسط الثابت") return parseFloat(((cost - salvage) / life).toFixed(2));
    const rate = 2 / life;
    const nbv = cost - (parseFloat(form.accumulated_depreciation) || 0);
    return parseFloat((nbv * rate).toFixed(2));
  }

  // Filtered assets
  const filtered = assets.filter((a) => {
    const matchSearch = !search || a.name?.includes(search) || a.asset_number?.includes(search) || a.serial_number?.includes(search) || a.supplier_name?.includes(search);
    const matchBranch = filterBranch === "الكل" || a.branch_name === filterBranch;
    const matchCat = filterCategory === "الكل" || a.category === filterCategory;
    const matchStatus = filterStatus === "الكل" || a.status === filterStatus;
    return matchSearch && matchBranch && matchCat && matchStatus;
  });

  // KPIs
  const totalCost = assets.reduce((s, a) => s + (a.purchase_cost || 0), 0);
  const totalNBV = assets.reduce((s, a) => s + (a.net_book_value || 0), 0);
  const totalDep = assets.reduce((s, a) => s + (a.accumulated_depreciation || 0), 0);
  const activeCount = assets.filter((a) => a.status === "نشط").length;
  const maintenanceDue = assets.filter((a) =>
    a.next_maintenance_date && new Date(a.next_maintenance_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  ).length;

  const branchNames = ["الكل", ...new Set(assets.map(a => a.branch_name).filter(Boolean))];
  const nextNumber = String(assets.length + 1).padStart(4, "0");

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">الأصول الثابتة</h1>
          <p className="text-sm text-muted-foreground">تسجيل وتتبع أصول الشركة عبر الفروع</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />تسجيل أصل جديد</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "إجمالي التكلفة", value: totalCost.toLocaleString(), icon: "💰", bg: "bg-blue-50 border-blue-100", text: "text-blue-700" },
          { label: "القيمة الدفترية", value: totalNBV.toLocaleString(), icon: "📊", bg: "bg-green-50 border-green-100", text: "text-green-700" },
          { label: "الإهلاك المتراكم", value: totalDep.toLocaleString(), icon: "📉", bg: "bg-orange-50 border-orange-100", text: "text-orange-700" },
          { label: "أصول نشطة", value: activeCount, icon: "✅", bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
          { label: "صيانة مستحقة", value: maintenanceDue, icon: "🔧", bg: maintenanceDue > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100", text: maintenanceDue > 0 ? "text-amber-700" : "text-slate-600" },
        ].map(({ label, value, icon, bg, text }) => (
          <Card key={label} className={`border ${bg}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-lg font-bold ${text}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="بحث باسم الأصل أو الرقم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8 h-9 text-sm"
          />
        </div>
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="الفرع" /></SelectTrigger>
          <SelectContent>{branchNames.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-9 text-sm w-40"><SelectValue placeholder="التصنيف" /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            {["الكل", "نشط", "مستهلك بالكامل", "مباع", "مسقط", "تحت الصيانة"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md overflow-hidden">
          <button onClick={() => setView("grid")} className={`px-2.5 py-1.5 text-xs ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView("list")} className={`px-2.5 py-1.5 text-xs ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} أصل</span>
      </div>

      {/* Assets */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد أصول تطابق الفلترة</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onEdit={openEdit}
              onDelete={handleDelete}
              onDepreciate={openDepreciate}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["رقم الأصل", "الاسم", "التصنيف", "الفرع", "الموقع", "تاريخ الشراء", "التكلفة", "القيمة الدفترية", "المسؤول", "الحالة", "إجراءات"].map((h) => (
                    <th key={h} className="p-3 text-right text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset) => (
                  <tr key={asset.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{asset.asset_number}</td>
                    <td className="p-3 font-medium">{asset.name}</td>
                    <td className="p-3 text-xs">{asset.category}</td>
                    <td className="p-3 text-xs">
                      {asset.branch_name ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 border border-blue-100">
                          <MapPin className="h-2.5 w-2.5" />{asset.branch_name}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{asset.location || "—"}</td>
                    <td className="p-3 text-xs">{asset.purchase_date || "—"}</td>
                    <td className="p-3">{(asset.purchase_cost || 0).toLocaleString()}</td>
                    <td className="p-3 font-semibold text-green-700">{(asset.net_book_value || 0).toLocaleString()}</td>
                    <td className="p-3 text-xs text-muted-foreground">{asset.responsible_party || "—"}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        asset.status === "نشط" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        asset.status === "تحت الصيانة" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>{asset.status || "نشط"}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        {asset.status === "نشط" && (
                          <button onClick={() => openDepreciate(asset)} title="ترحيل إهلاك" className="text-orange-500 hover:text-orange-600 p-1">
                            <TrendingDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => openEdit(asset)} className="text-muted-foreground hover:text-primary p-1">✏️</button>
                        <button onClick={() => handleDelete(asset.id)} className="text-muted-foreground hover:text-destructive p-1">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Asset Form */}
      <AssetForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        asset={editing}
        nextNumber={nextNumber}
      />

      {/* Depreciation Dialog */}
      <Dialog open={depOpen} onOpenChange={setDepOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ترحيل قيد إهلاك</DialogTitle></DialogHeader>
          {depAsset && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">الأصل</span><span className="font-bold">{depAsset.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">طريقة الإهلاك</span><span>{depAsset.depreciation_method}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الإهلاك السنوي</span><span className="font-bold text-orange-600">{(depAsset.annual_depreciation || 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">القيمة الدفترية الحالية</span><span className="font-bold text-green-700">{(depAsset.net_book_value || 0).toLocaleString()}</span></div>
              </div>
              {(!depAsset.depreciation_account_id || !depAsset.accumulated_account_id) && (
                <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  يرجى تحديد حسابات الإهلاك في بيانات الأصل أولاً
                </div>
              )}
              <div>
                <Label className="text-xs mb-1 block">تاريخ القيد</Label>
                <Input type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">البيان</Label>
                <Input value={depNotes} onChange={(e) => setDepNotes(e.target.value)} className="h-8" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDepOpen(false)}>إلغاء</Button>
                <Button
                  onClick={postDepreciation}
                  disabled={!depAsset.depreciation_account_id || !depAsset.accumulated_account_id}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />ترحيل القيد
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}