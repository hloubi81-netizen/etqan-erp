import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import ProductForm from "../components/products/ProductForm";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [prods, grps, whs] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.ProductGroup.list(),
      base44.entities.Warehouse.list(),
    ]);
    setProducts(prods);
    setGroups(grps);
    setWarehouses(whs);
    setLoading(false);
  }

  function getGroupName(groupId) {
    const group = groups.find((g) => g.id === groupId);
    return group ? group.name : "-";
  }

  function openNew() {
    setEditingProduct(null);
    setDialogOpen(true);
  }

  function openEdit(product) {
    setEditingProduct(product);
    setDialogOpen(true);
  }

  async function handleSave(data) {
    if (editingProduct) {
      await base44.entities.Product.update(editingProduct.id, data);
      toast.success("تم تحديث المادة");
    } else {
      await base44.entities.Product.create(data);
      toast.success("تم إضافة المادة");
    }
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(product) {
    if (confirm("هل أنت متأكد من حذف هذه المادة؟")) {
      await base44.entities.Product.delete(product.id);
      toast.success("تم حذف المادة");
      loadData();
    }
  }

  const columns = [
    { key: "item_code", label: "رمز الصنف" },
    { key: "name", label: "اسم الصنف" },
    { key: "group_id", label: "المجموعة", render: (val) => getGroupName(val) },
    { key: "origin", label: "المنشأ", render: (val) => val ? <Badge variant="secondary">{val}</Badge> : "-" },
    { key: "retail_price", label: "سعر المستهلك", render: (val) => val ? val.toLocaleString() : "-" },
    { key: "wholesale_price", label: "سعر الجملة", render: (val) => val ? val.toLocaleString() : "-" },
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
        title="المواد والأصناف"
        subtitle="إدارة المنتجات والمواد مع التسعير والوحدات"
        onAdd={openNew}
        addLabel="مادة جديدة"
      />

      <DataTable
        columns={columns}
        data={products}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage="لا توجد مواد بعد"
      />

      {dialogOpen && (
        <ProductForm
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          product={editingProduct}
          groups={groups}
          warehouses={warehouses}
          products={products}
        />
      )}
    </div>
  );
}