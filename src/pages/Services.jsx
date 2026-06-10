import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ProductForm from "../components/products/ProductForm";
import {
  Wrench, Plus, Clock, User, Tag, DollarSign, Edit2, Trash2
} from "lucide-react";
import AdvancedSearchBar from "../components/shared/AdvancedSearchBar";

export default function Services() {
  const [services, setServices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ text: "", dateFrom: "", dateTo: "", client: "", invoiceNumber: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [allProds, grps, whs, brs] = await Promise.all([
      base44.entities.Product.list(),
      base44.entities.ProductGroup.list(),
      base44.entities.Warehouse.list(),
      base44.entities.Branch.list(),
    ]);
    setServices(allProds.filter((p) => p.is_service));
    setProducts(allProds);
    setGroups(grps);
    setWarehouses(whs);
    setBranches(brs);
    setLoading(false);
  }

  async function handleSave(data) {
    // نضمن دائماً أن الصنف المحفوظ هنا هو خدمة
    const saveData = { ...data, is_service: true };
    if (editingService) {
      await base44.entities.Product.update(editingService.id, saveData);
      toast.success("تم تحديث الخدمة");
    } else {
      await base44.entities.Product.create(saveData);
      toast.success("تم إضافة الخدمة");
    }
    setDialogOpen(false);
    setEditingService(null);
    loadData();
  }

  async function handleDelete(service) {
    if (!confirm("هل أنت متأكد من حذف هذه الخدمة؟")) return;
    await base44.entities.Product.delete(service.id);
    toast.success("تم حذف الخدمة");
    loadData();
  }

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const t = search.text?.toLowerCase();
      if (t && !s.name?.toLowerCase().includes(t) &&
          !s.item_code?.toLowerCase().includes(t) &&
          !s.service_provider?.toLowerCase().includes(t)) return false;
      if (search.client && !s.service_provider?.toLowerCase().includes(search.client.toLowerCase())) return false;
      if (search.invoiceNumber && !s.item_code?.toLowerCase().includes(search.invoiceNumber.toLowerCase())) return false;
      return true;
    });
  }, [services, search]);

  function openNew() {
    setEditingService(null);
    setDialogOpen(true);
  }

  function openEdit(service) {
    setEditingService(service);
    setDialogOpen(true);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            الخدمات
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة الخدمات المقدمة — لا تؤثر على أرصدة المستودعات
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {services.length} خدمة
          </Badge>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            خدمة جديدة
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-sm">
        <Wrench className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-blue-700">
          الخدمات المدرجة هنا يمكن إضافتها لفواتير البيع والشراء دون أي تأثير على أرصدة المخزون. يمكن ربطها بحسابات محاسبية محددة لتوليد القيود تلقائياً عند الترحيل.
        </p>
      </div>

      {/* Search */}
      <AdvancedSearchBar
        value={search}
        onChange={setSearch}
        placeholder="ابحث بالاسم أو الرمز أو المزود..."
        clientLabel="المزود / المنفذ"
        showInvoice={true}
      />

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Wrench className="h-12 w-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium text-base">
            {search.text || search.client || search.invoiceNumber ? "لا توجد خدمات تطابق البحث" : "لا توجد خدمات بعد"}
          </p>
          {!search.text && !search.client && !search.invoiceNumber && (
            <Button onClick={openNew} className="mt-4 gap-2" variant="outline">
              <Plus className="h-4 w-4" /> إضافة أول خدمة
            </Button>
          )}
        </div>
      )}

      {/* Services Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      {dialogOpen && (
        <ProductForm
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditingService(null); }}
          onSave={handleSave}
          product={editingService ? { ...editingService, is_service: true } : { is_service: true }}
          groups={groups}
          warehouses={warehouses}
          products={products}
          branches={branches}
          defaultTab="service"
        />
      )}
    </div>
  );
}

function ServiceCard({ service, onEdit, onDelete }) {
  return (
    <Card className="hover:shadow-md transition-shadow border-border group">
      <CardContent className="p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{service.name}</p>
            {service.item_code && (
              <p className="text-xs text-muted-foreground mt-0.5">{service.item_code}</p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => onEdit(service)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(service)}
              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Badge خدمة */}
        <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200 border">
          <Wrench className="h-3 w-3 ml-1" /> خدمة
        </Badge>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {service.retail_price != null && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-green-600 shrink-0" />
              <span>سعر البيع: <span className="font-semibold text-foreground">{service.retail_price.toLocaleString()}</span></span>
            </div>
          )}
          {service.cost_price != null && (
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <span>سعر التكلفة: <span className="font-semibold text-foreground">{service.cost_price.toLocaleString()}</span></span>
            </div>
          )}
          {service.service_duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>{service.service_duration} {service.service_unit || "دقيقة"}</span>
            </div>
          )}
          {service.service_provider && (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{service.service_provider}</span>
            </div>
          )}
        </div>

        {/* Accounts */}
        {(service.service_revenue_account_name || service.service_cost_account_name) && (
          <div className="border-t pt-2 space-y-1 text-xs">
            {service.service_revenue_account_name && (
              <div className="flex items-center gap-1 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <span className="truncate">إيرادات: {service.service_revenue_account_name}</span>
              </div>
            )}
            {service.service_cost_account_name && (
              <div className="flex items-center gap-1 text-red-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="truncate">تكلفة: {service.service_cost_account_name}</span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {service.service_description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 border-t pt-2">
            {service.service_description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}