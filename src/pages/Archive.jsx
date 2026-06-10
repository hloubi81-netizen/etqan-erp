import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive as ArchiveIcon, ArchiveRestore, Search, Trash2, FileText, Receipt } from "lucide-react";
import { toast } from "sonner";
import ArchiveButton from "@/components/shared/ArchiveButton";
import PermissionGuard from "@/components/shared/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";

export default function Archive() {
  const { canDelete } = usePermissions();
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [invs, vchs] = await Promise.all([
      base44.entities.Invoice.filter({ is_archived: true }, "-archived_at"),
      base44.entities.Voucher.filter({ is_archived: true }, "-archived_at"),
    ]);
    setInvoices(invs);
    setVouchers(vchs);
    setLoading(false);
  }

  const filteredInvoices = useMemo(() => {
    const t = search.toLowerCase();
    if (!t) return invoices;
    return invoices.filter(inv =>
      inv.invoice_number?.toLowerCase().includes(t) ||
      inv.client_name?.toLowerCase().includes(t) ||
      inv.pattern_type?.toLowerCase().includes(t)
    );
  }, [invoices, search]);

  const filteredVouchers = useMemo(() => {
    const t = search.toLowerCase();
    if (!t) return vouchers;
    return vouchers.filter(v =>
      v.voucher_number?.toLowerCase().includes(t) ||
      v.account_name?.toLowerCase().includes(t) ||
      v.type?.toLowerCase().includes(t)
    );
  }, [vouchers, search]);

  async function handleDeleteInvoice(inv) {
    if (confirm("هل تريد حذف هذه الفاتورة نهائياً من الأرشيف؟")) {
      await base44.entities.Invoice.delete(inv.id);
      toast.success("تم الحذف النهائي");
      loadData();
    }
  }

  async function handleDeleteVoucher(v) {
    if (confirm("هل تريد حذف هذا السند نهائياً من الأرشيف؟")) {
      await base44.entities.Voucher.delete(v.id);
      toast.success("تم الحذف النهائي");
      loadData();
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <PermissionGuard module="invoices">
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <ArchiveIcon className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">أرشيف المستندات</h1>
            <p className="text-sm text-muted-foreground">
              {invoices.length + vouchers.length} مستند مؤرشف — يمكنك استعادتها أو حذفها نهائياً
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pr-9"
          placeholder="ابحث في الأرشيف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="mb-4">
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            الفواتير
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">{filteredInvoices.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="vouchers" className="gap-2">
            <Receipt className="h-4 w-4" />
            السندات
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">{filteredVouchers.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          {filteredInvoices.length === 0 ? (
            <EmptyState text="لا توجد فواتير مؤرشفة" />
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">رقم الفاتورة</th>
                    <th className="text-right px-4 py-3 font-medium">النوع</th>
                    <th className="text-right px-4 py-3 font-medium">العميل/المورد</th>
                    <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                    <th className="text-right px-4 py-3 font-medium">الإجمالي</th>
                    <th className="text-right px-4 py-3 font-medium">الحالة</th>
                    <th className="text-right px-4 py-3 font-medium">أُرشف في</th>
                    <th className="text-right px-4 py-3 font-medium">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{inv.pattern_type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.client_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.date}</td>
                      <td className="px-4 py-3 font-medium">{(inv.total || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant={inv.status === "مرحّلة" ? "default" : "secondary"} className="text-xs">
                          {inv.status || "مسودة"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {inv.archived_at ? new Date(inv.archived_at).toLocaleDateString("ar-EG") : "—"}
                        {inv.archived_by && <div className="text-[10px]">{inv.archived_by}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <ArchiveButton entity="Invoice" record={inv} onDone={loadData} />
                          {canDelete("invoices") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 gap-1"
                              onClick={() => handleDeleteInvoice(inv)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              حذف
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Vouchers Tab */}
        <TabsContent value="vouchers">
          {filteredVouchers.length === 0 ? (
            <EmptyState text="لا توجد سندات مؤرشفة" />
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">رقم السند</th>
                    <th className="text-right px-4 py-3 font-medium">النوع</th>
                    <th className="text-right px-4 py-3 font-medium">الحساب</th>
                    <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                    <th className="text-right px-4 py-3 font-medium">المبلغ</th>
                    <th className="text-right px-4 py-3 font-medium">الحالة</th>
                    <th className="text-right px-4 py-3 font-medium">أُرشف في</th>
                    <th className="text-right px-4 py-3 font-medium">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredVouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{v.voucher_number}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{v.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{v.account_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.date}</td>
                      <td className="px-4 py-3 font-medium">{(v.amount || v.total_debit || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant={v.status === "مرحّل" ? "default" : "secondary"} className="text-xs">
                          {v.status || "مسودة"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {v.archived_at ? new Date(v.archived_at).toLocaleDateString("ar-EG") : "—"}
                        {v.archived_by && <div className="text-[10px]">{v.archived_by}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <ArchiveButton entity="Voucher" record={v} onDone={loadData} />
                          {canDelete("vouchers") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 gap-1"
                              onClick={() => handleDeleteVoucher(v)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              حذف
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </PermissionGuard>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <ArchiveIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
      <p>{text}</p>
    </div>
  );
}