import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Route as RouteIcon, CheckCircle2 } from "lucide-react";
import ApprovalWorkflowForm from "@/components/approval/ApprovalWorkflowForm";

export default function ApprovalWorkflows() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.ApprovalWorkflow.list("-updated_date", 100).catch(() => []);
    setItems(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm("حذف مسار الاعتماد؟")) return;
    await base44.entities.ApprovalWorkflow.delete(id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><RouteIcon className="h-5 w-5 text-primary" /> مسارات الاعتماد</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تعريف سلاسل الموافقات حسب نوع المستند والمبلغ</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="gap-1.5"><Plus className="h-4 w-4" /> مسار جديد</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">لا توجد مسارات اعتماد بعد — أنشئ أول مسار</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map(w => (
            <Card key={w.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{w.name}</p>
                      <Badge variant="secondary">{w.document_type}</Badge>
                      <Badge variant={w.is_active ? "default" : "outline"} className="gap-1">
                        {w.is_active ? <><CheckCircle2 className="h-3 w-3" /> نشط</> : "متوقف"}
                      </Badge>
                    </div>
                    {w.description && <p className="text-xs text-muted-foreground mt-1">{w.description}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      {(w.steps || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((s, i, arr) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs">
                            <span className="font-medium">{i + 1}. {s.approver_name || "—"}</span>
                            {s.min_amount ? <span className="text-muted-foreground"> (≥ {s.min_amount.toLocaleString()})</span> : null}
                          </div>
                          {i < arr.length - 1 && <span className="text-muted-foreground text-xs">←</span>}
                        </div>
                      ))}
                      {(!w.steps || w.steps.length === 0) && <span className="text-xs text-muted-foreground">لا خطوات</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(w); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(w.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ApprovalWorkflowForm open={open} onClose={() => setOpen(false)} onSaved={load} editing={editing} />
    </div>
  );
}