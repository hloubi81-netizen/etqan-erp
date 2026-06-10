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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ChevronDown, Trash2, CheckCircle, FileSpreadsheet } from "lucide-react";
import { exportToExcel } from "@/utils/exportUtils";
import PermissionGuard from "../components/shared/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import WhatsAppSendButton from "../components/invoices/WhatsAppSendButton";
import DocumentComments from "@/components/shared/DocumentComments";

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
  const [invoices, setInvoices] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patternPickerOpen, setPatternPickerOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [editing, setEditing] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

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

  async function handleSave(data) {
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
    { key: "_whatsapp", label: "", render: (_, row) => (
      <WhatsAppSendButton invoice={row} phone={row.client_phone} size="sm" />
    )},
    { key: "_comments", label: "تعليقات", render: (_, row) => (
      <DocumentComments documentType="فاتورة" documentId={row.id} documentNumber={row.invoice_number} />
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
      
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 gap-1.5">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          تصدير Excel
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-1">
                إجراءات جماعية ({selectedIds.length})
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleBulkStatus("مرحّلة")}>
                <CheckCircle className="mr-2 h-4 w-4" />
                ترحيل المحدد
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatus("مسودة")}>
                <CheckCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                تغيير إلى مسودة
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                حذف المحدد
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <DataTable
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={columns}
        data={invoices}
        onEdit={canEdit("invoices") ? openEdit : null}
        onDelete={canDelete("invoices") ? handleDelete : null}
        emptyMessage="لا توجد فواتير"
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
    </div>
    </PermissionGuard>
  );
}