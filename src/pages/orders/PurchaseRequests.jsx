import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Search, Eye, CheckCircle2, XCircle, Truck,
  Package, Calendar, User, Building2, AlertCircle, Clock,
  ClipboardList, Filter, FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  "قيد الانتظار": { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock, label: "قيد الانتظار" },
  "موافق عليه": { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2, label: "موافق عليه" },
  "مرفوض": { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle, label: "مرفوض" },
  "تم الصرف": { color: "bg-blue-100 text-blue-800 border-blue-200", icon: Truck, label: "تم الصرف" },
};

function generateRequestNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PR-${y}${m}${d}-${rand}`;
}

export default function PurchaseRequests() {
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showApprove, setShowApprove] = useState(null);
  const [showReject, setShowReject] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    department: "",
    branch_id: "",
    branch_name: "",
    items: [],
    notes: "",
  });

  const [approvalNote, setApprovalNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, p, w, b] = await Promise.all([
        base44.entities.PurchaseRequest.list("-created_date", 200),
        base44.entities.Product.list("name", 500),
        base44.entities.Warehouse.list("name", 100),
        base44.entities.Branch.list("name", 100),
      ]);
      setRequests(r || []);
      setProducts(p || []);
      setWarehouses(w || []);
      setBranches(b || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r) =>
        r.request_number?.toLowerCase().includes(s) ||
        r.employee_name?.toLowerCase().includes(s) ||
        r.department?.toLowerCase().includes(s));
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    return list;
  }, [requests, search, statusFilter]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "قيد الانتظار").length;
    const approved = requests.filter((r) => r.status === "موافق عليه").length;
    const rejected = requests.filter((r) => r.status === "مرفوض").length;
    const dispensed = requests.filter((r) => r.status === "تم الصرف").length;
    return { total, pending, approved, rejected, dispensed };
  }, [requests]);

  const isAdmin = user?.role === "admin";

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { product_id: "", product_name: "", quantity: 1, unit: "", warehouse_id: "", warehouse_name: "", notes: "" }] });
  };

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "product_id") {
      const prod = products.find((p) => p.id === value);
      items[idx].product_name = prod?.name || "";
      items[idx].unit = prod?.units?.[0]?.name || "";
    }
    if (field === "warehouse_id") {
      const wh = warehouses.find((w) => w.id === value);
      items[idx].warehouse_name = wh?.name || "";
    }
    setForm({ ...form, items });
  };

  const removeItem = (idx) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async () => {
    if (!form.items.length) { toast.error("أضف صنفاً واحداً على الأقل"); return; }
    try {
      await base44.entities.PurchaseRequest.create({
        request_number: generateRequestNumber(),
        date: form.date,
        employee_id: user?.id,
        employee_name: user?.full_name || user?.email,
        department: form.department,
        branch_id: form.branch_id,
        branch_name: form.branch_name,
        items: form.items,
        notes: form.notes,
        status: "قيد الانتظار",
      });
      toast.success("تم إرسال الطلب بنجاح");
      setShowForm(false);
      resetForm();
      loadData();
    } catch (e) { toast.error("حدث خطأ"); }
  };

  const resetForm = () => {
    setForm({ date: format(new Date(), "yyyy-MM-dd"), department: "", branch_id: "", branch_name: "", items: [], notes: "" });
  };

  const handleApprove = async () => {
    if (!showApprove) return;
    try {
      await base44.entities.PurchaseRequest.update(showApprove.id, {
        status: "موافق عليه",
        approved_by: user?.id,
        approved_by_name: user?.full_name || user?.email,
        approved_at: new Date().toISOString(),
        approval_note: approvalNote,
      });
      toast.success("تمت الموافقة على الطلب");
      setShowApprove(null);
      setApprovalNote("");
      loadData();
    } catch (e) { toast.error("حدث خطأ"); }
  };

  const handleReject = async () => {
    if (!showReject) return;
    try {
      await base44.entities.PurchaseRequest.update(showReject.id, {
        status: "مرفوض",
        approved_by: user?.id,
        approved_by_name: user?.full_name || user?.email,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      });
      toast.success("تم رفض الطلب");
      setShowReject(null);
      setRejectionReason("");
      loadData();
    } catch (e) { toast.error("حدث خطأ"); }
  };

  const handleMarkDispensed = async (req) => {
    try {
      await base44.entities.PurchaseRequest.update(req.id, { status: "تم الصرف" });
      toast.success("تم تحديث الحالة إلى 'تم الصرف'");
      loadData();
    } catch (e) { toast.error("حدث خطأ"); }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">طلبات الشراء</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة طلبات الشراء الداخلية ونظام الموافقات</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> طلب شراء جديد
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { value: stats.total, label: "إجمالي الطلبات", icon: ClipboardList, color: "text-gray-600", bg: "bg-gray-50" },
          { value: stats.pending, label: "قيد الانتظار", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
          { value: stats.approved, label: "موافق عليه", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { value: stats.rejected, label: "مرفوض", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
          { value: stats.dispensed, label: "تم الصرف", icon: Truck, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((s, i) => (
          <Card key={i} className={cn("border-0", s.bg)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-white", s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث برقم الطلب أو اسم الموظف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 ml-1" />
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="قيد الانتظار">قيد الانتظار</SelectItem>
            <SelectItem value="موافق عليه">موافق عليه</SelectItem>
            <SelectItem value="مرفوض">مرفوض</SelectItem>
            <SelectItem value="تم الصرف">تم الصرف</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3" />
          <p>{search || statusFilter !== "all" ? "لا توجد نتائج مطابقة" : "لا توجد طلبات شراء بعد"}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredRequests.map((req) => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG["قيد الانتظار"];
            const Icon = cfg.icon;
            return (
              <Card key={req.id} className="hover:shadow-md transition-shadow border">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    {/* Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-800">#{req.request_number}</span>
                        <Badge className={cn("gap-1", cfg.color)} variant="outline">
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {req.date}</span>
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {req.employee_name}</span>
                        {req.department && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {req.department}</span>}
                        <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {req.items?.length || 0} صنف</span>
                      </div>
                      {req.rejection_reason && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> سبب الرفض: {req.rejection_reason}
                        </p>
                      )}
                      {req.approval_note && (
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {req.approval_note}
                        </p>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => setShowDetail(req)} className="gap-1">
                        <Eye className="h-3.5 w-3.5" /> عرض
                      </Button>
                      {isAdmin && req.status === "قيد الانتظار" && (
                        <>
                          <Button size="sm" onClick={() => { setShowApprove(req); setApprovalNote(""); }} className="gap-1 bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> موافقة
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setShowReject(req); setRejectionReason(""); }} className="gap-1">
                            <XCircle className="h-3.5 w-3.5" /> رفض
                          </Button>
                        </>
                      )}
                      {isAdmin && req.status === "موافق عليه" && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkDispensed(req)} className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-50">
                          <Truck className="h-3.5 w-3.5" /> تم الصرف
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Request Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" /> طلب شراء جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>التاريخ</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>القسم</Label>
                <Input placeholder="القسم" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>الفرع</Label>
                <Select value={form.branch_id} onValueChange={(v) => { const b = branches.find((x) => x.id === v); setForm({ ...form, branch_id: v, branch_name: b?.name || "" }); }}>
                  <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">الأصناف المطلوبة</Label>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-1"><Plus className="h-3.5 w-3.5" /> إضافة صنف</Button>
              </div>
              {form.items.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">لم تتم إضافة أي أصناف بعد</p>
              )}
              {form.items.map((item, idx) => (
                <Card key={idx} className="border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-600">صنف #{idx + 1}</span>
                      <Button variant="ghost" size="sm" className="text-red-500 h-7" onClick={() => removeItem(idx)}>حذف</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Select value={item.product_id} onValueChange={(v) => updateItem(idx, "product_id", v)}>
                          <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.item_code})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">الكمية</Label>
                        <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
                      </div>
                      <div>
                        <Label className="text-xs">الوحدة</Label>
                        <Input value={item.unit} readOnly />
                      </div>
                      <div className="col-span-2">
                        <Select value={item.warehouse_id} onValueChange={(v) => updateItem(idx, "warehouse_id", v)}>
                          <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                          <SelectContent>
                            {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input placeholder="ملاحظات على الصنف" value={item.notes || ""} onChange={(e) => updateItem(idx, "notes", e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>ملاحظات عامة</Label>
              <Textarea placeholder="ملاحظات إضافية..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button onClick={handleSubmit} disabled={!form.items.length}>إرسال الطلب</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              تفاصيل الطلب #{showDetail?.request_number}
            </DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">التاريخ:</span> <span className="font-medium">{showDetail.date}</span></div>
                <div><span className="text-gray-500">الحالة:</span> <Badge className={cn("gap-1", STATUS_CONFIG[showDetail.status]?.color)} variant="outline">{showDetail.status}</Badge></div>
                <div><span className="text-gray-500">الموظف:</span> <span className="font-medium">{showDetail.employee_name}</span></div>
                <div><span className="text-gray-500">القسم:</span> <span className="font-medium">{showDetail.department || "-"}</span></div>
                <div><span className="text-gray-500">الفرع:</span> <span className="font-medium">{showDetail.branch_name || "-"}</span></div>
                {showDetail.approved_by_name && <div><span className="text-gray-500">المعتمد:</span> <span className="font-medium">{showDetail.approved_by_name}</span></div>}
              </div>
              <div className="border-t pt-3">
                <h4 className="font-semibold mb-2">الأصناف المطلوبة</h4>
                <div className="space-y-2">
                  {showDetail.items?.map((item, i) => (
                    <Card key={i} className="bg-gray-50">
                      <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{item.product_name}</p>
                          <p className="text-xs text-gray-500">{item.warehouse_name} • {item.quantity} {item.unit}</p>
                        </div>
                        {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              {showDetail.notes && (
                <div className="border-t pt-3"><span className="text-gray-500 text-sm">ملاحظات:</span><p className="text-sm mt-1">{showDetail.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={!!showApprove} onOpenChange={() => setShowApprove(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /> تأكيد الموافقة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">الموافقة على الطلب #{showApprove?.request_number}</p>
            <div className="space-y-1.5">
              <Label>ملاحظة (اختياري)</Label>
              <Textarea value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="ملاحظة على الموافقة..." rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowApprove(null)}>إلغاء</Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>تأكيد الموافقة</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showReject} onOpenChange={() => setShowReject(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-600" /> تأكيد الرفض</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">رفض الطلب #{showReject?.request_number}</p>
            <div className="space-y-1.5">
              <Label>سبب الرفض *</Label>
              <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="اذكر سبب الرفض..." rows={3} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowReject(null)}>إلغاء</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}>تأكيد الرفض</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}