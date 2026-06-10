import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Pencil, Wallet, FileText, Scale, AlertTriangle, CheckCircle2, Clock, Lock } from "lucide-react";
import CustodyForm from "@/components/custody/CustodyForm";
import CustodyExpenses from "@/components/custody/CustodyExpenses";
import CustodySettlement from "@/components/custody/CustodySettlement";

const STATUS_STYLES = {
  "مفتوحة": "bg-blue-100 text-blue-700",
  "تحت التسوية": "bg-amber-100 text-amber-700",
  "مسواة": "bg-green-100 text-green-700",
  "مغلقة": "bg-gray-100 text-gray-600",
};
const STATUS_ICONS = {
  "مفتوحة": Clock,
  "تحت التسوية": AlertTriangle,
  "مسواة": CheckCircle2,
  "مغلقة": Lock,
};

export default function CustodyManagement() {
  const [custodies, setCustodies] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustody, setEditingCustody] = useState(null);
  const [detailCustody, setDetailCustody] = useState(null);
  const [detailTab, setDetailTab] = useState("expenses");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEmp, setFilterEmp] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [c, ex, emp, cc, acc] = await Promise.all([
      base44.entities.Custody.list("-created_date"),
      base44.entities.CustodyExpense.list("-created_date"),
      base44.entities.Employee.list(),
      base44.entities.CostCenter.list(),
      base44.entities.Account.filter({ is_parent: false }),
    ]);
    setCustodies(c); setExpenses(ex); setEmployees(emp);
    setCostCenters(cc); setAccounts(acc);
    setLoading(false);
  }

  function getCustodyExpenses(custodyId) {
    return expenses.filter(e => e.custody_id === custodyId);
  }

  const filtered = useMemo(() => custodies.filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterEmp !== "all" && c.employee_id !== filterEmp) return false;
    if (search && !c.custody_number?.includes(search) && !c.employee_name?.toLowerCase().includes(search.toLowerCase()) && !c.purpose?.includes(search)) return false;
    return true;
  }), [custodies, filterStatus, filterEmp, search]);

  // KPIs
  const totalIssued = custodies.filter(c => c.status !== "مغلقة").reduce((s, c) => s + (c.issued_amount || 0), 0);
  const totalSpent = custodies.filter(c => c.status !== "مغلقة").reduce((s, c) => s + (c.spent_amount || 0), 0);
  const openCount = custodies.filter(c => c.status === "مفتوحة").length;
  const overdueCount = custodies.filter(c => {
    if (c.status === "مغلقة" || c.status === "مسواة") return false;
    if (!c.expected_return_date) return false;
    return new Date(c.expected_return_date) < new Date();
  }).length;

  function openDetail(custody, tab = "expenses") {
    setDetailCustody(custody);
    setDetailTab(tab);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const sharedFormProps = { employees, costCenters, accounts };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">إدارة العهد المالية</h1>
          <p className="text-sm text-muted-foreground">صرف العهد وتسجيل المصاريف وإجراء التسويات</p>
        </div>
        <Button onClick={() => { setEditingCustody(null); setFormOpen(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> صرف عهدة جديدة
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي العهد المفتوحة", value: totalIssued.toLocaleString(), icon: Wallet, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "إجمالي المنفق", value: totalSpent.toLocaleString(), icon: FileText, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "عهد مفتوحة", value: openCount, icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "متأخرة الإرجاع", value: overdueCount, icon: AlertTriangle, color: overdueCount > 0 ? "text-red-600" : "text-gray-400", bg: overdueCount > 0 ? "bg-red-50" : "bg-gray-50" },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-xl p-4 flex items-center gap-3`}>
            <k.icon className={`h-7 w-7 ${k.color}`} />
            <div>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="بحث برقم العهدة أو الموظف..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-52" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {["مفتوحة", "تحت التسوية", "مسواة", "مغلقة"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEmp} onValueChange={setFilterEmp}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="الموظف" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الموظفين</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Custodies Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">رقم العهدة</th>
                  <th className="px-4 py-3 text-right font-medium">الموظف</th>
                  <th className="px-4 py-3 text-right font-medium">الغرض</th>
                  <th className="px-4 py-3 text-right font-medium">المصروف</th>
                  <th className="px-4 py-3 text-right font-medium">المنفق</th>
                  <th className="px-4 py-3 text-right font-medium">الرصيد</th>
                  <th className="px-4 py-3 text-right font-medium">تاريخ الصرف</th>
                  <th className="px-4 py-3 text-right font-medium">الإرجاع</th>
                  <th className="px-4 py-3 text-center font-medium">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">لا توجد عهد</td></tr>
                ) : filtered.map(c => {
                  const custExpenses = getCustodyExpenses(c.id);
                  const spent = custExpenses.reduce((s, e) => s + (e.amount || 0), 0);
                  const balance = (c.issued_amount || 0) - spent;
                  const isOverdue = c.expected_return_date && new Date(c.expected_return_date) < new Date() && c.status !== "مغلقة" && c.status !== "مسواة";
                  const StatusIcon = STATUS_ICONS[c.status] || Clock;
                  return (
                    <tr key={c.id} className={`border-t hover:bg-muted/10 ${isOverdue ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3 font-mono font-medium">{c.custody_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.employee_name}</p>
                        <p className="text-xs text-muted-foreground">{c.department}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[160px] truncate" title={c.purpose}>{c.purpose}</td>
                      <td className="px-4 py-3 font-semibold">{(c.issued_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-orange-600">{spent.toLocaleString()}</td>
                      <td className={`px-4 py-3 font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>{balance.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{c.issue_date}</td>
                      <td className="px-4 py-3 text-xs">
                        {c.expected_return_date ? (
                          <span className={isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                            {isOverdue && "⚠️ "}{c.expected_return_date}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${STATUS_STYLES[c.status]}`}>
                          <StatusIcon className="h-3 w-3" />{c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-blue-600" onClick={() => openDetail(c, "expenses")}>
                            <FileText className="h-3.5 w-3.5" />مصاريف ({custExpenses.length})
                          </Button>
                          {c.status !== "مغلقة" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-green-600" onClick={() => openDetail(c, "settlement")}>
                              <Scale className="h-3.5 w-3.5" />تسوية
                            </Button>
                          )}
                          {c.status === "مفتوحة" && (
                            <button onClick={() => { setEditingCustody(c); setFormOpen(true); }} className="text-muted-foreground hover:text-primary p-1">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      <CustodyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadAll}
        editing={editingCustody}
        {...sharedFormProps}
      />

      {/* Detail Dialog — Expenses & Settlement */}
      <Dialog open={!!detailCustody} onOpenChange={v => !v && setDetailCustody(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {detailCustody && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 flex-wrap border-b pb-3">
                <div>
                  <h2 className="text-lg font-bold">عهدة {detailCustody.custody_number}</h2>
                  <p className="text-sm text-muted-foreground">{detailCustody.employee_name} — {detailCustody.purpose}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[detailCustody.status]}`}>
                  {detailCustody.status}
                </span>
              </div>

              <Tabs value={detailTab} onValueChange={setDetailTab} dir="rtl">
                <TabsList>
                  <TabsTrigger value="expenses" className="gap-1.5"><FileText className="h-4 w-4" /> المصاريف</TabsTrigger>
                  <TabsTrigger value="settlement" className="gap-1.5"><Scale className="h-4 w-4" /> التسوية</TabsTrigger>
                </TabsList>
                <TabsContent value="expenses" className="mt-4">
                  <CustodyExpenses
                    custody={detailCustody}
                    expenses={getCustodyExpenses(detailCustody.id)}
                    accounts={accounts}
                    onRefresh={loadAll}
                  />
                </TabsContent>
                <TabsContent value="settlement" className="mt-4">
                  <CustodySettlement
                    custody={detailCustody}
                    expenses={getCustodyExpenses(detailCustody.id)}
                    onRefresh={loadAll}
                    onClose={() => setDetailCustody(null)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}