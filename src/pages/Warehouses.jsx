import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", location: "", notes: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await base44.entities.Warehouse.list();
    setWarehouses(data);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: "", code: "", location: "", notes: "" });
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ name: item.name, code: item.code || "", location: item.location || "", notes: item.notes || "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (editing) {
      await base44.entities.Warehouse.update(editing.id, form);
      toast.success("تم تحديث المستودع");
    } else {
      await base44.entities.Warehouse.create(form);
      toast.success("تم إضافة المستودع");
    }
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(item) {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await base44.entities.Warehouse.delete(item.id);
      toast.success("تم الحذف");
      loadData();
    }
  }

  const columns = [
    { key: "code", label: "الرمز" },
    { key: "name", label: "اسم المستودع" },
    { key: "location", label: "الموقع" },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="المستودعات" subtitle="إدارة المستودعات والمخازن" onAdd={openNew} addLabel="مستودع جديد" />
      <DataTable columns={columns} data={warehouses} onEdit={openEdit} onDelete={handleDelete} emptyMessage="لا توجد مستودعات" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل المستودع" : "مستودع جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم المستودع</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>الرمز</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>الموقع</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!form.name}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}