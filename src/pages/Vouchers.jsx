import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams } from "react-router-dom";
import PageHeader from "../components/shared/PageHeader";
import VoucherForm from "../components/vouchers/VoucherForm";
import DataTable from "../components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { logActivity } from "@/utils/activityLogger";

const TYPE_MAP = {
  receipt: "سند قبض",
  payment: "سند دفع",
  daily: "سند يومية",
  journal: "سند قيد",
  opening: "سند قيد افتتاحي",
};

export default function Vouchers() {
  const params = useParams();
  const voucherType = TYPE_MAP[params.type] || "سند قبض";
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { loadData(); }, [voucherType]);

  async function loadData() {
    setLoading(true);
    const data = await base44.entities.Voucher.filter({ type: voucherType }, "-created_date");
    setVouchers(data);
    setLoading(false);
  }

  function openNew() { setEditing(null); setDialogOpen(true); }
  function openEdit(v) { setEditing(v); setDialogOpen(true); }

  async function handleDelete(v) {
    if (confirm("هل أنت متأكد؟")) {
      await base44.entities.Voucher.delete(v.id);
      await logActivity({ action: "حذف", documentType: "سند", documentNumber: v.voucher_number, documentSubtype: voucherType, documentId: v.id, amount: v.amount || v.total_debit, details: `حذف ${voucherType} ${v.voucher_number}` });
      toast.success("تم الحذف");
      loadData();
    }
  }

  async function handleSave(data) {
    if (editing) {
      await base44.entities.Voucher.update(editing.id, data);
      const action = data.status === "مرحّل" && editing.status !== "مرحّل" ? "ترحيل" : "تعديل";
      await logActivity({ action, documentType: "سند", documentNumber: data.voucher_number, documentSubtype: voucherType, documentId: editing.id, amount: data.amount || data.total_debit, details: `${action} ${voucherType} ${data.voucher_number}` });
      toast.success("تم التحديث");
    } else {
      const created = await base44.entities.Voucher.create(data);
      const action = data.status === "مرحّل" ? "ترحيل" : "إنشاء";
      await logActivity({ action, documentType: "سند", documentNumber: data.voucher_number, documentSubtype: voucherType, documentId: created?.id, amount: data.amount || data.total_debit, details: `${action} ${voucherType} ${data.voucher_number}` });
      toast.success("تم الإنشاء");
    }
    setDialogOpen(false);
    loadData();
  }

  const isJournal = voucherType === "سند قيد" || voucherType === "سند قيد افتتاحي" || voucherType === "سند يومية";
  
  const columns = [
    { key: "voucher_number", label: "رقم السند" },
    { key: "date", label: "التاريخ" },
    ...(isJournal ? [
      { key: "total_debit", label: "إجمالي المدين", render: (v) => (v || 0).toLocaleString() },
      { key: "total_credit", label: "إجمالي الدائن", render: (v) => (v || 0).toLocaleString() },
    ] : [
      { key: "account_name", label: "الحساب" },
      { key: "counter_account_name", label: "الحساب المقابل" },
      { key: "amount", label: "المبلغ", render: (v) => (v || 0).toLocaleString() },
    ]),
    { key: "status", label: "الحالة", render: (v) => <Badge variant={v === "مرحّل" ? "default" : "secondary"}>{v || "مسودة"}</Badge> },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title={voucherType} subtitle={`إدارة ${voucherType}`} onAdd={openNew} addLabel={`${voucherType} جديد`} />
      <DataTable columns={columns} data={vouchers} onEdit={openEdit} onDelete={handleDelete} emptyMessage="لا توجد سندات" />
      
      {dialogOpen && (
        <VoucherForm
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          voucher={editing}
          voucherType={voucherType}
        />
      )}
    </div>
  );
}