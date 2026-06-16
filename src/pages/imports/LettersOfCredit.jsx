import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import LcOperationsDialog from "@/components/imports/LcOperationsDialog";
import {
  CreditCard, Plus, Search, Building2, Calendar, DollarSign,
  TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, FileText,
  ArrowRightLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_CONFIG = {
  "مفتوح": { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  "مستخدم جزئياً": { color: "bg-amber-100 text-amber-700 border-amber-200", icon: TrendingUp },
  "مستخدم كلياً": { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  "منتهي": { color: "bg-gray-100 text-gray-600 border-gray-200", icon: Calendar },
  "ملغي": { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

export default function LettersOfCredit() {
  const [lcs, setLcs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLc, setEditLc] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [opsLc, setOpsLc] = useState(null);
  const [opsOpen, setOpsOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [lcData, brs, accts, pos] = await Promise.all([
      base44.entities.LetterOfCredit.list("-created_date", 500),
      base44.entities.Branch.list().catch(() => []),
      base44.entities.Account.list("-created_date", 500).catch(() => []),
      base44.entities.PurchaseOrder.filter({}, "-created_date", 500).catch(() => []),
    ]);
    setLcs(lcData);
    setBranches(brs);
    setAccounts(accts || []);
    setPurchaseOrders(pos || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let result = lcs;
    const s = search.toLowerCase();
    if (s) {
      result = result.filter(lc =>
        lc.lc_number?.toLowerCase().includes(s) ||
        lc.bank_name?.toLowerCase().includes(s) ||
        lc.beneficiary_name?.toLowerCase().includes(s) ||
        lc.purpose?.toLowerCase().includes(s) ||
        lc.purchase_order_number?.toLowerCase().includes(s)
      );
    }
    if (filterStatus !== "all") result = result.filter(lc => lc.status === filterStatus);
    if (filterType !== "all") result = result.filter(lc => lc.lc_type === filterType);
    return result;
  }, [lcs, search, filterStatus, filterType]);

  const stats = useMemo(() => {
    const openLcs = lcs.filter(lc => lc.status === "مفتوح" || lc.status === "مستخدم جزئياً");
    return {
      total: lcs.length,
      openCount: openLcs.length,
      totalAmount: lcs.reduce((s, lc) => s + (lc.amount || 0), 0),
      usedAmount: lcs.reduce((s, lc) => s + (lc.used_amount || 0), 0),
      remainingAmount: lcs.reduce((s, lc) => s + (lc.remaining_amount || lc.amount - (lc.used_amount || 0)), 0),
    };
  }, [lcs]);

  function openCreate() {
    setEditLc(null);
    setDialogOpen(true);
  }

  function openEdit(lc) {
    setEditLc(lc);
    setDialogOpen(true);
  }

  function handleSave(formData) {
    if (editLc) {
      base44.entities.LetterOfCredit.update(editLc.id, formData);
      toast.success("تم تحديث الاعتماد");
    } else {
      base44.entities.LetterOfCredit.create(formData);
      toast.success("تم إنشاء الاعتماد");
    }
    setDialogOpen(false);
    loadData();
  }

  function handleDelete(lc) {
    base44.entities.LetterOfCredit.delete(lc.id);
    toast.success("تم حذف الاعتماد");
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            الاعتمادات المستندية
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة خطابات الضمان والاعتمادات البنكية للاستيراد والتصدير</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          اعتماد جديد
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-blue-700">الاعتمادات النشطة</p>
            </div>
            <p className="text-2xl font-bold text-blue-800">{stats.openCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <p className="text-xs text-green-700">إجمالي المبالغ</p>
            </div>
            <p className="text-lg font-bold text-green-800">{stats.totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-amber-700">المستخدم</p>
            </div>
            <p className="text-lg font-bold text-amber-800">{stats.usedAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-purple-600" />
              <p className="text-xs text-purple-700">المتبقي</p>
            </div>
            <p className="text-lg font-bold text-purple-800">{stats.remainingAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الاعتماد، البنك، المستفيد..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-8 h-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-10">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.keys(STATUS_CONFIG).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36 h-10">
            <SelectValue placeholder="النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="استيراد">استيراد</SelectItem>
            <SelectItem value="تصدير">تصدير</SelectItem>
          </SelectContent>
        </Select>
        {(search || filterStatus !== "all" || filterType !== "all") && (
          <Badge variant="secondary" className="h-10 px-3 text-sm">{filtered.length} نتيجة</Badge>
        )}
      </div>

      {/* LCs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-right p-3 font-semibold">رقم الاعتماد</th>
                  <th className="text-right p-3 font-semibold">التاريخ</th>
                  <th className="text-right p-3 font-semibold">تاريخ الانتهاء</th>
                  <th className="text-right p-3 font-semibold">البنك</th>
                  <th className="text-right p-3 font-semibold">المستفيد</th>
                  <th className="text-right p-3 font-semibold">أمر الشراء</th>
                  <th className="text-right p-3 font-semibold">النوع</th>
                  <th className="text-right p-3 font-semibold">المبلغ</th>
                  <th className="text-right p-3 font-semibold">المستخدم</th>
                  <th className="text-right p-3 font-semibold">المتبقي</th>
                  <th className="text-right p-3 font-semibold">الحالة</th>
                  <th className="text-center p-3 font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">لا توجد اعتمادات مستندية</p>
                      <p className="text-xs mt-1">اضغط على "اعتماد جديد" لإضافة اعتماد</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(lc => {
                    const StatusIcon = STATUS_CONFIG[lc.status]?.icon || Clock;
                    const remaining = lc.remaining_amount ?? (lc.amount || 0) - (lc.used_amount || 0);
                    const usedPercent = lc.amount > 0 ? ((lc.used_amount || 0) / lc.amount) * 100 : 0;
                    return (
                      <tr key={lc.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-medium font-mono">{lc.lc_number}</td>
                        <td className="p-3 text-muted-foreground">{lc.date ? new Date(lc.date).toLocaleDateString("ar-EG") : "-"}</td>
                        <td className="p-3">
                          <span className={cn(
                            lc.expiry_date && new Date(lc.expiry_date) < new Date() && lc.status !== "منتهي" ? "text-red-600 font-semibold" : "text-muted-foreground"
                          )}>
                            {lc.expiry_date ? new Date(lc.expiry_date).toLocaleDateString("ar-EG") : "-"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {lc.bank_name}
                          </div>
                        </td>
                        <td className="p-3">{lc.beneficiary_name}</td>
                        <td className="p-3">
                          {lc.purchase_order_number ? (
                            <Badge variant="outline" className="text-xs font-mono">{lc.purchase_order_number}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">{lc.lc_type}</Badge>
                        </td>
                        <td className="p-3 font-mono font-semibold">{lc.amount?.toLocaleString()}</td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <span className="font-mono text-amber-600">{lc.used_amount?.toLocaleString() || "0"}</span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(usedPercent, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-semibold text-green-600">{remaining.toLocaleString()}</td>
                        <td className="p-3">
                          <Badge className={cn("text-xs gap-1", STATUS_CONFIG[lc.status]?.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {lc.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setOpsLc(lc); setOpsOpen(true); }} title="سجل العمليات">
                              <ArrowRightLeft className="h-3.5 w-3.5 ml-1" />
                              عمليات
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(lc)}>تعديل</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleDelete(lc)}>حذف</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <LcDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        editLc={editLc}
        branches={branches}
        accounts={accounts}
        purchaseOrders={purchaseOrders}
      />

      <LcOperationsDialog
        open={opsOpen}
        onClose={() => { setOpsOpen(false); loadData(); }}
        lc={opsLc}
        onUpdated={loadData}
      />
    </div>
  );
}

function LcDialog({ open, onClose, onSave, editLc, branches, accounts, purchaseOrders }) {
  const [form, setForm] = useState({
    lc_number: "", date: new Date().toISOString().slice(0, 10), expiry_date: "",
    bank_name: "", bank_branch: "", beneficiary_name: "", beneficiary_account_id: "",
    amount: 0, currency: "ج.م", lc_type: "استيراد",
    status: "مفتوح", used_amount: 0,
    purchase_order_id: "", purchase_order_number: "",
    branch_id: "", branch_name: "", purpose: "", notes: "",
  });

  useEffect(() => {
    if (editLc) {
      setForm({
        lc_number: editLc.lc_number || "",
        date: editLc.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        expiry_date: editLc.expiry_date?.slice(0, 10) || "",
        bank_name: editLc.bank_name || "",
        bank_branch: editLc.bank_branch || "",
        beneficiary_name: editLc.beneficiary_name || "",
        beneficiary_account_id: editLc.beneficiary_account_id || "",
        amount: editLc.amount || 0,
        currency: editLc.currency || "ج.م",
        lc_type: editLc.lc_type || "استيراد",
        status: editLc.status || "مفتوح",
        used_amount: editLc.used_amount || 0,
        purchase_order_id: editLc.purchase_order_id || "",
        purchase_order_number: editLc.purchase_order_number || "",
        branch_id: editLc.branch_id || "",
        branch_name: editLc.branch_name || "",
        purpose: editLc.purpose || "",
        notes: editLc.notes || "",
      });
    } else {
      setForm({
        lc_number: `LC-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString().slice(0, 10), expiry_date: "",
        bank_name: "", bank_branch: "", beneficiary_name: "", beneficiary_account_id: "",
        amount: 0, currency: "ج.م", lc_type: "استيراد",
        status: "مفتوح", used_amount: 0,
        purchase_order_id: "", purchase_order_number: "",
        branch_id: "", branch_name: "", purpose: "", notes: "",
      });
    }
  }, [editLc, open]);

  function update(field, value) { setForm(prev => ({ ...prev, [field]: value })); }

  function handleSubmit() {
    const remaining = (form.amount || 0) - (form.used_amount || 0);
    onSave({ ...form, remaining_amount: remaining });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {editLc ? "تعديل الاعتماد المستندي" : "اعتماد مستندي جديد"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto px-1">
          <div className="col-span-2 sm:col-span-1">
            <Label>رقم الاعتماد</Label>
            <Input value={form.lc_number} onChange={e => update("lc_number", e.target.value)} className="h-9" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>النوع</Label>
            <Select value={form.lc_type} onValueChange={v => update("lc_type", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="استيراد">استيراد</SelectItem>
                <SelectItem value="تصدير">تصدير</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>تاريخ الفتح</Label>
            <Input type="date" value={form.date} onChange={e => update("date", e.target.value)} className="h-9" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>تاريخ الانتهاء</Label>
            <Input type="date" value={form.expiry_date} onChange={e => update("expiry_date", e.target.value)} className="h-9" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>اسم البنك</Label>
            <Input value={form.bank_name} onChange={e => update("bank_name", e.target.value)} className="h-9" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>فرع البنك</Label>
            <Input value={form.bank_branch} onChange={e => update("bank_branch", e.target.value)} className="h-9" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>المستفيد / المورد</Label>
            <Input value={form.beneficiary_name} onChange={e => update("beneficiary_name", e.target.value)} className="h-9" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>حساب المستفيد</Label>
            <Select value={form.beneficiary_account_id || ""} onValueChange={v => update("beneficiary_account_id", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
              <SelectContent>
                {accounts.filter(a => !a.is_parent).map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>أمر الشراء المرتبط</Label>
            <Select value={form.purchase_order_id || ""} onValueChange={v => {
              const po = purchaseOrders.find(p => p.id === v);
              update("purchase_order_id", v);
              update("purchase_order_number", po?.order_number || "");
              if (po) {
                update("beneficiary_name", po.client_name || "");
                update("purpose", `مرتبط بأمر الشراء ${po.order_number}`);
              }
            }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="اختر أمر شراء (اختياري)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>بدون أمر شراء</SelectItem>
                {purchaseOrders.map(po => (
                  <SelectItem key={po.id} value={po.id}>{po.order_number} - {po.client_name || ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>العملة</Label>
            <Input value={form.currency} onChange={e => update("currency", e.target.value)} className="h-9" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>المبلغ</Label>
            <Input type="number" value={form.amount || ""} onChange={e => update("amount", parseFloat(e.target.value) || 0)} className="h-9" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>المبلغ المستخدم</Label>
            <Input type="number" value={form.used_amount || ""} onChange={e => update("used_amount", parseFloat(e.target.value) || 0)} className="h-9" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>الحالة</Label>
            <Select value={form.status} onValueChange={v => update("status", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(STATUS_CONFIG).map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label>الفرع</Label>
            <Select value={form.branch_id || ""} onValueChange={v => {
              const br = branches.find(b => b.id === v);
              update("branch_id", v);
              update("branch_name", br?.name || "");
            }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
              <SelectContent>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>الغرض من الاعتماد</Label>
            <Input value={form.purpose} onChange={e => update("purpose", e.target.value)} className="h-9" />
          </div>
          <div className="col-span-2">
            <Label>ملاحظات</Label>
            <Input value={form.notes} onChange={e => update("notes", e.target.value)} className="h-9" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit}>{editLc ? "حفظ التعديلات" : "إنشاء الاعتماد"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}