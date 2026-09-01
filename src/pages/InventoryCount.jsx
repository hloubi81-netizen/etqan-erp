import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import InventoryCountForm from "@/components/inventory/InventoryCountForm";
import DocumentComments from "@/components/shared/DocumentComments";

export default function InventoryCount() {
  const [counts, setCounts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [c, w, p] = await Promise.all([
      base44.entities.InventoryCount.list("-created_date", 200),
      base44.entities.Warehouse.list("name", 200),
      base44.entities.Product.list("name", 500),
    ]);
    setCounts(c);
    setWarehouses((w || []).filter(x => x.id));
    setProducts((p || []).filter(x => x.id));
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function handleDelete(item) {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await base44.entities.InventoryCount.delete(item.id);
      toast.success("تم الحذف");
      loadData();
    }
  }

  const columns = [
    { key: "count_number", label: "الرقم", render: v => <span className="font-mono font-bold">{v}</span> },
    { key: "date", label: "التاريخ" },
    { key: "warehouse_name", label: "المستودع" },
    { key: "type", label: "النوع", render: v => <Badge variant="outline">{v}</Badge> },
    {
      key: "items", label: "الأصناف",
      render: v => <span className="text-sm font-medium">{(v || []).length} صنف</span>
    },
    {
      key: "items", label: "حالة الجرد",
      render: (v) => {
        const items = v || [];
        const surplus = items.filter(i => (i.actual_quantity || 0) > (i.book_quantity || 0)).length;
        const deficit = items.filter(i => (i.actual_quantity || 0) < (i.book_quantity || 0)).length;
        return (
          <div className="flex gap-1">
            {surplus > 0 && <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">فائض {surplus}</Badge>}
            {deficit > 0 && <Badge className="bg-red-100 text-red-700 border-0 text-xs">عجز {deficit}</Badge>}
            {surplus === 0 && deficit === 0 && items.length > 0 && <Badge className="bg-green-100 text-green-700 border-0 text-xs">مطابق</Badge>}
          </div>
        );
      }
    },
    { key: "status", label: "الحالة", render: v => <Badge variant={v === "معتمد" ? "default" : "secondary"}>{v}</Badge> },
    { key: "_comments", label: "تعليقات", render: (_, row) => (
      <DocumentComments documentType="جرد" documentId={row.id} documentNumber={row.count_number} />
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="جرد المواد" subtitle="محاضر الجرد الميداني والتسويات الجردية" onAdd={openNew} addLabel="جرد جديد" />
      <DataTable
        columns={columns}
        data={counts}
        onEdit={c => { setEditing(c); setDialogOpen(true); }}
        onDelete={handleDelete}
        emptyMessage="لا توجد محاضر جرد"
      />

      {dialogOpen && (
        <InventoryCountForm
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditing(null); }}
          onSaved={loadData}
          editing={editing}
          warehouses={warehouses}
          products={products}
          countsLength={counts.length}
        />
      )}
    </div>
  );
}