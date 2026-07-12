import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Zap, ScrollText } from "lucide-react";
import ChatPanel from "@/components/ai-copilot/ChatPanel";
import AutomationPanel from "@/components/ai-copilot/AutomationPanel";
import AuditLogTable from "@/components/ai-copilot/AuditLogTable";

export default function AICopilot() {
  const [tab, setTab] = useState("chat");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">مساعد ETQAN الذكي</h1>
          <p className="text-sm text-muted-foreground">مساعدك الذكي لإدارة النظام، الأتمتة، وسجل المراجعة</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="chat" className="gap-1.5"><Bot className="h-4 w-4" />المحادثة</TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5"><Zap className="h-4 w-4" />الأتمتة</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><ScrollText className="h-4 w-4" />سجل المراجعة</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <div className="h-[calc(100vh-280px)] min-h-[400px]">
            <ChatPanel />
          </div>
        </TabsContent>

        <TabsContent value="automation" className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-600" />
            <p className="text-sm text-muted-foreground">إدارة المهام المجدولة — يمكنك تشغيل أو إيقاف أي مهمة</p>
          </div>
          <AutomationPanel />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-blue-600" />
            <p className="text-sm text-muted-foreground">آخر 50 عملية في النظام</p>
          </div>
          <AuditLogTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}