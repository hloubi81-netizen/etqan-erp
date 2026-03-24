import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams } from "react-router-dom";
import PageHeader from "../components/shared/PageHeader";
import InvoiceForm from "../components/invoices/InvoiceForm";
import DataTable from "../components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const TYPE_MAP = {
  sales: "مبيعات",
  purchases: "مشتريات",
  "sales-return": "مرتجع مبيعات",
  "purchases-return": "مرتجع مشتريات",
  "opening-balance": "رصيد أول المدة",
};

export default function Invoices() {
  const params = useParams();
  const invoiceType = TYPE_MAP[params.type] || "مبيعات";
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    loadData();
  }, [invoiceType]);

  async function loadData() {
    setLoading(true);
    const data = await base44.entities.Invoice.filter({ pattern_type: invoiceType }, "-created_date");
    setInvoices(data);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(inv) {
    setEditing(inv);
    setDialogOpen(true);
  }

  async function handleDelete(inv) {
    if (confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) {
      await base44.entities.Invoice.delete(inv.id);
      toast.success("تم حذف الفاتورة");
      loadData();
    }
  }

  async function handleSave(data) {
    if (editing) {
      await base44.entities.Invoice.update(editing.id, data);
      toast.success("تم تحديث الفاتورة");
    } else {
      await base44.entities.Invoice.create(data);
      toast.success("تم إنشاء الفاتورة");
    }
    setDialogOpen(false);
    loadData();
  }

  const columns = [
    { key: "invoice_number", label: "رقم الفاتورة" },
    { key: "date", label: "التاريخ" },
    { key: "client_name", label: invoiceType.includes("مبيعات") ? "العميل" : "المورد" },
    { key: "payment_method", label: "طريقة الدفع", render: (val) => val ? <Badge variant="outline">{val}</Badge> : "-" },
    { key: "total", label: "الإجمالي", render: (val) => val ? val.toLocaleString() : "0" },
    { key: "status", label: "الحالة", render: (val) => (
      <Badge variant={val === "مرحّلة" ? "default" : "secondary"}>{val || "مسودة"}</Badge>
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title={`فاتورة ${invoiceType}`}
        subtitle={`إدارة فواتير ${invoiceType}`}
        onAdd={openNew}
        addLabel="فاتورة جديدة"
      />
      <DataTable columns={columns} data={invoices} onEdit={openEdit} onDelete={handleDelete} emptyMessage="لا توجد فواتير" />
      
      {dialogOpen && (
        <InvoiceForm
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          invoice={editing}
          invoiceType={invoiceType}
        />
      )}
    </div>
  );
}