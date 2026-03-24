import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CostCenters() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", parent_id: "", notes: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await base44.entities.CostCenter.list();
    setCenters(data);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: "", code: "", parent_id: "", notes: "" });
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ name: item.name, code: item.code || "", parent_id: item.parent_id || "", notes: item.notes || "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = { ...form };
    if (!payload.parent_id) delete payload.parent_id;
    if (editing) {
      await base44.entities.CostCenter.update(editing.id, payload);
      toast.success("تم التحديث");
    } else {
      await base44.entities.CostCenter.create(payload);
      toast.success("تم الإضافة");
    }
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(item) {
    if (confirm("هل أنت متأكد؟")) {
      await base44.entities.CostCenter.delete(item.id);
      toast.success("تم الحذف");
      loadData();
    }
  }

  const columns = [
    { key: "code", label: "الرمز" },
    { key: "name", label: "اسم مركز الكلفة" },
    { key: "parent_id", label: "المركز الرئيسي", render: (val) => {
      const parent = centers.find((c) => c.id === val);
      return parent ? parent.name : "رئيسي";
    }},
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="مراكز الكلفة" subtitle="إدارة مراكز الكلفة والتكاليف" onAdd={openNew} addLabel="مركز كلفة جديد" />
      <DataTable columns={columns} data={centers} onEdit={openEdit} onDelete={handleDelete} emptyMessage="لا توجد مراكز كلفة" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل مركز الكلفة" : "مركز كلفة جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم مركز الكلفة</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>الرمز</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div>
              <Label>المركز الرئيسي (اختياري)</Label>
              <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="بدون (مركز رئيسي)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون (مركز رئيسي)</SelectItem>
                  {centers.filter((c) => c.id !== editing?.id).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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