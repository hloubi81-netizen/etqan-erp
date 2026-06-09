import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../../components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil, Link2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  platform: "Shopify",
  external_sku: "",
  external_product_name: "",
  product_id: "",
  product_name: "",
  warehouse_id: "",
  warehouse_name: "",
};

const PLATFORM_COLORS = {
  Wix: "bg-blue-100 text-blue-800 border-blue-200",
  Shopify: "bg-green-100 text-green-800 border-green-200",
  WooCommerce: "bg-purple-100 text-purple-800 border-purple-200",
};

export default function EcomProductMappings() {
  const [mappings, setMappings] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [maps, prods, whs] = await Promise.all([
        base44.entities.EcomProductMapping.list(),
        base44.entities.Product.list(),
        base44.entities.Warehouse.list(),
      ]);
      setMappings(maps);
      setProducts(prods);
      setWarehouses(whs);
    } catch (error) {
      toast.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowDialog(true);
  }

  function openEdit(m) {
    setForm({ ...m });
    setEditId(m.id);
    setShowDialog(true);
  }

  async function handleSave() {
    if (!form.product_id || !form.warehouse_id) {
      toast.error("يرجى اختيار المنتج والمستودع");
      return;
    }
    if (!form.external_sku && !form.external_product_name) {
      toast.error("يرجى إدخال رمز المنتج (SKU) أو اسمه في المتجر");
      return;
    }

    const data = {
      platform: form.platform,
      external_sku: form.external_sku,
      external_product_name: form.external_product_name,
      product_id: form.product_id,
      product_name: form.product_name,
      warehouse_id: form.warehouse_id,
      warehouse_name: form.warehouse_name,
    };

    if (editId) {
      await base44.entities.EcomProductMapping.update(editId, data);
      toast.success("تم تحديث الربط");
    } else {
      await base44.entities.EcomProductMapping.create(data);
      toast.success("تم إضافة الربط بنجاح");
    }
    setShowDialog(false);
    loadData();
  }

  async function handleDelete(id) {
    await base44.entities.EcomProductMapping.delete(id);
    toast.success("تم حذف الربط");
    loadData();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="ربط منتجات المتاجر بالمخزون"
        subtitle="اربط منتجات متاجرك الإلكترونية بمنتجات النظام ليتم خصم الكميات تلقائياً عند استلام الطلبات"
        onAdd={openNew}
        addLabel="إضافة ربط جديد"
      />

      <Card>
        <CardContent className="p-0">
          {mappings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">المنصة</TableHead>
                    <TableHead className="text-right">SKU في المتجر</TableHead>
                    <TableHead className="text-right">اسم المنتج في المتجر</TableHead>
                    <TableHead className="text-right">المنتج في النظام</TableHead>
                    <TableHead className="text-right">المستودع</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Badge variant="outline" className={PLATFORM_COLORS[m.platform] || ""}>{m.platform}</Badge>
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">{m.external_sku || "—"}</TableCell>
                      <TableCell>{m.external_product_name || "—"}</TableCell>
                      <TableCell className="font-medium">{m.product_name}</TableCell>
                      <TableCell>{m.warehouse_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(m.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Link2 className="w-12 h-12 mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-1">لا توجد روابط منتجات بعد</p>
              <p className="text-sm">أضف ربطاً بين منتجات متجرك الإلكتروني ومنتجات النظام ليتم خصم المخزون تلقائياً</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "تعديل الربط" : "إضافة ربط جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">المنصة</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shopify">Shopify</SelectItem>
                  <SelectItem value="WooCommerce">WooCommerce</SelectItem>
                  <SelectItem value="Wix">Wix</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">رمز المنتج في المتجر (SKU)</Label>
              <Input dir="ltr" placeholder="SKU-123" value={form.external_sku} onChange={(e) => setForm({ ...form, external_sku: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">أو اسم المنتج في المتجر (مطابقة بالاسم)</Label>
              <Input placeholder="اسم المنتج كما يظهر في المتجر" value={form.external_product_name} onChange={(e) => setForm({ ...form, external_product_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">المنتج في النظام</Label>
              <Select value={form.product_id} onValueChange={(v) => {
                const p = products.find(pr => pr.id === v);
                setForm({ ...form, product_id: v, product_name: p?.name || "" });
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="اختر منتجاً" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.item_code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">المستودع (الذي سيتم الخصم منه)</Label>
              <Select value={form.warehouse_id} onValueChange={(v) => {
                const w = warehouses.find(wh => wh.id === v);
                setForm({ ...form, warehouse_id: v, warehouse_name: w?.name || "" });
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="اختر مستودعاً" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}