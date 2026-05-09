import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DEFAULTS = {
  points_per_currency: 1,
  currency_per_point: 0.1,
  min_redeem_points: 100,
  silver_threshold: 500,
  gold_threshold: 1500,
  platinum_threshold: 5000,
  enable_loyalty: true,
  enable_promotions: true,
};

export default function PointsSettings() {
  const { toast } = useToast();
  const [form, setForm] = useState(DEFAULTS);
  const [id, setId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.PointsSettings.list().then(data => {
      if (data[0]) { setForm({ ...DEFAULTS, ...data[0] }); setId(data[0].id); }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (id) await base44.entities.PointsSettings.update(id, form);
    else { const r = await base44.entities.PointsSettings.create(form); setId(r.id); }
    toast({ title: "تم حفظ الإعدادات" });
  };

  const field = (label, key, type = "number", placeholder = "") => (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <Input
        type={type}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        placeholder={placeholder}
      />
    </div>
  );

  if (loading) return <div className="text-center py-10 text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-5 max-w-2xl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" /> إعدادات نظام النقاط
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">تفعيل نظام الولاء</p>
              <p className="text-xs text-muted-foreground">إضافة النقاط تلقائياً عند الشراء</p>
            </div>
            <Switch checked={!!form.enable_loyalty} onCheckedChange={v => setForm({ ...form, enable_loyalty: v })} />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">تفعيل نظام العروض</p>
              <p className="text-xs text-muted-foreground">تطبيق العروض الخاصة على الفواتير والـ POS</p>
            </div>
            <Switch checked={!!form.enable_promotions} onCheckedChange={v => setForm({ ...form, enable_promotions: v })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {field("نقاط لكل وحدة عملة (مثل: 1 ريال = X نقطة)", "points_per_currency", "number", "1")}
            {field("قيمة النقطة الواحدة بالعملة عند الاسترداد", "currency_per_point", "number", "0.1")}
            {field("الحد الأدنى لاسترداد النقاط", "min_redeem_points", "number", "100")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">مستويات الولاء</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-gray-400" />
                <span className="text-sm font-medium">فضي</span>
              </div>
              {field("النقاط المطلوبة", "silver_threshold", "number", "500")}
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium">ذهبي</span>
              </div>
              {field("النقاط المطلوبة", "gold_threshold", "number", "1500")}
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-purple-600" />
                <span className="text-sm font-medium">بلاتيني</span>
              </div>
              {field("النقاط المطلوبة", "platinum_threshold", "number", "5000")}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} className="gap-2 w-full sm:w-auto">
        <Save className="h-4 w-4" /> حفظ الإعدادات
      </Button>
    </div>
  );
}