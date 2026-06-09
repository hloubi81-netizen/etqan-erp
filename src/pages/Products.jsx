import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import DataTable from "../components/shared/DataTable";
import ProductForm from "../components/products/ProductForm";
import ExcelImport from "../components/shared/ExcelImport";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GitBranch, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchFilter } from "@/hooks/useBranchFilter";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const { filterByBranch, getDefaultBranchValues, isAdmin } = useBranchFilter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [prods, grps, whs, brs] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.ProductGroup.list(),
      base44.entities.Warehouse.list(),
      base44.entities.Branch.list(),
    ]);
    setProducts(prods);
    setGroups(grps);
    setWarehouses(whs);
    setBranches(brs);
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

  async function handleBulkDelete() {
    if (confirm("هل أنت متأكد من حذف المواد المحددة؟")) {
      await Promise.all(selectedIds.map(id => base44.entities.Product.delete(id)));
      setSelectedIds([]);
      toast.success("تم الحذف الجماعي بنجاح");
      loadData();
    }
  }

  async function handleBulkUpdateBranch(branchId) {
    if (confirm("هل أنت متأكد من نقل المواد المحددة للفرع المختار؟")) {
      await Promise.all(selectedIds.map(id => base44.entities.Product.update(id, { branch_id: branchId })));
      setSelectedIds([]);
      toast.success("تم النقل بنجاح");
      loadData();
    }
  }

  // First apply branch security filter (non-admins see only their branch)
  const branchSecureProducts = filterByBranch(products);
  // Then apply manual branch dropdown filter (admins can additionally filter by branch)
  const filteredProducts = !isAdmin
    ? branchSecureProducts
    : branchFilter === "all"
      ? branchSecureProducts
      : branchSecureProducts.filter((p) => p.branch_id === branchFilter);

  const columns = [
    { key: "item_code", label: "رمز الصنف" },
    { key: "name", label: "اسم الصنف" },
    { key: "group_id", label: "المجموعة", render: (val) => getGroupName(val) },
    { key: "branch_name", label: "الفرع", render: (val) => val ? <Badge variant="outline" className="text-xs">{val}</Badge> : <span className="text-muted-foreground text-xs">كل الفروع</span> },
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">المواد والأصناف</h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة المنتجات والمواد مع التسعير والوحدات</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {isAdmin && branches.length > 0 && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-9 w-40 text-sm gap-1">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="كل الفروع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفروع</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ExcelImport
            entityName="Product"
            templateName="نموذج_استيراد_المنتجات.xlsx"
            onSuccess={loadData}
            columns={[
              { key: "item_code", label: "رمز الصنف", required: true },
              { key: "name", label: "اسم الصنف", required: true },
              { key: "origin", label: "المنشأ" },
              { key: "color", label: "اللون" },
              { key: "size", label: "القياس" },
              { key: "barcode", label: "الباركود" },
              { key: "cost_price", label: "سعر التكلفة", type: "number" },
              { key: "wholesale_price", label: "سعر الجملة", type: "number" },
              { key: "retail_price", label: "سعر المستهلك", type: "number" },
            ]}
          />
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            مادة جديدة
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg border border-border">
          <span className="text-sm font-semibold ml-2">تم تحديد {selectedIds.length} عنصر</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 ml-1.5" />
            حذف المحدد
          </Button>
          {isAdmin && branches.length > 0 && (
            <Select onValueChange={handleBulkUpdateBranch}>
              <SelectTrigger className="w-48 h-8 text-xs bg-background">
                <SelectValue placeholder="نقل إلى فرع..." />
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredProducts}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMessage="لا توجد مواد بعد"
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
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
          branches={branches}
        />
      )}
    </div>
  );
}