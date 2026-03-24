import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form, setForm] = useState({ name: "", serial_number: "", parent_group_id: "" });

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    const data = await base44.entities.ProductGroup.list();
    setGroups(data);
    setLoading(false);
  }

  function openNew() {
    const maxSerial = groups.reduce((max, g) => {
      const num = parseInt(g.serial_number) || 0;
      return num > max ? num : max;
    }, 0);
    setEditingGroup(null);
    setForm({ name: "", serial_number: String(maxSerial + 1), parent_group_id: "" });
    setDialogOpen(true);
  }

  function openEdit(group) {
    setEditingGroup(group);
    setForm({
      name: group.name,
      serial_number: group.serial_number,
      parent_group_id: group.parent_group_id || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = { ...form };
    if (!payload.parent_group_id) delete payload.parent_group_id;
    
    if (editingGroup) {
      await base44.entities.ProductGroup.update(editingGroup.id, payload);
      toast.success("تم تحديث المجموعة");
    } else {
      await base44.entities.ProductGroup.create(payload);
      toast.success("تم إضافة المجموعة");
    }
    setDialogOpen(false);
    loadGroups();
  }

  async function handleDelete(group) {
    if (confirm("هل أنت متأكد من حذف هذه المجموعة؟")) {
      await base44.entities.ProductGroup.delete(group.id);
      toast.success("تم حذف المجموعة");
      loadGroups();
    }
  }

  function getParentName(parentId) {
    const parent = groups.find((g) => g.id === parentId);
    return parent ? parent.name : "رئيسية";
  }

  const columns = [
    { key: "serial_number", label: "الرقم التسلسلي" },
    { key: "name", label: "اسم المجموعة" },
    {
      key: "parent_group_id",
      label: "المجموعة الرئيسية",
      render: (val) => (val ? getParentName(val) : "رئيسية"),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="المجموعات"
        subtitle="إدارة مجموعات المواد والمنتجات"
        onAdd={openNew}
        addLabel="مجموعة جديدة"
      />

      <DataTable
        columns={columns}
        data={groups}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage="لا توجد مجموعات بعد"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "تعديل المجموعة" : "مجموعة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم المجموعة</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="أدخل اسم المجموعة"
              />
            </div>
            <div>
              <Label>الرقم التسلسلي</Label>
              <Input
                value={form.serial_number}
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                placeholder="الرقم التسلسلي"
              />
            </div>
            <div>
              <Label>المجموعة الرئيسية (اختياري)</Label>
              <Select
                value={form.parent_group_id}
                onValueChange={(val) => setForm({ ...form, parent_group_id: val === "none" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="بدون (مجموعة رئيسية)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون (مجموعة رئيسية)</SelectItem>
                  {groups
                    .filter((g) => g.id !== editingGroup?.id)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
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