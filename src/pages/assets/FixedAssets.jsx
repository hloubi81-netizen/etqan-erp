import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Building2, TrendingDown, CheckCircle, RefreshCw,
  Search, MapPin, LayoutGrid, List, AlertCircle, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import AssetForm from "@/components/assets/AssetForm";
import AssetCard from "@/components/assets/AssetCard";

const CATEGORIES = ["الكل", "مباني", "آلات ومعدات", "سيارات", "أثاث ومفروشات", "أجهزة حاسوب", "أصول أخرى"];
const STATUSES   = ["الكل", "نشط", "تحت الصيانة", "مستهلك بالكامل", "مباع", "مسقط"];

export default function FixedAssets() {
  const [assets, setAssets]       = useState([]);
  const [branches, setBranches]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [depOpen, setDepOpen]     = useState(false);
  const [depAsset, setDepAsset]   = useState(null);
  const [depDate, setDepDate]     = useState(new Date().toISOString().split("T")[0]);
  const [depNotes, setDepNotes]   = useState("");
  const [viewMode, setViewMode]   = useState("grid");

  // Filters
  const [search, setSearch]         = useState("");
  const [filterBranch, setFilterBranch] = useState("الكل");
  const [filterCategory, setFilterCategory] = useState("الكل");
  const [filterStatus, setFilterStatus]   = useState("الكل");

  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [a, br] = await Promise.all([
      base44.entities.FixedAsset.list("-purchase_date"),
      base44.entities.Branch.list()
    ]);
    setAssets(a); setBranches(br); setLoading(false);
  }

  function openAdd()        { setEditing(null); setFormOpen(true); }
  function openEdit(asset)  { setEditing(asset); setFormOpen(true); }

  async function handleSave(data) {
    if (editing) {
      await base44.entities.FixedAsset.update(editing.id, data);
      setAssets(p => p.map(a => a.id === editing.id ? { ...a, ...data } : a));
      toast.success("تم تحديث بيانات الأصل");
    } else {
      const created = await base44.entities.FixedAsset.create({ ...data, subscription_id: user?.subscription_id });
      setAssets(p => [created, ...p]);
      toast.success("تم تسجيل الأصل بنجاح ✅");
    }
    setFormOpen(false);
  }

  async function handleDelete(id) {
    if (!confirm("هل أنت متأكد من حذف هذا الأصل؟")) return;
    await base44.entities.FixedAsset.delete(id);
    setAssets(p => p.filter(a => a.id !== id));
    toast.success("تم الحذف");
  }

  function openDepreciate(asset) {
    setDepAsset(asset);
    setDepNotes(`إهلاك الأصل: ${asset.name}`);
    setDepOpen(true);
  }

  async function postDepreciation() {
    if (!depAsset) return;
    if (!depAsset.depreciation_account_id || !depAsset.accumulated_account_id) {
      toast.error("يجب تحديد حساب الإهلاك وحساب مجمع الإهلاك أولاً");
      return;
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
      subscription_id: user?.subscription_id,
    });

    const newAccumulated = (depAsset.accumulated_depreciation || 0) + amount;
    const newNBV = Math.max(0, (depAsset.purchase_cost || 0) - newAccumulated);
    const newStatus = newNBV <= (depAsset.salvage_value || 0) ? "مستهلك بالكامل" : "نشط";
    await base44.entities.FixedAsset.update(depAsset.id, {
      accumulated_depreciation: newAccumulated,
      net_book_value: newNBV,
      status: newStatus,
    });
    setAssets(p => p.map(a => a.id === depAsset.id
      ? { ...a, accumulated_depreciation: newAccumulated, net_book_value: newNBV, status: newStatus }
      : a));
    toast.success(`تم ترحيل قيد الإهلاك بمبلغ ${amount.toLocaleString()}`);
    setDepOpen(false);
  }

  // ── Filtered assets ──
  const filtered = assets.filter(a => {
    const matchSearch = !search || a.name?.includes(search) || a.asset_number?.includes(search) || a.responsible_party?.includes(search);
    const matchBranch = filterBranch === "الكل" || a.branch_name === filterBranch;
    const matchCat    = filterCategory === "الكل" || a.category === filterCategory;
    const matchStatus = filterStatus === "الكل" || a.status === filterStatus;
    return matchSearch && matchBranch && matchCat && matchStatus;
  });

  // ── KPIs ──
  const totalCost       = assets.reduce((s, a) => s + (a.purchase_cost || 0), 0);
  const totalNBV        = assets.reduce((s, a) => s + (a.net_book_value || 0), 0);
  const totalDepreciated = assets.reduce((s, a) => s + (a.accumulated_depreciation || 0), 0);
  const activeCount     = assets.filter(a => a.status === "نشط").length;
  const maintenanceDue  = assets.filter(a => a.next_maintenance_date && new Date(a.next_maintenance_date) <= new Date()).length;

  // ── Branch distribution ──
  const branchGroups = branches.map(br => ({
    name: br.name,
    count: assets.filter(a => a.branch_id === br.id).length,
    value: assets.filter(a => a.branch_id === br.id).reduce((s, a) => s + (a.net_book_value || 0), 0),
  })).filter(b => b.count > 0);
  const unassigned = assets.filter(a => !a.branch_id).length;

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
          <h1 className="text-2xl font-bold">سجل الأصول الثابتة</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تسجيل وتتبع ممتلكات الشركة عبر الفروع</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> تسجيل أصل جديد
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "إجمالي التكلفة",    value: totalCost.toLocaleString(),        Ic: Building2,    bg: "bg-blue-600" },
          { label: "القيمة الدفترية",    value: totalNBV.toLocaleString(),         Ic: CheckCircle,  bg: "bg-emerald-600" },
          { label: "الإهلاك المتراكم",   value: totalDepreciated.toLocaleString(), Ic: TrendingDown, bg: "bg-orange-500" },
          { label: "أصول نشطة",          value: `${activeCount} أصل`,             Ic: RefreshCw,    bg: "bg-purple-600" },
          { label: "صيانة مستحقة",       value: `${maintenanceDue} أصل`,          Ic: AlertCircle,  bg: maintenanceDue > 0 ? "bg-red-500" : "bg-slate-400" },
        ].map(({ label, value, Ic, bg }) => (
          <Card key={label}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-9 w-9 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
                <Ic className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Branch Distribution */}
      {branchGroups.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> توزيع الأصول على الفروع
            </p>
            <div className="flex flex-wrap gap-2">
              {branchGroups.map(b => (
                <div key={b.name} className="flex items-center gap-2 bg-muted/40 border rounded-lg px-3 py-2 text-xs">
                  <span className="font-semibold">{b.name}</span>
                  <Badge variant="secondary" className="text-xs">{b.count} أصل</Badge>
                  <span className="text-muted-foreground">{b.value.toLocaleString()}</span>
                </div>
              ))}
              {unassigned > 0 && (
                <div className="flex items-center gap-2 bg-muted/20 border border-dashed rounded-lg px-3 py-2 text-xs text-muted-foreground">
                  <ShieldAlert className="h-3 w-3" />
                  <span>{unassigned} أصل غير مخصص لفرع</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الرقم أو المسؤول..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-9 pr-8 text-sm"
          />
        </div>
        <Select value={filterBranch} onValueChange={setFilterBranch}>
          <SelectTrigger className="h-9 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="الكل">كل الفروع</SelectItem>
            {branches.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-9 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c === "الكل" ? "كل التصنيفات" : c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s === "الكل" ? "كل الحالات" : s}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode("table")} className={`p-2 ${viewMode === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        عرض {filtered.length} من {assets.length} أصل
      </p>

      {/* Assets — Grid View */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا توجد أصول مطابقة لمعايير البحث</p>
          {assets.length === 0 && (
            <Button variant="outline" size="sm" onClick={openAdd} className="mt-3 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> سجّل أول أصل
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(asset => (
            <AssetCard key={asset.id} asset={asset}
              onEdit={openEdit} onDelete={handleDelete} onDepreciate={openDepreciate} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  {["رقم الأصل","الاسم","التصنيف","الفرع","الموقع","تاريخ الشراء","التكلفة","القيمة الدفترية","المسؤول","الحالة","إجراءات"].map(h => (
                    <th key={h} className="p-3 text-right text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(asset => (
                  <tr key={asset.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{asset.asset_number}</td>
                    <td className="p-3 font-medium whitespace-nowrap">{asset.name}</td>
                    <td className="p-3 text-xs">{asset.category}</td>
                    <td className="p-3 text-xs">{asset.branch_name || "—"}</td>
                    <td className="p-3 text-xs max-w-[140px] truncate" title={asset.location}>{asset.location || "—"}</td>
                    <td className="p-3 text-xs whitespace-nowrap">{asset.purchase_date || "—"}</td>
                    <td className="p-3 font-medium">{(asset.purchase_cost || 0).toLocaleString()}</td>
                    <td className="p-3 font-semibold text-green-700">{(asset.net_book_value || 0).toLocaleString()}</td>
                    <td className="p-3 text-xs">{asset.responsible_party || "—"}</td>
                    <td className="p-3">
                      <span className={`text-xs border rounded-full px-2 py-0.5 ${
                        asset.status === "نشط" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        asset.status === "تحت الصيانة" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        "bg-muted text-muted-foreground"
                      }`}>{asset.status || "نشط"}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        {asset.status === "نشط" && (
                          <button onClick={() => openDepreciate(asset)} className="text-orange-500 hover:text-orange-600" title="إهلاك">
                            <TrendingDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => openEdit(asset)} className="text-muted-foreground hover:text-primary">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(asset.id)} className="text-muted-foreground hover:text-destructive">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form */}
      <AssetForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        asset={editing}
        assetCount={assets.length}
      />

      {/* Depreciation Dialog */}
      <Dialog open={depOpen} onOpenChange={setDepOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-orange-500" />ترحيل قيد إهلاك</DialogTitle></DialogHeader>
          {depAsset && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">الأصل</span><span className="font-bold">{depAsset.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">طريقة الإهلاك</span><span>{depAsset.depreciation_method}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الإهلاك السنوي</span><span className="font-bold text-orange-600">{(depAsset.annual_depreciation || 0).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">القيمة الدفترية</span><span className="font-bold text-green-700">{(depAsset.net_book_value || 0).toLocaleString()}</span></div>
              </div>
              {(!depAsset.depreciation_account_id || !depAsset.accumulated_account_id) && (
                <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  يرجى تحديد حسابات الإهلاك في بيانات الأصل أولاً
                </div>
              )}
              <div><Label className="text-xs">تاريخ القيد</Label><Input type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)} className="mt-1 h-9" /></div>
              <div><Label className="text-xs">البيان</Label><Input value={depNotes} onChange={(e) => setDepNotes(e.target.value)} className="mt-1 h-9" /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDepOpen(false)}>إلغاء</Button>
            <Button onClick={postDepreciation}
              disabled={!depAsset?.depreciation_account_id || !depAsset?.accumulated_account_id}
              className="gap-2 bg-orange-600 hover:bg-orange-700">
              <CheckCircle className="h-4 w-4" /> ترحيل القيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}