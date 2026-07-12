import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote, CheckCircle, Clock, Plus } from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP = {
  draft: { label: "مسودة", variant: "secondary", icon: Clock },
  approved: { label: "معتمد", variant: "default", icon: CheckCircle },
  paid: { label: "مدفوع", variant: "default", icon: Banknote },
};

export default function PayrollRuns() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.PayrollRun.list("-created_date")
      .then(setRuns).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function approve(id) {
    const now = new Date().toISOString();
    try {
      await base44.entities.PayrollRun.update(id, { status: "approved", approved_at: now });
      setRuns(prev => prev.map(r => r.id === id ? { ...r, status: "approved", approved_at: now } : r));
      toast.success("تم اعتماد كشف الرواتب");
    } catch { toast.error("فشل الاعتماد"); }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">كشوف الرواتب</h1>
          <p className="text-sm text-muted-foreground">إدارة واعتماد كشوف الرواتب الشهرية</p>
        </div>
        <Button className="gap-2" onClick={() => toast.info("استخدم صفحة الرواتب لإنشاء كشوف جديدة")}><Plus className="h-4 w-4" />كشف جديد</Button>
      </div>

      {runs.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">لا توجد كشوف رواتب بعد</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const st = STATUS_MAP[run.status] || STATUS_MAP.draft;
            const StIcon = st.icon;
            return (
              <Card key={run.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center"><Banknote className="h-5 w-5 text-blue-600" /></div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold">{run.run_number}</p>
                        <Badge variant={st.variant} className="gap-1"><StIcon className="h-3 w-3" />{st.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{run.period}{run.branch_name ? ` • ${run.branch_name}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center"><p className="text-xs text-muted-foreground">الموظفون</p><p className="font-bold">{run.employee_count || 0}</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">صافي الرواتب</p><p className="font-bold text-green-600">{(run.total_net || 0).toLocaleString()}</p></div>
                    {run.status === "draft" && (
                      <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => approve(run.id)}><CheckCircle className="h-4 w-4" />اعتماد</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}