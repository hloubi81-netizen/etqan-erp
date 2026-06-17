import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountSearchInput from "@/components/shared/AccountSearchInput";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings.jsx";

const CATEGORIES = ["مباني", "آلات ومعدات", "سيارات", "أثاث ومفروشات", "أجهزة حاسوب", "أصول أخرى"];

function calcDepreciation(form) {
  const cost = parseFloat(form.purchase_cost) || 0;
  const salvage = parseFloat(form.salvage_value) || 0;
  const life = parseFloat(form.useful_life_years) || 1;
  if (form.depreciation_method === "القسط الثابت") {
    return parseFloat(((cost - salvage) / life).toFixed(2));
  }
  const rate = 2 / life;
  const nbv = cost - (parseFloat(form.accumulated_depreciation) || 0);
  return parseFloat((nbv * rate).toFixed(2));
}

const EMPTY = {
  asset_number: "", name: "", category: "آلات ومعدات", serial_number: "", supplier_name: "",
  purchase_date: "", purchase_cost: 0, current_market_value: 0,
  useful_life_years: 5, salvage_value: 0, depreciation_method: "القسط الثابت",
  annual_depreciation: 0, accumulated_depreciation: 0, net_book_value: 0,
  responsible_party: "", location: "", branch_id: "", branch_name: "",
  last_maintenance_date: "", next_maintenance_date: "",
  insurance_policy: "", insurance_expiry: "",
  asset_account_id: "", asset_account_name: "",
  depreciation_account_id: "", depreciation_account_name: "",
  accumulated_account_id: "", accumulated_account_name: "",
  status: "نشط", notes: ""
};

export default function AssetForm({ open, onClose, onSave, asset, assetCount }) {
  const { getSection } = useAppSettings();
  const assetSettings = getSection("assets");

  const [form, setForm] = useState(EMPTY);
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Account.filter({ is_parent: false }),
      base44.entities.Branch.list()
    ]).then(([acc, br]) => { setAccounts(acc); setBranches(br); });
  }, []);

  useEffect(() => {
    if (asset) {
      setForm({ ...EMPTY, ...asset });
    } else {
      const num = String((assetCount || 0) + 1).padStart(4, "0");
      setForm({
        ...EMPTY,
        asset_number: `FA-${num}`,
        depreciation_method: assetSettings.defaultDepreciationMethod || "القسط الثابت",
        useful_life_years: assetSettings.defaultUsefulLife || 5,
      });
    }
  }, [asset, assetCount]);

  function updateForm(key, val) {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      const annual = calcDepreciation(next);
      next.annual_depreciation = annual;
      next.net_book_value = Math.max(0, (parseFloat(next.purchase_cost) || 0) - (parseFloat(next.accumulated_depreciation) || 0));
      return next;
    });
  }

  async function handleSave() {
    if (!form.name || !form.asset_number) { toast.error("اسم الأصل ورقمه مطلوبان"); return; }
    if (!form.purchase_date) { toast.error("تاريخ الشراء مطلوب"); return; }
    if (!form.purchase_cost || form.purchase_cost <= 0) { toast.error("تكلفة الشراء يجب أن تكون أكبر من صفر"); return; }
    setLoading(true);
    const annual = calcDepreciation(form);
    const data = {
      ...form, annual_depreciation: annual,
      net_book_value: Math.max(0, (form.purchase_cost || 0) - (form.accumulated_depreciation || 0))
    };
    await onSave(data);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? "تعديل بيانات الأصل" : "تسجيل أصل جديد"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-1">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="basic">البيانات الأساسية</TabsTrigger>
            <TabsTrigger value="location">الموقع والمسؤولية</TabsTrigger>
            <TabsTrigger value="depreciation">الإهلاك</TabsTrigger>
            <TabsTrigger value="accounts">الحسابات</TabsTrigger>
          </TabsList>

          {/* ─── Tab 1: Basic ─── */}
          <TabsContent value="basic" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">رقم الأصل *</Label>
                <Input value={form.asset_number} onChange={(e) => updateForm("asset_number", e.target.value)} className="mt-1 h-9" placeholder="FA-0001" />
              </div>
              <div>
                <Label className="text-xs">اسم الأصل *</Label>
                <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} className="mt-1 h-9" placeholder="مثال: سيارة تويوتا كامري" />
              </div>
              <div>
                <Label className="text-xs">التصنيف</Label>
                <Select value={form.category} onValueChange={(v) => updateForm("category", v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">الرقم التسلسلي</Label>
                <Input value={form.serial_number} onChange={(e) => updateForm("serial_number", e.target.value)} className="mt-1 h-9" placeholder="SN-XXXX" />
              </div>
              <div>
                <Label className="text-xs">المورد / جهة الشراء</Label>
                <Input value={form.supplier_name} onChange={(e) => updateForm("supplier_name", e.target.value)} className="mt-1 h-9" placeholder="اسم المورد" />
              </div>
              <div>
                <Label className="text-xs">تاريخ الشراء *</Label>
                <Input type="date" value={form.purchase_date} onChange={(e) => updateForm("purchase_date", e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">تكلفة الشراء *</Label>
                <Input type="number" value={form.purchase_cost} onChange={(e) => updateForm("purchase_cost", parseFloat(e.target.value) || 0)} className="mt-1 h-9" min="0" />
              </div>
              <div>
                <Label className="text-xs">القيمة السوقية الحالية</Label>
                <Input type="number" value={form.current_market_value} onChange={(e) => updateForm("current_market_value", parseFloat(e.target.value) || 0)} className="mt-1 h-9" min="0" />
              </div>
              <div>
                <Label className="text-xs">الحالة</Label>
                <Select value={form.status} onValueChange={(v) => updateForm("status", v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["نشط", "تحت الصيانة", "مستهلك بالكامل", "مباع", "مسقط"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">رقم وثيقة التأمين</Label>
                <Input value={form.insurance_policy} onChange={(e) => updateForm("insurance_policy", e.target.value)} className="mt-1 h-9" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">ملاحظات</Label>
                <Textarea value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} className="mt-1 resize-none" rows={2} />
              </div>
            </div>
          </TabsContent>

          {/* ─── Tab 2: Location ─── */}
          <TabsContent value="location" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الفرع</Label>
                <Select value={form.branch_id} onValueChange={(v) => {
                  const br = branches.find(b => b.id === v);
                  setForm(p => ({ ...p, branch_id: v, branch_name: br?.name || "" }));
                }}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                  <SelectContent>
                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">الشخص المسؤول</Label>
                <Input value={form.responsible_party} onChange={(e) => updateForm("responsible_party", e.target.value)} className="mt-1 h-9" placeholder="اسم المسؤول" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">الموقع التفصيلي (مبنى / طابق / غرفة)</Label>
                <Input value={form.location} onChange={(e) => updateForm("location", e.target.value)} className="mt-1 h-9" placeholder="مثال: المبنى الرئيسي، الطابق 2، غرفة 205" />
              </div>
              <div>
                <Label className="text-xs">تاريخ آخر صيانة</Label>
                <Input type="date" value={form.last_maintenance_date} onChange={(e) => updateForm("last_maintenance_date", e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">موعد الصيانة القادمة</Label>
                <Input type="date" value={form.next_maintenance_date} onChange={(e) => updateForm("next_maintenance_date", e.target.value)} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">تاريخ انتهاء التأمين</Label>
                <Input type="date" value={form.insurance_expiry} onChange={(e) => updateForm("insurance_expiry", e.target.value)} className="mt-1 h-9" />
              </div>
            </div>

            {/* Location summary card */}
            {(form.branch_name || form.location || form.responsible_party) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-1 mt-2">
                <p className="font-semibold text-blue-700 text-xs mb-1">📍 ملخص الموقع</p>
                {form.branch_name && <p><span className="text-muted-foreground">الفرع:</span> <span className="font-medium">{form.branch_name}</span></p>}
                {form.location && <p><span className="text-muted-foreground">الموقع:</span> <span className="font-medium">{form.location}</span></p>}
                {form.responsible_party && <p><span className="text-muted-foreground">المسؤول:</span> <span className="font-medium">{form.responsible_party}</span></p>}
              </div>
            )}
          </TabsContent>

          {/* ─── Tab 3: Depreciation ─── */}
          <TabsContent value="depreciation" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">طريقة الإهلاك</Label>
                <Select value={form.depreciation_method} onValueChange={(v) => updateForm("depreciation_method", v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="القسط الثابت">القسط الثابت (Straight-Line)</SelectItem>
                    <SelectItem value="القسط المتناقص">القسط المتناقص (Declining Balance)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">العمر الإنتاجي (سنوات)</Label>
                <Input type="number" value={form.useful_life_years} onChange={(e) => updateForm("useful_life_years", parseFloat(e.target.value) || 0)} className="mt-1 h-9" min="1" />
              </div>
              <div>
                <Label className="text-xs">القيمة التخريدية</Label>
                <Input type="number" value={form.salvage_value} onChange={(e) => updateForm("salvage_value", parseFloat(e.target.value) || 0)} className="mt-1 h-9" min="0" />
              </div>
              <div>
                <Label className="text-xs">الإهلاك المتراكم (رصيد افتتاحي)</Label>
                <Input type="number" value={form.accumulated_depreciation} onChange={(e) => updateForm("accumulated_depreciation", parseFloat(e.target.value) || 0)} className="mt-1 h-9" min="0" />
              </div>
            </div>

            <div className="bg-muted/40 rounded-xl p-4 grid grid-cols-3 gap-3 text-center border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">الإهلاك السنوي</p>
                <p className="text-xl font-bold text-orange-600">{(form.annual_depreciation || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">الإهلاك المتراكم</p>
                <p className="text-xl font-bold text-red-500">{(form.accumulated_depreciation || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">القيمة الدفترية</p>
                <p className="text-xl font-bold text-green-700">{(form.net_book_value || 0).toLocaleString()}</p>
              </div>
            </div>

            {form.purchase_cost > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>نسبة الإهلاك</span>
                  <span>{Math.round(((form.accumulated_depreciation || 0) / form.purchase_cost) * 100)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round(((form.accumulated_depreciation || 0) / form.purchase_cost) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* ─── Tab 4: Accounts ─── */}
          <TabsContent value="accounts" className="space-y-3">
            <p className="text-xs text-muted-foreground">ربط الأصل بالحسابات المحاسبية لأتمتة قيود الإهلاك</p>
            {[
              ["asset_account_id", "asset_account_name", "حساب الأصل الثابت"],
              ["depreciation_account_id", "depreciation_account_name", "حساب مصروف الإهلاك (مدين)"],
              ["accumulated_account_id", "accumulated_account_name", "حساب مجمع الإهلاك (دائن)"],
            ].map(([idKey, nameKey, lbl]) => (
              <div key={idKey}>
                <Label className="text-xs">{lbl}</Label>
                <AccountSearchInput
                  accounts={accounts}
                  value={form[idKey] || ""}
                  onChange={(id, name) => setForm((p) => ({ ...p, [idKey]: id, [nameKey]: name }))}
                  placeholder={`ابحث عن ${lbl}...`}
                />
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>إلغاء</Button>
          <Button onClick={handleSave} disabled={loading} className="min-w-[100px]">
            {loading ? "جاري الحفظ..." : "حفظ الأصل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}