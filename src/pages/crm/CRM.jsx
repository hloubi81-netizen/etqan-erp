import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Phone, Mail, Building2, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const STAGE_COLORS = {
  "تواصل أولي": "secondary", "عرض سعر": "outline",
  "تفاوض": "default", "مكسوبة": "default", "خسارة": "destructive"
};

const emptyContact = () => ({ name: "", type: "عميل محتمل", company: "", phone: "", email: "", address: "", notes: "", status: "نشط" });
const emptyOpp = () => ({ title: "", contact_name: "", expected_value: 0, probability: 50, stage: "تواصل أولي", notes: "" });

export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactDialog, setContactDialog] = useState(false);
  const [oppDialog, setOppDialog] = useState(false);
  const [editingC, setEditingC] = useState(null);
  const [editingO, setEditingO] = useState(null);
  const [contactForm, setContactForm] = useState(emptyContact());
  const [oppForm, setOppForm] = useState(emptyOpp());
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [c, o] = await Promise.all([
      base44.entities.CRMContact.list("-created_date"),
      base44.entities.CRMOpportunity.list("-created_date")
    ]);
    setContacts(c); setOpportunities(o); setLoading(false);
  }

  async function saveContact() {
    if (!contactForm.name) return toast.error("ادخل الاسم");
    if (editingC) await base44.entities.CRMContact.update(editingC.id, contactForm);
    else await base44.entities.CRMContact.create(contactForm);
    toast.success("تم الحفظ"); setContactDialog(false); loadData();
  }

  async function saveOpp() {
    if (!oppForm.title) return toast.error("ادخل عنوان الفرصة");
    if (editingO) await base44.entities.CRMOpportunity.update(editingO.id, oppForm);
    else await base44.entities.CRMOpportunity.create(oppForm);
    toast.success("تم الحفظ"); setOppDialog(false); loadData();
  }

  const filteredContacts = contacts.filter(c => c.name?.includes(search) || c.company?.includes(search));
  const totalOppValue = opportunities.filter(o => o.stage !== "خسارة").reduce((s, o) => s + (o.expected_value || 0), 0);
  const wonValue = opportunities.filter(o => o.stage === "مكسوبة").reduce((s, o) => s + (o.expected_value || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة علاقات العملاء</h1>
          <p className="text-muted-foreground text-sm">تتبع العملاء والفرص البيعية</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">إجمالي جهات الاتصال</p><p className="text-2xl font-bold">{contacts.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">عملاء محتملون</p><p className="text-2xl font-bold text-warning">{contacts.filter(c => c.type === "عميل محتمل").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">قيمة الفرص النشطة</p><p className="text-2xl font-bold text-primary">{totalOppValue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">فرص مكسوبة</p><p className="text-2xl font-bold text-success">{wonValue.toLocaleString()}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts"><Users className="h-4 w-4 ml-1" />جهات الاتصال</TabsTrigger>
          <TabsTrigger value="pipeline"><TrendingUp className="h-4 w-4 ml-1" />خط الفرص</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          <div className="flex gap-3 mb-4">
            <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            <Button onClick={() => { setEditingC(null); setContactForm(emptyContact()); setContactDialog(true); }}><Plus className="h-4 w-4 ml-1" />جهة اتصال جديدة</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map(c => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      {c.company && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{c.company}</p>}
                    </div>
                    <Badge variant={c.type === "عميل" ? "default" : c.type === "مورد" ? "secondary" : "outline"}>{c.type}</Badge>
                  </div>
                  {c.phone && <p className="text-xs flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</p>}
                  {c.email && <p className="text-xs flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</p>}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingC(c); setContactForm({ ...c }); setContactDialog(true); }}>تعديل</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await base44.entities.CRMContact.delete(c.id); loadData(); }}>حذف</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredContacts.length === 0 && <p className="col-span-3 text-center py-10 text-muted-foreground">لا توجد جهات اتصال</p>}
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditingO(null); setOppForm(emptyOpp()); setOppDialog(true); }}><Plus className="h-4 w-4 ml-1" />فرصة جديدة</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {["تواصل أولي", "عرض سعر", "تفاوض", "مكسوبة", "خسارة"].map(stage => (
              <div key={stage} className="space-y-2">
                <div className="text-center p-2 rounded-lg bg-muted">
                  <p className="text-xs font-semibold">{stage}</p>
                  <p className="text-xs text-muted-foreground">{opportunities.filter(o => o.stage === stage).length} فرصة</p>
                </div>
                {opportunities.filter(o => o.stage === stage).map(o => (
                  <Card key={o.id} className="cursor-pointer hover:shadow-md" onClick={() => { setEditingO(o); setOppForm({ ...o }); setOppDialog(true); }}>
                    <CardContent className="p-3">
                      <p className="text-xs font-semibold">{o.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{o.contact_name}</p>
                      <p className="text-xs font-medium text-primary mt-1">{(o.expected_value || 0).toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${o.probability || 0}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{o.probability}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact Dialog */}
      <Dialog open={contactDialog} onOpenChange={setContactDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingC ? "تعديل جهة الاتصال" : "جهة اتصال جديدة"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>الاسم *</Label><Input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>
              <Label>النوع</Label>
              <Select value={contactForm.type} onValueChange={v => setContactForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="عميل محتمل">عميل محتمل</SelectItem>
                  <SelectItem value="عميل">عميل</SelectItem>
                  <SelectItem value="مورد">مورد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>الشركة</Label><Input value={contactForm.company} onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div><Label>الهاتف</Label><Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>البريد الإلكتروني</Label><Input value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>العنوان</Label><Input value={contactForm.address} onChange={e => setContactForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="col-span-2"><Label>ملاحظات</Label><Input value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialog(false)}>إلغاء</Button>
            <Button onClick={saveContact}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opportunity Dialog */}
      <Dialog open={oppDialog} onOpenChange={setOppDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingO ? "تعديل الفرصة" : "فرصة بيعية جديدة"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>عنوان الفرصة *</Label><Input value={oppForm.title} onChange={e => setOppForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>جهة الاتصال</Label><Input value={oppForm.contact_name} onChange={e => setOppForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
            <div><Label>القيمة المتوقعة</Label><Input type="number" value={oppForm.expected_value} onChange={e => setOppForm(f => ({ ...f, expected_value: +e.target.value }))} /></div>
            <div>
              <Label>المرحلة</Label>
              <Select value={oppForm.stage} onValueChange={v => setOppForm(f => ({ ...f, stage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["تواصل أولي", "عرض سعر", "تفاوض", "مكسوبة", "خسارة"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>الاحتمال %</Label><Input type="number" min="0" max="100" value={oppForm.probability} onChange={e => setOppForm(f => ({ ...f, probability: +e.target.value }))} /></div>
            <div><Label>تاريخ الإغلاق المتوقع</Label><Input type="date" value={oppForm.expected_close_date} onChange={e => setOppForm(f => ({ ...f, expected_close_date: e.target.value }))} /></div>
            <div className="col-span-2"><Label>ملاحظات</Label><Input value={oppForm.notes} onChange={e => setOppForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOppDialog(false)}>إلغاء</Button>
            {editingO && <Button variant="destructive" onClick={async () => { await base44.entities.CRMOpportunity.delete(editingO.id); setOppDialog(false); loadData(); }}>حذف</Button>}
            <Button onClick={saveOpp}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}