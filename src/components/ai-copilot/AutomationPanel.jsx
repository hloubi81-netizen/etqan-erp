import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Zap, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const TRIGGER_ICONS = { "مجدولة": Calendar, "كيان": Zap, "موصل": RefreshCw, "يدوية": Clock };
const STATUS_VARIANTS = { "نجاح": "default", "فشل": "destructive", "قيد الانتظار": "secondary" };

export default function AutomationPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AIAutomation.list("-created_date")
      .then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function toggle(item) {
    const newVal = !item.is_active;
    setItems(prev => prev.map(a => a.id === item.id ? { ...a, is_active: newVal } : a));
    try {
      await base44.entities.AIAutomation.update(item.id, { is_active: newVal });
      toast.success(newVal ? "تم تفعيل المهمة" : "تم إيقاف المهمة");
    } catch {
      setItems(prev => prev.map(a => a.id === item.id ? { ...a, is_active: !newVal } : a));
      toast.error("فشل التحديث");
    }
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (items.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد مهام أتمتة. أضف مهام من كيان AIAutomation.</CardContent></Card>;

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = TRIGGER_ICONS[item.trigger_type] || Clock;
        return (
          <Card key={item.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  {item.last_status && <Badge variant={STATUS_VARIANTS[item.last_status] || "secondary"} className="text-[10px]">{item.last_status}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{item.description || item.function_name}</p>
                {item.schedule && <p className="text-[11px] text-muted-foreground mt-0.5">⏰ {item.schedule}</p>}
              </div>
              <Switch checked={!!item.is_active} onCheckedChange={() => toggle(item)} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}