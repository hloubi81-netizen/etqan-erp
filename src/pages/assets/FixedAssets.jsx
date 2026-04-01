import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Building2, TrendingDown, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const EMPTY = {
  asset_number: "", name: "", category: "آلات ومعدات", purchase_date: "",
  purchase_cost: 0, useful_life_years: 5, salvage_value: 0,
  depreciation_method: "القسط الثابت", annual_depreciation: 0,
  accumulated_depreciation: 0, net_book_value: 0,
  responsible_party: "", location: "", branch_id: "", branch_name: "",
  asset_account_id: "", asset_account_name: "",
  depreciation_account_id: "", depreciation_account_name: "",
  accumulated_account_id: "", accumulated_account_name: "",
  status: "نشط", notes: ""
};

function calcDepreciation(form) {
  const cost = parseFloat(form.purchase_cost) || 0;
  const salvage = parseFloat(form.salvage_value) || 0;
  const life = parseFloat(form.useful_life_years) || 1;
  if (form.depreciation_method === "القسط الثابت") {
    return parseFloat(((cost - salvage) / life).toFixed(2));
  } else {
    const rate = (2 / life);
    const nbv = cost - (parseFloat(form.accumulated_depreciation) || 0);
    return parseFloat((nbv * rate).toFixed(2));
  }
}

const STATUS_COLORS = { "نشط": "default", "مستهلك بالكامل": "secondary", "مباع": "outline", "مسقط": "destructive" };
const CATEGORIES = ["مباني", "آلات ومعدات", "سيارات", "أثاث ومفروشات", "أجهزة حاسوب", "أصول أخرى"];

export default function FixedAssets() {
  const [assets, setAssets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [depOpen, setDepOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [depAsset, setDepAsset] = useState(null);
  const [depDate, setDepDate] = useState(new Date().toISOString().split("T")[0]);
  const [depNotes, setDepNotes] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.FixedAsset.list("-purchase_date"),
      base44.entities.Account.filter({ is_parent: false }),
      base44.entities.Branch.list()
    ]).then(([a, acc, br]) => {
      setAssets(a); setAccounts(acc); setBranches(br); setLoading(false);
    });
  }, []);

  function updateForm(key, val) {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      const annual = calcDepreciation(next);
      next.annual_depreciation = annual;
      next.net_book_value = Math.max(0, (parseFloat(next.purchase_cost) || 0) - (parseFloat(next.accumulated_depreciation) || 0));
      return next;
    });
  }

  function openAdd() {
    const num = String(assets.length + 1).padStart(4, "0");
    setForm({ ...EMPTY, asset_number: `FA-${num}` });
    setEditing(null); setOpen(true);
  }

  function openEdit(asset) { setForm({ ...asset }); setEditing(asset.id); setOpen(true); }

  async function save() {
    if (!form.name || !form.asset_number) { toast.error("اسم الأصل ورقمه مطلوبان"); return; }
    const annual = calcDepreciation(form);
    const data = { ...form, annual_depreciation: annual, net_book_value: Math.max(0, (form.purchase_cost || 0) - (form.accumulated_depreciation || 0)) };
    if (editing) {
      await base44.entities.FixedAsset.update(editing, data);
      setAssets((p) => p.map((a) => a.id === editing ? { ...a, ...data } : a));
    } else {
      const created = await base44.entities.FixedAsset.create(data);
      setAssets((p) => [created, ...p]);
    }
    toast.success("تم الحفظ");
    setOpen(false);
  }

  async function del(id) {
    if (!confirm("حذف هذا الأصل؟")) return;
    await base44.entities.FixedAsset.delete(id);
    setAssets((p) => p.filter((a) => a.id !== id));
    toast.success("تم الحذف");
  }

  function openDepreciate(asset) { setDepAsset(asset); setDepNotes(`إهلاك الأصل: ${asset.name}`); setDepOpen(true); }

  async function postDepreciation() {
    if (!depAsset) return;
    if (!depAsset.depreciation_account_id || !depAsset.accumulated_account_id) {
      toast.error("يجب تحديد حساب الإهلاك وحساب مجمع الإهلاك أولاً");
      return;
    }
    const amount = depAsset.annual_depreciation || 0;
    if (amount <= 0) { toast.error("مبلغ الإهلاك يجب أن يكون أكبر من صفر"); return; }

    // Create journal entry
    const entries = await base44.entities.JournalEntry.list("-created_date", 1);
    const entryNum = `DEP-${Date.now()}`;
    await base44.entities.JournalEntry.create({
      entry_number: entryNum,
      date: depDate,
      source_type: "سند قيد",
      debit_account_id: depAsset.depreciation_account_id,
      debit_account_name: depAsset.depreciation_account_name,
      credit_account_id: depAsset.accumulated_account_id,
      credit_account_name: depAsset.accumulated_account_name,
      amount,
      notes: depNotes || `إهلاك: ${depAsset.name}`,
    });

    // Update asset accumulated depreciation
    const newAccumulated = (depAsset.accumulated_depreciation || 0) + amount;
    const newNBV = Math.max(0, (depAsset.purchase_cost || 0) - newAccumulated);
    const newStatus = newNBV <= (depAsset.salvage_value || 0) ? "مستهلك بالكامل" : "نشط";
    await base44.entities.FixedAsset.update(depAsset.id, {
      accumulated_depreciation: newAccumulated,
      net_book_value: newNBV,
      status: newStatus,
    });
    setAssets((p) => p.map((a) => a.id === depAsset.id ? { ...a, accumulated_depreciation: newAccumulated, net_book_value: newNBV, status: newStatus } : a));
    toast.success(`تم ترحيل قيد الإهلاك بمبلغ ${amount.toLocaleString()}`);
    setDepOpen(false);
  }

  const totalCost = assets.reduce((s, a) => s + (a.purchase_cost || 0), 0);
  const totalNBV = assets.reduce((s, a) => s + (a.net_book_value || 0), 0);
  const totalDepreciated = assets.reduce((s, a) => s + (a.accumulated_depreciation || 0), 0);
  const activeCount = assets.filter((a) => a.status === "نشط").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">الأصول الثابتة</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة الأصول الثابتة وإهلاكها</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" />إضافة أصل</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["إجمالي التكلفة", totalCost, "bg-blue-600", Building2],
          ["القيمة الدفترية", totalNBV, "bg-green-600", CheckCircle],
          ["الإهلاك المتراكم", totalDepreciated, "bg-orange-500", TrendingDown],
          ["أصول نشطة", activeCount, "bg-purple-600", RefreshCw],
        ].map(([lbl, val, bg, Icon]) => (
          <Card key={lbl}><CardContent className="p-4 flex items-center gap-3">
            <div className={`h-10 w-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{lbl}</p>
              <p className="text-lg font-bold">{typeof val === "number" ? val.toLocaleString() : val}</p>
            </div>
          </CardContent></Card>
        ))}
      </div>

      {/* Assets Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["رقم الأصل","الاسم","التصنيف","تكلفة الشراء","الإهلاك السنوي","متراكم","القيمة الدفترية","الجهة المسؤولة","الحالة","إجراءات"].map((h) => (
                  <th key={h} className="p-3 text-right text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr><td colSpan={10} className="text-center text-muted-foreground py-12">لا توجد أصول مسجلة</td></tr>
                ) : assets.map((asset) => (
                  <tr key={asset.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{asset.asset_number}</td>
                    <td className="p-3 font-medium">{asset.name}</td>
                    <td className="p-3 text-xs text-muted-foreground">{asset.category}</td>
                    <td className="p-3">{(asset.purchase_cost || 0).toLocaleString()}</td>
                    <td className="p-3 text-orange-600">{(asset.annual_depreciation || 0).toLocaleString()}</td>
                    <td className="p-3 text-red-500">{(asset.accumulated_depreciation || 0).toLocaleString()}</td>
                    <td className="p-3 font-semibold text-green-700">{(asset.net_book_value || 0).toLocaleString()}</td>
                    <td className="p-3 text-xs text-muted-foreground">{asset.responsible_party || "—"}</td>
                    <td className="p-3"><Badge variant={STATUS_COLORS[asset.status] || "default"} className="text-xs">{asset.status || "نشط"}</Badge></td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {asset.status === "نشط" && (
                          <button onClick={() => openDepreciate(asset)} title="ترحيل إهلاك" className="text-orange-500 hover:text-orange-600">
                            <TrendingDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => openEdit(asset)} className="text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => del(asset.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل أصل" : "إضافة أصل ثابت"}</DialogTitle></DialogHeader>
          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="mb-4">
              <TabsTrigger value="basic">البيانات الأساسية</TabsTrigger>
              <TabsTrigger value="depreciation">الإهلاك</TabsTrigger>
              <TabsTrigger value="accounts">الحسابات المحاسبية</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[["asset_number","رقم الأصل*"],["name","اسم الأصل*"],["responsible_party","الجهة المسؤولة"],["location","الموقع"]].map(([k,lbl]) => (
                  <div key={k}><Label className="text-xs">{lbl}</Label><Input value={form[k] || ""} onChange={(e) => updateForm(k, e.target.value)} className="mt-1 h-8" /></div>
                ))}
                <div><Label className="text-xs">التصنيف</Label>
                  <Select value={form.category} onValueChange={(v) => updateForm("category", v)}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">الحالة</Label>
                  <Select value={form.status} onValueChange={(v) => updateForm("status", v)}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{["نشط","مستهلك بالكامل","مباع","مسقط"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">تاريخ الشراء</Label><Input type="date" value={form.purchase_date || ""} onChange={(e) => updateForm("purchase_date", e.target.value)} className="mt-1 h-8" /></div>
                <div><Label className="text-xs">تكلفة الشراء</Label><Input type="number" value={form.purchase_cost || 0} onChange={(e) => updateForm("purchase_cost", parseFloat(e.target.value) || 0)} className="mt-1 h-8" /></div>
                <div className="col-span-2"><Label className="text-xs">ملاحظات</Label><Input value={form.notes || ""} onChange={(e) => updateForm("notes", e.target.value)} className="mt-1 h-8" /></div>
              </div>
            </TabsContent>

            <TabsContent value="depreciation" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">طريقة الإهلاك</Label>
                  <Select value={form.depreciation_method} onValueChange={(v) => updateForm("depreciation_method", v)}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="القسط الثابت">القسط الثابت (Straight-Line)</SelectItem>
                      <SelectItem value="القسط المتناقص">القسط المتناقص (Declining Balance)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">العمر الإنتاجي (سنوات)</Label><Input type="number" value={form.useful_life_years || 0} onChange={(e) => updateForm("useful_life_years", parseFloat(e.target.value) || 0)} className="mt-1 h-8" /></div>
                <div><Label className="text-xs">القيمة التخريدية</Label><Input type="number" value={form.salvage_value || 0} onChange={(e) => updateForm("salvage_value", parseFloat(e.target.value) || 0)} className="mt-1 h-8" /></div>
                <div><Label className="text-xs">الإهلاك المتراكم (الرصيد الافتتاحي)</Label><Input type="number" value={form.accumulated_depreciation || 0} onChange={(e) => updateForm("accumulated_depreciation", parseFloat(e.target.value) || 0)} className="mt-1 h-8" /></div>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                <div><p className="text-xs text-muted-foreground">الإهلاك السنوي المحسوب</p><p className="text-lg font-bold text-orange-600">{(form.annual_depreciation || 0).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">الإهلاك المتراكم</p><p className="text-lg font-bold text-red-500">{(form.accumulated_depreciation || 0).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">القيمة الدفترية الصافية</p><p className="text-lg font-bold text-green-700">{(form.net_book_value || 0).toLocaleString()}</p></div>
              </div>
            </TabsContent>

            <TabsContent value="accounts" className="space-y-3">
              <p className="text-xs text-muted-foreground mb-2">ربط الأصل بالحسابات المحاسبية لأتمتة قيود الإهلاك</p>
              {[
                ["asset_account_id","asset_account_name","حساب الأصل الثابت"],
                ["depreciation_account_id","depreciation_account_name","حساب مصروف الإهلاك (مدين)"],
                ["accumulated_account_id","accumulated_account_name","حساب مجمع الإهلاك (دائن)"],
              ].map(([idKey, nameKey, lbl]) => (
                <div key={idKey}>
                  <Label className="text-xs">{lbl}</Label>
                  <Select value={form[idKey] || ""} onValueChange={(v) => {
                    const acc = accounts.find((a) => a.id === v);
                    setForm((p) => ({ ...p, [idKey]: v, [nameKey]: acc?.name || "" }));
                  }}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="اختر حساباً" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.account_number} - {acc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 mt-4">
            <Button onClick={save} className="flex-1">حفظ</Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Depreciation Posting Dialog */}
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
                  <span>يرجى تحديد حسابات الإهلاك في بيانات الأصل أولاً</span>
                </div>
              )}
              <div><Label className="text-xs">تاريخ القيد</Label><Input type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)} className="mt-1 h-8" /></div>
              <div><Label className="text-xs">البيان</Label><Input value={depNotes} onChange={(e) => setDepNotes(e.target.value)} className="mt-1 h-8" /></div>
              <div className="flex gap-2">
                <Button onClick={postDepreciation} className="flex-1 gap-2" disabled={!depAsset.depreciation_account_id || !depAsset.accumulated_account_id}>
                  <CheckCircle className="h-4 w-4" />ترحيل القيد
                </Button>
                <Button variant="outline" onClick={() => setDepOpen(false)} className="flex-1">إلغاء</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}