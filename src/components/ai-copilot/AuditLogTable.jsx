import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function AuditLogTable() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AuditLog.list("-created_date", 50)
      .then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (logs.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد سجلات مراجعة بعد.</CardContent></Card>;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-right text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">الإجراء</th>
              <th className="px-3 py-2 font-medium">الكيان</th>
              <th className="px-3 py-2 font-medium">التفاصيل</th>
              <th className="px-3 py-2 font-medium">القناة</th>
              <th className="px-3 py-2 font-medium">المستخدم</th>
              <th className="px-3 py-2 font-medium">التوقيت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px]">{log.action}</Badge></td>
                <td className="px-3 py-2 font-medium">{log.entity}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">{log.details || "—"}</td>
                <td className="px-3 py-2 text-xs">{log.channel || "—"}</td>
                <td className="px-3 py-2 text-xs">{log.user_name || "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{log.timestamp || new Date(log.created_date).toLocaleString("ar-EG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}