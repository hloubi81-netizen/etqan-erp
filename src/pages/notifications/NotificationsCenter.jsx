import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_ICONS = {
  "فاتورة مستحقة": "🧾", "تجاوز ميزانية": "⚠️", "تنبيه مخزون": "📦",
  "موافقة مطلوبة": "✅", "تذكير": "⏰", "أخرى": "🔔"
};

const emptyForm = () => ({
  title: "", message: "", type: "تذكير",
  related_module: "", is_read: false,
  target_user: "", trigger_date: new Date().toISOString().split("T")[0]
});

export default function NotificationsCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [filter, setFilter] = useState("الكل");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const data = await base44.entities.Notification.list("-created_date");
    setNotifications(data);
    setLoading(false);
  }

  async function handleSave() {
    if (!form.title) return toast.error("ادخل العنوان");
    await base44.entities.Notification.create(form);
    toast.success("تم إنشاء الإشعار");
    setDialogOpen(false);
    loadData();
  }

  async function markRead(n) {
    await base44.entities.Notification.update(n.id, { ...n, is_read: true });
    loadData();
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { ...n, is_read: true })));
    toast.success("تم تعليم الكل كمقروء");
    loadData();
  }

  async function deleteNotif(n) {
    await base44.entities.Notification.delete(n.id);
    loadData();
  }

  const filtered = filter === "الكل" ? notifications
    : filter === "غير مقروء" ? notifications.filter(n => !n.is_read)
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">{unreadCount}</span>}
          </div>
          <div>
            <h1 className="text-2xl font-bold">مركز الإشعارات والتنبيهات</h1>
            <p className="text-muted-foreground text-sm">{unreadCount} إشعار غير مقروء</p>
          </div>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && <Button variant="outline" onClick={markAllRead}><Check className="h-4 w-4 ml-1" />تعليم الكل كمقروء</Button>}
          <Button onClick={() => { setForm(emptyForm()); setDialogOpen(true); }}><Plus className="h-4 w-4 ml-1" />إشعار جديد</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["الكل", "غير مقروء", "فاتورة مستحقة", "تجاوز ميزانية", "تنبيه مخزون", "موافقة مطلوبة", "تذكير"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f}</Button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(n => (
          <Card key={n.id} className={`transition-all ${!n.is_read ? "border-primary/40 bg-primary/5" : ""}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <span className="text-2xl mt-0.5">{TYPE_ICONS[n.type] || "🔔"}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{n.title}</p>
                  <Badge variant="outline" className="text-xs">{n.type}</Badge>
                  {!n.is_read && <Badge className="text-xs bg-primary">جديد</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.trigger_date}</p>
              </div>
              <div className="flex gap-1">
                {!n.is_read && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => markRead(n)}>
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteNotif(n)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <BellOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد إشعارات</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إشعار / تنبيه جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>العنوان *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div>
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["فاتورة مستحقة", "تجاوز ميزانية", "تنبيه مخزون", "موافقة مطلوبة", "تذكير", "أخرى"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>الرسالة</Label><Input value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} /></div>
            <div><Label>المستهدف (بريد إلكتروني)</Label><Input value={form.target_user} onChange={e => setForm(f => ({ ...f, target_user: e.target.value }))} /></div>
            <div><Label>تاريخ التفعيل</Label><Input type="date" value={form.trigger_date} onChange={e => setForm(f => ({ ...f, trigger_date: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}