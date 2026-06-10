import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Search, User, Clock, FileText, Receipt, GitBranch } from "lucide-react";

const ACTION_COLORS = {
  "إنشاء":  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "تعديل":  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "ترحيل":  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "حذف":    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const ACTION_ICONS = {
  "إنشاء": "✨", "تعديل": "✏️", "ترحيل": "⚡", "حذف": "🗑️",
};

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })
    + " " + d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("الكل");
  const [filterType, setFilterType] = useState("الكل");
  const [filterDate, setFilterDate] = useState("");
  const [filterBranch, setFilterBranch] = useState("الكل");
  const [branches, setBranches] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    setLoading(true);
    const [data, user] = await Promise.all([
      base44.entities.ActivityLog.list("-timestamp", 500).catch(() => []),
      base44.auth.me().catch(() => null),
    ]);
    setCurrentUser(user);
    setLogs(data);

    // Load branches for admin filter
    if (user?.role === "admin") {
      const brs = await base44.entities.Branch.list().catch(() => []);
      setBranches(brs);
    }

    // Auto-filter for branch_manager
    if (user?.role === "branch_manager" && user?.branch_id) {
      setFilterBranch(user.branch_id);
    }

    setLoading(false);
  }

  const isBranchManager = currentUser?.role === "branch_manager";

  const filtered = logs.filter(log => {
    const matchSearch = !search
      || log.document_number?.includes(search)
      || log.user_name?.includes(search)
      || log.user_email?.includes(search)
      || log.details?.includes(search);
    const matchAction = filterAction === "الكل" || log.action === filterAction;
    const matchType   = filterType === "الكل" || log.document_type === filterType;
    const matchDate   = !filterDate || log.timestamp?.startsWith(filterDate);
    const matchBranch = filterBranch === "الكل" || log.branch_id === filterBranch;
    return matchSearch && matchAction && matchType && matchDate && matchBranch;
  });

  // إحصاءات سريعة
  const stats = {
    total: filtered.length,
    posted: filtered.filter(l => l.action === "ترحيل").length,
    edited: filtered.filter(l => l.action === "تعديل").length,
    created: filtered.filter(l => l.action === "إنشاء").length,
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <ClipboardList className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">سجل النشاط</h1>
          <p className="text-sm text-muted-foreground">جميع العمليات على الفواتير والسندات</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي العمليات", value: stats.total, color: "text-foreground" },
          { label: "عمليات الترحيل", value: stats.posted, color: "text-blue-600" },
          { label: "عمليات التعديل", value: stats.edited, color: "text-amber-600" },
          { label: "عمليات الإنشاء", value: stats.created, color: "text-green-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9 h-9" placeholder="بحث برقم المستند أو اسم المستخدم..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["الكل", "إنشاء", "تعديل", "ترحيل", "حذف"].map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["الكل", "فاتورة", "سند"].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" className="w-40 h-9" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        {/* Branch filter: admin sees all branches, branch_manager locked to their branch */}
        {currentUser?.role === "admin" && branches.length > 0 && (
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-36 h-9">
              <GitBranch className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
              <SelectValue placeholder="الفرع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="الكل">كل الفروع</SelectItem>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {isBranchManager && currentUser?.branch_name && (
          <div className="flex items-center gap-1.5 px-3 h-9 rounded-md border bg-muted/50 text-sm text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5" />
            {currentUser.branch_name}
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد سجلات نشاط</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-right px-4 py-3 text-xs font-semibold">العملية</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">المستند</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">النوع</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">المبلغ</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">المستخدم</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">التاريخ والوقت</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">الفرع</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold">التفاصيل</th>
                    </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => (
                    <tr key={log.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || "bg-muted text-muted-foreground"}`}>
                          <span>{ACTION_ICONS[log.action]}</span>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {log.document_type === "فاتورة"
                            ? <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                            : <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          }
                          <span className="font-medium">{log.document_number || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <Badge variant="outline" className="text-xs">{log.document_type}</Badge>
                          {log.document_subtype && (
                            <span className="text-xs text-muted-foreground mr-1">{log.document_subtype}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {log.amount > 0 ? log.amount.toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-xs leading-tight">{log.user_name}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{log.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs">{formatDateTime(log.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.branch_name
                          ? <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300">{log.branch_name}</Badge>
                          : <span className="text-xs text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-48 truncate">
                        {log.details || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}