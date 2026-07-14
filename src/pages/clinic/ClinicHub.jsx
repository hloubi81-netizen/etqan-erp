import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardTab from "@/components/clinic/DashboardTab";
import PatientsTab from "@/components/clinic/PatientsTab";
import AppointmentsTab from "@/components/clinic/AppointmentsTab";
import MedicalRecordsTab from "@/components/clinic/MedicalRecordsTab";
import PrescriptionsTab from "@/components/clinic/PrescriptionsTab";
import InvoicesTab from "@/components/clinic/InvoicesTab";
import InsuranceClaimsTab from "@/components/clinic/InsuranceClaimsTab";

export default function ClinicHub() {
  return (
    <div>
      <PageHeader title="العيادات الطبية" subtitle="إدارة المرضى، المواعيد، السجلات الطبية، الوصفات، الفوترة والتأمين الصحي" />
      <Tabs defaultValue="dashboard" className="mt-2">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
          <TabsTrigger value="patients">المرضى</TabsTrigger>
          <TabsTrigger value="appointments">المواعيد</TabsTrigger>
          <TabsTrigger value="records">السجلات الطبية</TabsTrigger>
          <TabsTrigger value="prescriptions">الوصفات</TabsTrigger>
          <TabsTrigger value="invoices">الفوترة</TabsTrigger>
          <TabsTrigger value="claims">مطالبات التأمين</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4"><DashboardTab /></TabsContent>
        <TabsContent value="patients" className="mt-4"><PatientsTab /></TabsContent>
        <TabsContent value="appointments" className="mt-4"><AppointmentsTab /></TabsContent>
        <TabsContent value="records" className="mt-4"><MedicalRecordsTab /></TabsContent>
        <TabsContent value="prescriptions" className="mt-4"><PrescriptionsTab /></TabsContent>
        <TabsContent value="invoices" className="mt-4"><InvoicesTab /></TabsContent>
        <TabsContent value="claims" className="mt-4"><InsuranceClaimsTab /></TabsContent>
      </Tabs>
    </div>
  );
}