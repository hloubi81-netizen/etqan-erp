import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { defaultChartOfAccounts } from "../utils/defaultAccounts";
import PageHeader from "../components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronLeft, Pencil, Trash2, Plus, FolderTree, Download, AlertTriangle, Phone, MessageCircle, GitBranch, FileSpreadsheet } from "lucide-react";
import ExcelImport from "../components/shared/ExcelImport";
import { exportToExcel } from "@/utils/exportUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function AccountNode({ account, allAccounts, level, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const children = allAccounts.filter((a) => a.parent_account_id === account.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group",
          level === 0 && "bg-muted/30"
        )}
        style={{ paddingRight: `${level * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="shrink-0">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <span className="text-sm font-medium flex-1">
          <span className="text-muted-foreground ml-2">{account.account_number}</span>
          {account.name}
        </span>
        {account.phone && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />{account.phone}
          </span>
        )}
        {account.branch_name && (
          <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{account.branch_name}</Badge>
        )}
        {account.account_nature && (
          <Badge variant="outline" className="text-[10px]">{account.account_nature}</Badge>
        )}
        {account.final_account && (
          <Badge variant="secondary" className="text-[10px]">{account.final_account}</Badge>
        )}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          {account.phone && (
            <Button
              variant="ghost" size="icon" className="h-6 w-6 text-green-600"
              title="إرسال عبر واتساب"
              onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${account.phone.replace(/\D/g,"")}`, "_blank"); }}
            >
              <MessageCircle className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(account)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(account)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {expanded && children.map((child) => (
        <AccountNode key={child.id} account={child} allAccounts={allAccounts} level={level + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [branches, setBranches] = useState([]);
  const urlParams = new URLSearchParams(window.location.search);
  const [branchFilter, setBranchFilter] = useState(urlParams.get("branch") || "all");
  const { filterByBranch, isAdmin } = useBranchFilter();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    account_number: "", name: "", parent_account_id: "", parent_account_name: "",
    final_account: "", account_nature: "", financial_statement: "", currency: "",
    is_parent: false, level: 0,
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [accs, currs, brs] = await Promise.all([
      base44.entities.Account.list(),
      base44.entities.Currency.list(),
      base44.entities.Branch.list(),
    ]);
    setAccounts(accs);
    setCurrencies(currs);
    setBranches(brs);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({
      account_number: "", name: "", parent_account_id: "", parent_account_name: "",
      final_account: "", account_nature: "", financial_statement: "", currency: "",
      phone: "", is_parent: false, level: 0, branch_id: "", branch_name: "",
    });
    setDialogOpen(true);
  }

  function openEdit(acc) {
    setEditing(acc);
    setForm({
      account_number: acc.account_number, name: acc.name,
      parent_account_id: acc.parent_account_id || "",
      parent_account_name: acc.parent_account_name || "",
      final_account: acc.final_account || "",
      account_nature: acc.account_nature || "",
      financial_statement: acc.financial_statement || "",
      currency: acc.currency || "",
      phone: acc.phone || "",
      is_parent: acc.is_parent || false,
      level: acc.level || 0,
      branch_id: acc.branch_id || "",
      branch_name: acc.branch_name || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = { ...form };
    if (!payload.parent_account_id) {
      delete payload.parent_account_id;
      delete payload.parent_account_name;
    }
    if (editing) {
      await base44.entities.Account.update(editing.id, payload);
      toast.success("تم تحديث الحساب");
    } else {
      await base44.entities.Account.create(payload);
      toast.success("تم إضافة الحساب");
    }
    setDialogOpen(false);
    loadData();
  }

  async function handleDelete(acc) {
    const hasChildren = accounts.some((a) => a.parent_account_id === acc.id);
    if (hasChildren) {
      toast.error("لا يمكن حذف حساب يحتوي على حسابات فرعية");
      return;
    }
    if (confirm("هل أنت متأكد من حذف هذا الحساب؟")) {
      await base44.entities.Account.delete(acc.id);
      toast.success("تم الحذف");
      loadData();
    }
  }

  async function importDefaultAccounts() {
    if (!confirm("سيتم إنشاء شجرة الحسابات الافتراضية وفق المعايير الدولية (IFRS). هل تريد المتابعة؟")) return;
    setImporting(true);
    try {
      // Build id map by account_number for parent linking
      const numToId = {};
      // Create in order (parents first)
      for (const acc of defaultChartOfAccounts) {
        const payload = { ...acc };
        const parentNum = payload._parent;
        delete payload._parent;
        if (parentNum && numToId[parentNum]) {
          payload.parent_account_id = numToId[parentNum];
          const parentAcc = defaultChartOfAccounts.find(a => a.account_number === parentNum);
          if (parentAcc) payload.parent_account_name = parentAcc.name;
        }
        const created = await base44.entities.Account.create(payload);
        numToId[acc.account_number] = created.id;
      }
      toast.success("تم تحميل شجرة الحسابات الافتراضية بنجاح!");
      loadData();
    } catch(e) {
      toast.error("حدث خطأ أثناء التحميل");
    }
    setImporting(false);
  }

  // Non-admins see only their branch accounts (or unassigned accounts)
  const branchSecureAccounts = filterByBranch(accounts);
  // Admins can additionally filter using the dropdown
  const filteredAccounts = !isAdmin
    ? branchSecureAccounts
    : branchFilter === "all"
      ? branchSecureAccounts
      : branchSecureAccounts.filter((a) => a.branch_id === branchFilter || !a.branch_id);

  const rootAccounts = filteredAccounts.filter((a) => !a.parent_account_id);

  function handleExportAccounts() {
    const exportColumns = [
      { key: "account_number", label: "رقم الحساب" },
      { key: "name", label: "اسم الحساب" },
      { key: "parent_account_name", label: "الحساب الرئيسي" },
      { key: "branch_name", label: "الفرع" },
      { key: "final_account", label: "الحساب الختامي" },
      { key: "account_nature", label: "طبيعة الحساب" },
      { key: "financial_statement", label: "القائمة المالية" },
      { key: "currency", label: "العملة" },
      { key: "balance", label: "الرصيد" },
      { key: "phone", label: "الهاتف" },
    ];

    const branchLabel = branchFilter === "all" ? "كل_الفروع" : (branches.find(b => b.id === branchFilter)?.name || "فرع");
    const filename = `شجرة_الحسابات_${branchLabel}_${new Date().toISOString().slice(0, 10)}`;

    exportToExcel(exportColumns, filteredAccounts, filename, "الحسابات");
    toast.success("تم تصدير الحسابات بنجاح");
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">شجرة الحسابات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">الدليل المحاسبي وفق المعايير الدولية (IFRS)</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {isAdmin && branches.length > 0 && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-9 w-40 text-sm">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground ml-1" />
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
          {accounts.length === 0 && (
            <Button variant="outline" onClick={importDefaultAccounts} disabled={importing} className="gap-2">
              <Download className="h-4 w-4"/>
              {importing ? "جاري التحميل..." : "تحميل الحسابات الافتراضية (IFRS)"}
            </Button>
          )}
          <ExcelImport
            entityName="Account"
            templateName="نموذج_استيراد_الحسابات.xlsx"
            onSuccess={loadData}
            columns={[
              { key: "account_number", label: "رقم الحساب", required: true },
              { key: "name", label: "اسم الحساب", required: true },
              { key: "final_account", label: "الحساب الختامي" },
              { key: "account_nature", label: "طبيعة الحساب" },
              { key: "financial_statement", label: "القائمة المالية" },
              { key: "currency", label: "العملة" },
            ]}
          />
          <Button variant="outline" onClick={handleExportAccounts} disabled={filteredAccounts.length === 0} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />تصدير Excel
          </Button>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4"/>حساب جديد</Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {rootAccounts.length === 0 ? (
          <div className="p-12 text-center">
            <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد حسابات بعد. ابدأ بإنشاء الحسابات الرئيسية</p>
          </div>
        ) : (
          <div className="p-2">
            {rootAccounts.map((acc) => (
              <AccountNode key={acc.id} account={acc} allAccounts={accounts} level={0} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل الحساب" : "حساب جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>رقم الحساب</Label>
                <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
              </div>
              <div>
                <Label>اسم الحساب</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>الحساب الرئيسي (اختياري)</Label>
              <Select
                value={form.parent_account_id}
                onValueChange={(v) => {
                  const parent = accounts.find((a) => a.id === v);
                  setForm({
                    ...form,
                    parent_account_id: v === "none" ? "" : v,
                    parent_account_name: parent ? parent.name : "",
                    level: parent ? (parent.level || 0) + 1 : 0,
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="بدون (حساب رئيسي)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون (حساب رئيسي)</SelectItem>
                  {accounts.filter((a) => a.id !== editing?.id).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.account_number} - {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الحساب الختامي</Label>
                <Select value={form.final_account} onValueChange={(v) => setForm({ ...form, final_account: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الميزانية">الميزانية</SelectItem>
                    <SelectItem value="الأرباح والخسائر">الأرباح والخسائر</SelectItem>
                    <SelectItem value="المتاجرة">المتاجرة</SelectItem>
                    <SelectItem value="التشغيل">التشغيل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>طبيعة الحساب</Label>
                <Select value={form.account_nature} onValueChange={(v) => setForm({ ...form, account_nature: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مدين">مدين</SelectItem>
                    <SelectItem value="دائن">دائن</SelectItem>
                    <SelectItem value="كلاهما">كلاهما</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>القائمة المالية</Label>
                <Select value={form.financial_statement} onValueChange={(v) => setForm({ ...form, financial_statement: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="قائمة الدخل">قائمة الدخل</SelectItem>
                    <SelectItem value="المركز المالي">المركز المالي</SelectItem>
                    <SelectItem value="التدفقات النقدية">التدفقات النقدية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>عملة الحساب</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر العملة" /></SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name} ({c.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {branches.length > 0 && (
              <div>
                <Label className="flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" />الفرع (اختياري)</Label>
                <Select
                  value={form.branch_id || "all"}
                  onValueChange={(v) => {
                    const b = branches.find((br) => br.id === v);
                    setForm({ ...form, branch_id: v === "all" ? "" : v, branch_name: b ? b.name : "" });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="كل الفروع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الفروع</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />رقم الهاتف / واتساب</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="مثال: 966501234567"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.account_number}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}