import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams } from "react-router-dom";
import PageHeader from "../components/shared/PageHeader";
import InvoiceForm from "../components/invoices/InvoiceForm";
import DataTable from "../components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { logActivity } from "@/utils/activityLogger";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle, Trash2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, ShieldCheck, Printer, Archive, ArchiveRestore } from "lucide-react";
import ArchiveButton from "@/components/shared/ArchiveButton";
import BulkActionsBar from "@/components/shared/BulkActionsBar";
import { exportToExcel } from "@/utils/exportUtils";
import PermissionGuard from "../components/shared/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSettings } from "@/hooks/useAppSettings.jsx";
import WhatsAppSendButton from "../components/invoices/WhatsAppSendButton";
import DocumentComments from "@/components/shared/DocumentComments";
import InvoiceApprovalBadge from "../components/invoices/InvoiceApprovalBadge";
import InvoiceApprovalDialog from "../components/invoices/InvoiceApprovalDialog";
import InvoicePrintTemplate from "../components/invoices/InvoicePrintTemplate";
import AdvancedSearchBar from "../components/shared/AdvancedSearchBar";
import { useMemo } from "react";

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
  const { canView, canCreate, canEdit, canDelete } = usePermissions();
  const { getSection } = useAppSettings();
  const [invoices, setInvoices] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patternPickerOpen, setPatternPickerOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [editing, setEditing] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);
  const [search, setSearch] = useState({ text: "", dateFrom: "", dateTo: "", client: "", invoiceNumber: "" });

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.is_archived) return false;
      const t = search.text?.toLowerCase();
      if (t && !inv.invoice_number?.toLowerCase().includes(t) &&
          !inv.client_name?.toLowerCase().includes(t) &&
          !inv.notes?.toLowerCase().includes(t)) return false;
      if (search.dateFrom && inv.date < search.dateFrom) return false;
      if (search.dateTo && inv.date > search.dateTo) return false;
      if (search.client && !inv.client_name?.toLowerCase().includes(search.client.toLowerCase())) return false;
      if (search.invoiceNumber && !inv.invoice_number?.toLowerCase().includes(search.invoiceNumber.toLowerCase())) return false;
      return true;
    });
  }, [invoices, search]);

  useEffect(() => {
    loadData();
  }, [invoiceType]);

  async function loadData() {
    setLoading(true);
    const [data, pats] = await Promise.all([
      base44.entities.Invoice.filter({ pattern_type: invoiceType }, "-created_date"),
      base44.entities.InvoicePattern.filter({ type: invoiceType }),
    ]);
    setInvoices(data);
    setPatterns(pats);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    if (patterns.length > 1) {
      setSelectedPattern(null);
      setPatternPickerOpen(true);
    } else {
      setSelectedPattern(patterns[0] || null);
      setDialogOpen(true);
    }
  }

  function openEdit(inv) {
    const pat = patterns.find(p => p.id === inv.pattern_id) || null;
    setSelectedPattern(pat);
    setEditing(inv);
    setDialogOpen(true);
  }

  async function handleDelete(inv) {
    if (confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) {
      await base44.entities.Invoice.delete(inv.id);
      await logActivity({ action: "حذف", documentType: "فاتورة", documentNumber: inv.invoice_number, documentSubtype: inv.pattern_type, documentId: inv.id, amount: inv.total, details: `حذف فاتورة ${inv.pattern_type} - ${inv.client_name || ""}` });
      toast.success("تم حذف الفاتورة");
      loadData();
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (confirm(`هل أنت متأكد من حذف ${selectedIds.length} فواتير؟`)) {
      await Promise.all(selectedIds.map(id => base44.entities.Invoice.delete(id)));
      toast.success("تم حذف الفواتير المحددة");
      setSelectedIds([]);
      loadData();
    }
  }

  async function handleBulkStatus(status) {
    if (selectedIds.length === 0) return;
    await Promise.all(selectedIds.map(id => base44.entities.Invoice.update(id, { status })));
    toast.success(`تم تغيير حالة الفواتير إلى ${status}`);
    setSelectedIds([]);
    loadData();
  }

  async function handleBulkArchive() {
    if (selectedIds.length === 0) return;
    const now = new Date().toISOString();
    await Promise.all(selectedIds.map(id => base44.entities.Invoice.update(id, { is_archived: true, archived_at: now })));
    toast.success(`تم أرشفة ${selectedIds.length} فاتورة`);
    setSelectedIds([]);
    loadData();
  }

  function handleExportSelected() {
    const selected = filteredInvoices.filter(inv => selectedIds.includes(inv.id));
    const excelColumns = [
      { key: "invoice_number", label: "رقم الفاتورة" },
      { key: "date", label: "التاريخ" },
      { key: "client_name", label: invoiceType.includes("مبيعات") ? "العميل" : "المورد" },
      { key: "warehouse_name", label: "المستودع" },
      { key: "payment_method", label: "طريقة الدفع" },
      { key: "subtotal", label: "المجموع الفرعي" },
      { key: "discount_value", label: "الخصم" },
      { key: "total", label: "الإجمالي" },
      { key: "paid_amount", label: "المدفوع" },
      { key: "remaining_amount", label: "المتبقي" },
      { key: "status", label: "الحالة" },
      { key: "notes", label: "البيان" },
    ];
    exportToExcel(excelColumns, selected, `فواتير_محددة_${invoiceType}`, invoiceType);
  }

  async function handleSave(data) {
    // Apply purchase settings: skip price update if disabled
    const purchaseSettings = getSection("purchases");
    if (invoiceType.includes("مشتريات") && !purchaseSettings.autoUpdateProductPrice) {
      data.skipPriceUpdate = true;
    }

    let savedId = data.id;
    if (editing) {
      await base44.entities.Invoice.update(editing.id, data);
      savedId = editing.id;
      const action = data.status === "مرحّلة" && editing.status !== "مرحّلة" ? "ترحيل" : "تعديل";
      await logActivity({ action, documentType: "فاتورة", documentNumber: data.invoice_number, documentSubtype: data.pattern_type, documentId: savedId, amount: data.total, details: `${action} فاتورة ${data.pattern_type} - ${data.client_name || ""}` });
      toast.success("تم تحديث الفاتورة");
    } else {
      const created = await base44.entities.Invoice.create(data);
      savedId = created?.id;
      const action = data.status === "مرحّلة" ? "ترحيل" : "إنشاء";
      await logActivity({ action, documentType: "فاتورة", documentNumber: data.invoice_number, documentSubtype: data.pattern_type, documentId: savedId, amount: data.total, details: `${action} فاتورة ${data.pattern_type} - ${data.client_name || ""}` });
      toast.success("تم إنشاء الفاتورة");
    }
    setDialogOpen(false);
    loadData();
  }

  function handleExportExcel() {
    const excelColumns = [
      { key: "invoice_number", label: "رقم الفاتورة" },
      { key: "date", label: "التاريخ" },
      { key: "pattern_name", label: "النمط" },
      { key: "client_name", label: invoiceType.includes("مبيعات") ? "العميل" : "المورد" },
      { key: "warehouse_name", label: "المستودع" },
      { key: "branch_name", label: "الفرع" },
      { key: "payment_method", label: "طريقة الدفع" },
      { key: "currency", label: "العملة" },
      { key: "subtotal", label: "المجموع الفرعي" },
      { key: "discount_value", label: "الخصم" },
      { key: "total", label: "الإجمالي" },
      { key: "paid_amount", label: "المدفوع" },
      { key: "remaining_amount", label: "المتبقي" },
      { key: "status", label: "الحالة" },
      { key: "notes", label: "البيان" },
    ];
    exportToExcel(excelColumns, invoices, `فواتير_${invoiceType}`, invoiceType);
  }

  const columns = [
    { key: "invoice_number", label: "رقم الفاتورة" },
    { key: "date", label: "التاريخ" },
    { key: "pattern_name", label: "النمط", render: (val) => val ? <Badge variant="outline">{val}</Badge> : "-" },
    { key: "client_name", label: invoiceType.includes("مبيعات") ? "العميل" : "المورد" },
    { key: "payment_method", label: "طريقة الدفع", render: (val) => val ? <Badge variant="outline">{val}</Badge> : "-" },
    { key: "total", label: "الإجمالي", render: (val) => val ? val.toLocaleString() : "0" },
    { key: "status", label: "الحالة", render: (val) => (
      <Badge variant={val === "مرحّلة" ? "default" : "secondary"}>{val || "مسودة"}</Badge>
    )},
    { key: "_print", label: "", render: (_, row) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1 text-blue-700 hover:bg-blue-50"
        onClick={(e) => { e.stopPropagation(); setPrintTarget(row); }}
      >
        <Printer className="h-3.5 w-3.5" />
        طباعة
      </Button>
    )},
    { key: "_whatsapp", label: "", render: (_, row) => (
      <WhatsAppSendButton invoice={row} phone={row.client_phone} size="sm" />
    )},
    { key: "_comments", label: "تعليقات", render: (_, row) => (
      <DocumentComments documentType="فاتورة" documentId={row.id} documentNumber={row.invoice_number} />
    )},
    { key: "_archive", label: "", render: (_, row) => (
      <ArchiveButton entity="Invoice" record={row} onDone={loadData} />
    )},
    { key: "_approval", label: "الاعتماد", render: (_, row) => (
      <div className="flex items-center gap-1.5">
        {row.approved_by
          ? <InvoiceApprovalBadge invoice={row} />
          : <span className="text-xs text-muted-foreground">—</span>
        }
        {(canEdit("invoices") || row.approved_by) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-emerald-700 hover:bg-emerald-50"
            onClick={(e) => { e.stopPropagation(); setApprovalTarget(row); }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {row.approved_by ? "إدارة" : "اعتماد"}
          </Button>
        )}
      </div>
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <PermissionGuard module="invoices">
    <div>
      <PageHeader
        title={`فاتورة ${invoiceType}`}
        subtitle={`إدارة فواتير ${invoiceType}`}
        onAdd={canCreate("invoices") ? openNew : null}
        addLabel="فاتورة جديدة"
      />
      
      <AdvancedSearchBar
        value={search}
        onChange={setSearch}
        placeholder="بحث بالرقم أو العميل أو البيان..."
        clientLabel={invoiceType.includes("مبيعات") ? "العميل" : "المورد"}
      />

      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 gap-1.5">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          تصدير Excel
        </Button>
      </div>

      <BulkActionsBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          { label: "ترحيل المحدد", icon: CheckCircle, onClick: () => handleBulkStatus("مرحّلة") },
          { label: "تحويل إلى مسودة", icon: CheckCircle, onClick: () => handleBulkStatus("مسودة") },
          { separator: true },
          { label: "تصدير المحدد (Excel)", icon: FileSpreadsheet, onClick: handleExportSelected },
          { separator: true },
          { label: "أرشفة المحدد", icon: Archive, onClick: handleBulkArchive },
          { separator: true },
          { label: "حذف المحدد", icon: Trash2, onClick: handleBulkDelete, destructive: true },
        ]}
      />

      <DataTable
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={columns}
        data={filteredInvoices}
        onEdit={canEdit("invoices") ? openEdit : null}
        onDelete={canDelete("invoices") ? handleDelete : null}
        emptyMessage="لا توجد فواتير تطابق البحث"
      />

      {/* Pattern Picker Dialog */}
      <Dialog open={patternPickerOpen} onOpenChange={setPatternPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>اختر نمط الفاتورة</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-2 block">النمط</Label>
            <Select onValueChange={(id) => setSelectedPattern(patterns.find(p => p.id === id) || null)}>
              <SelectTrigger><SelectValue placeholder="اختر النمط..." /></SelectTrigger>
              <SelectContent>
                {patterns.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPatternPickerOpen(false)}>إلغاء</Button>
            <Button disabled={!selectedPattern} onClick={() => { setPatternPickerOpen(false); setDialogOpen(true); }}>
              متابعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {dialogOpen && (
        <InvoiceForm
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          invoice={editing}
          invoiceType={invoiceType}
          pattern={selectedPattern}
        />
      )}

      {printTarget && (
        <InvoicePrintTemplate
          invoice={printTarget}
          open={!!printTarget}
          onClose={() => setPrintTarget(null)}
        />
      )}

      {approvalTarget && (
        <InvoiceApprovalDialog
          invoice={approvalTarget}
          open={!!approvalTarget}
          onClose={() => setApprovalTarget(null)}
          onDone={loadData}
        />
      )}
    </div>
    </PermissionGuard>
  );
}