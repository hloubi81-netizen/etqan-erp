import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, GitBranch, Building2, Package, BookOpen, Link } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const empty = { name: "", code: "", location: "", manager_name: "", phone: "", is_main: false, notes: "" };

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [data, prods, accs] = await Promise.all([
      base44.entities.Branch.list(),
      base44.entities.Product.list(),
      base44.entities.Account.list(),
    ]);
    setBranches(data);
    setProducts(prods);
    setAccounts(accs);
    setLoading(false);
  }

  function getBranchStats(branchId) {
    const productCount = products.filter(p => p.branch_id === branchId).length;
    const accountCount = accounts.filter(a => a.branch_id === branchId).length;
    return { productCount, accountCount };
  }

  function openNew() { setForm(empty); setEditId(null); setOpen(true); }
  function openEdit(b) { setForm({ ...b }); setEditId(b.id); setOpen(true); }

  async function save() {
    if (!form.name || !form.code) return toast.error("اسم الفرع والرمز مطلوبان");
    if (editId) {
      await base44.entities.Branch.update(editId, form);
      toast.success("تم تحديث الفرع");
    } else {
      await base44.entities.Branch.create(form);
      toast.success("تم إضافة الفرع");
    }
    setOpen(false);
    load();
  }

  async function remove(id) {
    if (!confirm("هل أنت متأكد من حذف هذا الفرع؟")) return;
    await base44.entities.Branch.delete(id);
    toast.success("تم حذف الفرع");
    load();
  }

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"/></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الفروع والمعارض</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة فروع الشركة ومعارضها</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4"/>إضافة فرع</Button>
      </div>

      {branches.length === 0 ? (
        <div className="bg-card border rounded-xl p-16 text-center text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30"/>
          <p>لا توجد فروع مضافة بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(b => (
            <Card key={b.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GitBranch className="h-5 w-5 text-primary"/>
                    </div>
                    <div>
                      <CardTitle className="text-base">{b.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{b.code}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {b.is_main && <Badge variant="default" className="text-xs">رئيسي</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {b.location && <p className="text-muted-foreground">📍 {b.location}</p>}
                {b.manager_name && <p className="text-muted-foreground">👤 {b.manager_name}</p>}
                {b.phone && <p className="text-muted-foreground">📞 {b.phone}</p>}
                {b.notes && <p className="text-muted-foreground text-xs mt-2">{b.notes}</p>}

                {/* Branch Stats */}
                <div className="grid grid-cols-2 gap-2 pt-3 mt-2">
                  {(() => {
                    const { productCount, accountCount } = getBranchStats(b.id);
                    return (
                      <>
                        <button
                          onClick={() => navigate(`/products?branch=${b.id}`)}
                          className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-right"
                        >
                          <Package className="h-4 w-4 text-blue-600 shrink-0" />
                          <div>
                            <p className="text-xs text-blue-600 font-semibold">{productCount}</p>
                            <p className="text-[10px] text-blue-500">منتج</p>
                          </div>
                        </button>
                        <button
                          onClick={() => navigate(`/accounts?branch=${b.id}`)}
                          className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors text-right"
                        >
                          <BookOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-xs text-emerald-600 font-semibold">{accountCount}</p>
                            <p className="text-[10px] text-emerald-500">حساب</p>
                          </div>
                        </button>
                      </>
                    );
                  })()}
                </div>

                <div className="flex gap-2 pt-3 border-t mt-1">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEdit(b)}>
                    <Pencil className="h-3 w-3"/>تعديل
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive gap-1" onClick={() => remove(b.id)}>
                    <Trash2 className="h-3 w-3"/>حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "تعديل الفرع" : "إضافة فرع جديد"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>اسم الفرع *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="اسم الفرع"/>
            </div>
            <div className="space-y-1.5">
              <Label>الرمز *</Label>
              <Input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="مثال: BR01"/>
            </div>
            <div className="space-y-1.5">
              <Label>الموقع</Label>
              <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="المدينة/المنطقة"/>
            </div>
            <div className="space-y-1.5">
              <Label>مدير الفرع</Label>
              <Input value={form.manager_name} onChange={e => setForm({...form, manager_name: e.target.value})} placeholder="اسم المدير"/>
            </div>
            <div className="space-y-1.5">
              <Label>الهاتف</Label>
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="رقم الهاتف"/>
            </div>
            <div className="space-y-1.5 flex items-center gap-2 pt-5">
              <input type="checkbox" id="is_main" checked={form.is_main} onChange={e => setForm({...form, is_main: e.target.checked})} className="h-4 w-4"/>
              <Label htmlFor="is_main">الفرع الرئيسي</Label>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="ملاحظات إضافية"/>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save}>{editId ? "تحديث" : "حفظ"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}