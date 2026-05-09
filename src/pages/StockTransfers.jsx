import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PermissionGuard from "../components/shared/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, ArrowRightLeft, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import BranchTransferReport from "@/components/transfers/BranchTransferReport";

const STATUS_COLORS = {
  "مسودة": "bg-gray-100 text-gray-700",
  "معتمد": "bg-blue-100 text-blue-700",
  "مكتمل": "bg-green-100 text-green-700",
  "ملغى": "bg-red-100 text-red-700",
};

const EMPTY_FORM = {
  transfer_number: "", date: new Date().toISOString().split("T")[0],
  from_warehouse_id: "", from_warehouse_name: "", from_branch_id: "", from_branch_name: "",
  to_warehouse_id: "", to_warehouse_name: "", to_branch_id: "", to_branch_name: "",
  status: "مسودة", notes: "", items: [],
};

export default function StockTransfers() {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [t, w, b, p] = await Promise.all([
      base44.entities.StockTransfer.list("-date"),
      base44.entities.Warehouse.list(),
      base44.entities.Branch.list(),
      base44.entities.Product.list(),
    ]);
    setTransfers(t); setWarehouses(w); setBranches(b); setProducts(p);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, transfer_number: String(transfers.length + 1).padStart(4, "0") });
    setDialogOpen(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({ ...EMPTY_FORM, ...t });
    setDialogOpen(true);
  }

  function selectWarehouse(side, warehouseId) {
    const w = warehouses.find(x => x.id === warehouseId);
    const b = branches.find(x => x.id === w?.branch_id);
    if (side === "from") {
      setForm(f => ({ ...f, from_warehouse_id: warehouseId, from_warehouse_name: w?.name || "", from_branch_id: w?.branch_id || "", from_branch_name: b?.name || "" }));
    } else {
      setForm(f => ({ ...f, to_warehouse_id: warehouseId, to_warehouse_name: w?.name || "", to_branch_id: w?.branch_id || "", to_branch_name: b?.name || "" }));
    }
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { product_id: "", product_name: "", quantity: 0, unit: "", notes: "" }] }));
  }

  function updateItem(idx, field, value) {
    const items = [...form.items];
    if (field === "product_id") {
      const p = products.find(x => x.id === value);
      items[idx] = { ...items[idx], product_id: value, product_name: p?.name || "", unit: p?.unit || "" };
    } else {
      items[idx] = { ...items[idx], [field]: value };
    }
    setForm(f => ({ ...f, items }));
  }

  async function handleSave() {
    if (!form.from_warehouse_id || !form.to_warehouse_id || form.items.length === 0) {
      toast.error("يرجى تحديد المستودعين وإضافة مادة واحدة على الأقل");
      return;
    }
    if (editing) {
      await base44.entities.StockTransfer.update(editing.id, form);
      toast.success("تم التحديث");
    } else {
      await base44.entities.StockTransfer.create(form);
      toast.success("تم إنشاء المناقلة");
    }
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(item) {
    if (confirm("هل أنت متأكد من حذف هذه المناقلة؟")) {
      await base44.entities.StockTransfer.delete(item.id);
      toast.success("تم الحذف");
      loadData();
    }
  }

  async function changeStatus(transfer, status) {
    await base44.entities.StockTransfer.update(transfer.id, { status });
    toast.success(`تم تغيير الحالة إلى: ${status}`);
    loadData();
  }

  const totalItems = transfers.reduce((s, t) => s + (t.items?.length || 0), 0);
  const completed = transfers.filter(t => t.status === "مكتمل").length;
  const pending = transfers.filter(t => t.status === "معتمد" || t.status === "مسودة").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <PermissionGuard module="warehouses">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">مناقلات المخزون بين الفروع</h1>
            <p className="text-sm text-muted-foreground">تحويل المواد بين المستودعات والفروع المختلفة</p>
          </div>
          {canCreate("warehouses") && (
            <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> مناقلة جديدة</Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "إجمالي المناقلات", value: transfers.length, color: "text-blue-600" },
            { label: "مكتملة", value: completed, color: "text-green-600" },
            { label: "قيد التنفيذ", value: pending, color: "text-orange-600" },
          ].map((k, i) => (
            <Card key={i}><CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
            </CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="list" dir="rtl">
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5"><ArrowRightLeft className="h-4 w-4" /> قائمة المناقلات</TabsTrigger>
            <TabsTrigger value="report" className="gap-1.5"><BarChart3 className="h-4 w-4" /> تقرير الحركة بين الفروع</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-right font-medium">رقم المناقلة</th>
                        <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                        <th className="px-4 py-3 text-right font-medium">من الفرع / المستودع</th>
                        <th className="px-4 py-3 text-right font-medium">إلى الفرع / المستودع</th>
                        <th className="px-4 py-3 text-right font-medium">الأصناف</th>
                        <th className="px-4 py-3 text-right font-medium">الحالة</th>
                        <th className="px-4 py-3 text-right font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">لا توجد مناقلات</td></tr>
                      ) : transfers.map(t => (
                        <tr key={t.id} className="border-t hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono font-semibold">{t.transfer_number}</td>
                          <td className="px-4 py-3 text-muted-foreground">{t.date}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{t.from_branch_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{t.from_warehouse_name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{t.to_branch_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{t.to_warehouse_name}</div>
                          </td>
                          <td className="px-4 py-3 text-center">{t.items?.length || 0}</td>
                          <td className="px-4 py-3">
                            <Badge className={STATUS_COLORS[t.status] || STATUS_COLORS["مسودة"]}>{t.status || "مسودة"}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {canEdit("warehouses") && (
                                <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>تعديل</Button>
                              )}
                              {t.status === "مسودة" && canEdit("warehouses") && (
                                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200" onClick={() => changeStatus(t, "معتمد")}>اعتماد</Button>
                              )}
                              {t.status === "معتمد" && canEdit("warehouses") && (
                                <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => changeStatus(t, "مكتمل")}>إتمام</Button>
                              )}
                              {canDelete("warehouses") && (
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="mt-4">
            <BranchTransferReport transfers={transfers} branches={branches} warehouses={warehouses} products={products} />
          </TabsContent>
        </Tabs>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader><DialogTitle>{editing ? "تعديل مناقلة" : "مناقلة مخزون جديدة"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>رقم المناقلة</Label><Input value={form.transfer_number} readOnly className="bg-muted/40" /></div>
                <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-red-50/50 rounded-lg border border-red-100">
                <div className="col-span-2 text-xs font-semibold text-red-700 mb-1">📤 مصدر التحويل</div>
                <div>
                  <Label>المستودع المصدر</Label>
                  <Select value={form.from_warehouse_id} onValueChange={v => selectWarehouse("from", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name} {w.branch_name ? `(${w.branch_name})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.from_branch_name && (
                  <div className="flex items-end pb-1 text-sm text-muted-foreground">
                    <span>الفرع: <strong>{form.from_branch_name}</strong></span>
                  </div>
                )}
              </div>

              <div className="flex justify-center text-2xl text-muted-foreground">⬇️</div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-green-50/50 rounded-lg border border-green-100">
                <div className="col-span-2 text-xs font-semibold text-green-700 mb-1">📥 وجهة التحويل</div>
                <div>
                  <Label>المستودع الهدف</Label>
                  <Select value={form.to_warehouse_id} onValueChange={v => selectWarehouse("to", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                    <SelectContent>{warehouses.filter(w => w.id !== form.from_warehouse_id).map(w => <SelectItem key={w.id} value={w.id}>{w.name} {w.branch_name ? `(${w.branch_name})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.to_branch_name && (
                  <div className="flex items-end pb-1 text-sm text-muted-foreground">
                    <span>الفرع: <strong>{form.to_branch_name}</strong></span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-semibold">المواد المحوَّلة</Label>
                  <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 ml-1" /> إضافة صنف</Button>
                </div>
                {form.items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">لا توجد مواد. اضغط "إضافة صنف"</p>
                )}
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-lg mb-2">
                    <div className="col-span-5">
                      <Label className="text-xs">الصنف</Label>
                      <Select value={item.product_id} onValueChange={v => updateItem(idx, "product_id", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                        <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">الكمية</Label>
                      <Input className="h-9" type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">الوحدة</Label>
                      <Input className="h-9" value={item.unit} onChange={e => updateItem(idx, "unit", e.target.value)} placeholder="قطعة" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">ملاحظة</Label>
                      <Input className="h-9" value={item.notes || ""} onChange={e => updateItem(idx, "notes", e.target.value)} />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button variant="ghost" size="icon" className="h-9 text-destructive" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مسودة">مسودة</SelectItem>
                    <SelectItem value="معتمد">معتمد</SelectItem>
                    <SelectItem value="مكتمل">مكتمل</SelectItem>
                    <SelectItem value="ملغى">ملغى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div><Label>البيان / الملاحظات</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave}>حفظ المناقلة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}