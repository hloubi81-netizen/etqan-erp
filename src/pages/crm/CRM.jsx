import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Activity, BarChart2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import CRMDashboard from "@/components/crm/CRMDashboard";
import CRMContacts from "@/components/crm/CRMContacts";
import CRMPipeline from "@/components/crm/CRMPipeline";
import CRMActivities from "@/components/crm/CRMActivities";

export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [c, o] = await Promise.all([
      base44.entities.CRMContact.list("-created_date", 200),
      base44.entities.CRMOpportunity.list("-created_date", 200),
    ]);
    await new Promise(r => setTimeout(r, 200));
    const a = await base44.entities.CRMActivity.list("-created_date", 200);
    setContacts(c);
    setOpportunities(o);
    setActivities(a);
    setLoading(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const sharedProps = { contacts, opportunities, activities, reload: loadData };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة علاقات العملاء (CRM)</h1>
          <p className="text-muted-foreground text-sm">تتبع العملاء، الفرص البيعية، والأنشطة</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 ml-1" />تحديث
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="dashboard"><BarChart2 className="h-4 w-4 ml-1" />لوحة التحكم</TabsTrigger>
          <TabsTrigger value="contacts"><Users className="h-4 w-4 ml-1" />جهات الاتصال ({contacts.length})</TabsTrigger>
          <TabsTrigger value="pipeline"><TrendingUp className="h-4 w-4 ml-1" />خط الفرص ({opportunities.filter(o => o.stage !== "مكسوبة" && o.stage !== "خسارة").length})</TabsTrigger>
          <TabsTrigger value="activities"><Activity className="h-4 w-4 ml-1" />الأنشطة ({activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><CRMDashboard {...sharedProps} onTabChange={setActiveTab} /></TabsContent>
        <TabsContent value="contacts"><CRMContacts {...sharedProps} /></TabsContent>
        <TabsContent value="pipeline"><CRMPipeline {...sharedProps} /></TabsContent>
        <TabsContent value="activities"><CRMActivities {...sharedProps} /></TabsContent>
      </Tabs>
    </div>
  );
}