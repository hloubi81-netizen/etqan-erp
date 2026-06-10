import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PermissionGuard from "../components/shared/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { useParams } from "react-router-dom";
import PageHeader from "../components/shared/PageHeader";
import VoucherForm from "../components/vouchers/VoucherForm";
import DataTable from "../components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { logActivity } from "@/utils/activityLogger";
import AdvancedSearchBar from "../components/shared/AdvancedSearchBar";
import ArchiveButton from "@/components/shared/ArchiveButton";
import BulkActionsBar from "@/components/shared/BulkActionsBar";
import { exportToExcel } from "@/utils/exportUtils";
import { CheckCircle, Trash2, FileSpreadsheet, Archive, ShieldCheck } from "lucide-react";
import VoucherApprovalDialog from "@/components/vouchers/VoucherApprovalDialog";
import { Button } from "@/components/ui/button";

const TYPE_MAP = {
  receipt: "سند قبض",
  payment: "سند دفع",
  daily: "سند يومية",
  journal: "سند قيد",
  opening: "سند قيد افتتاحي",
};

export default function Vouchers() {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const params = useParams();
  const voucherType = TYPE_MAP[params.type] || "سند قبض";
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [search, setSearch] = useState({ text: "", dateFrom: "", dateTo: "", client: "", invoiceNumber: "" });

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (v.is_archived) return false;
      const t = search.text?.toLowerCase();
      if (t && !v.voucher_number?.toLowerCase().includes(t) &&
          !v.account_name?.toLowerCase().includes(t) &&
          !v.description?.toLowerCase().includes(t)) return false;
      if (search.dateFrom && v.date < search.dateFrom) return false;
      if (search.dateTo && v.date > search.dateTo) return false;
      if (search.client && !v.account_name?.toLowerCase().includes(search.client.toLowerCase())) return false;
      if (search.invoiceNumber && !v.voucher_number?.toLowerCase().includes(search.invoiceNumber.toLowerCase())) return false;
      return true;
    });
  }, [vouchers, search]);

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

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (confirm(`هل أنت متأكد من حذف ${selectedIds.length} سندات؟`)) {
      await Promise.all(selectedIds.map(id => base44.entities.Voucher.delete(id)));
      toast.success(`تم حذف ${selectedIds.length} سند`);
      setSelectedIds([]);
      loadData();
    }
  }

  async function handleBulkArchive() {
    if (selectedIds.length === 0) return;
    const now = new Date().toISOString();
    await Promise.all(selectedIds.map(id => base44.entities.Voucher.update(id, { is_archived: true, archived_at: now })));
    toast.success(`تم أرشفة ${selectedIds.length} سند`);
    setSelectedIds([]);
    loadData();
  }

  async function handleBulkStatus(status) {
    if (selectedIds.length === 0) return;
    await Promise.all(selectedIds.map(id => base44.entities.Voucher.update(id, { status })));
    toast.success(`تم تغيير الحالة إلى ${status}`);
    setSelectedIds([]);
    loadData();
  }

  function handleExportSelected() {
    const selected = filteredVouchers.filter(v => selectedIds.includes(v.id));
    const cols = isJournal
      ? [
          { key: "voucher_number", label: "رقم السند" },
          { key: "date", label: "التاريخ" },
          { key: "total_debit", label: "إجمالي المدين" },
          { key: "total_credit", label: "إجمالي الدائن" },
          { key: "status", label: "الحالة" },
        ]
      : [
          { key: "voucher_number", label: "رقم السند" },
          { key: "date", label: "التاريخ" },
          { key: "account_name", label: "الحساب" },
          { key: "counter_account_name", label: "الحساب المقابل" },
          { key: "amount", label: "المبلغ" },
          { key: "status", label: "الحالة" },
        ];
    exportToExcel(cols, selected, `سندات_محددة_${voucherType}`, voucherType);
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
  const bulkActions = [
    { label: "ترحيل المحدد", icon: CheckCircle, onClick: () => handleBulkStatus("مرحّل") },
    { label: "تحويل إلى مسودة", icon: CheckCircle, onClick: () => handleBulkStatus("مسودة") },
    { separator: true },
    { label: "تصدير المحدد (Excel)", icon: FileSpreadsheet, onClick: handleExportSelected },
    { separator: true },
    { label: "أرشفة المحدد", icon: Archive, onClick: handleBulkArchive },
    { separator: true },
    { label: "حذف المحدد", icon: Trash2, onClick: handleBulkDelete, destructive: true },
  ];
  
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
    { key: "_archive", label: "", render: (_, row) => (
      <ArchiveButton entity="Voucher" record={row} onDone={loadData} />
    )},
    { key: "_approval", label: "الاعتماد", render: (_, row) => (
      <div className="flex items-center gap-1.5">
        {row.approved_by ? (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />{row.approved_by}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 text-emerald-700 hover:bg-emerald-50"
          onClick={(e) => { e.stopPropagation(); setApprovalTarget(row); }}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {row.approved_by ? "إدارة" : "اعتماد"}
        </Button>
      </div>
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <PermissionGuard module="vouchers">
    <div>
      <PageHeader title={voucherType} subtitle={`إدارة ${voucherType}`} onAdd={canCreate("vouchers") ? openNew : null} addLabel={`${voucherType} جديد`} />
      <AdvancedSearchBar
        value={search}
        onChange={setSearch}
        placeholder="بحث بالرقم أو الحساب أو الوصف..."
        clientLabel="الحساب"
        showInvoice={true}
      />
      <BulkActionsBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={bulkActions}
      />
      <DataTable
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={columns}
        data={filteredVouchers}
        onEdit={canEdit("vouchers") ? openEdit : null}
        onDelete={canDelete("vouchers") ? handleDelete : null}
        emptyMessage="لا توجد سندات تطابق البحث"
      />
      
      {dialogOpen && (
        <VoucherForm
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          voucher={editing}
          voucherType={voucherType}
        />
      )}

      {approvalTarget && (
        <VoucherApprovalDialog
          voucher={approvalTarget}
          open={!!approvalTarget}
          onClose={() => setApprovalTarget(null)}
          onDone={loadData}
        />
      )}
    </div>
    </PermissionGuard>
  );
}