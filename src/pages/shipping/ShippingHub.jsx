import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CarriersTab from "@/components/shipping/CarriersTab";
import ShipmentsTab from "@/components/shipping/ShipmentsTab";
import TripsTab from "@/components/shipping/TripsTab";
import DriversTab from "@/components/shipping/DriversTab";
import VehiclesTab from "@/components/shipping/VehiclesTab";
import ShippingDashboard from "@/components/shipping/ShippingDashboard";
import PayrollManager from "@/components/hr/PayrollManager";
import AttendanceManager from "@/components/hr/AttendanceManager";
import PayrollSlipGenerator from "@/components/hr/PayrollSlipGenerator";
import EmployeesTab from "@/components/hr/EmployeesTab";

export default function ShippingHub() {
  return (
    <div>
      <PageHeader title="شركات الشحن" subtitle="إدارة الشحنات، التسعير، الأسطول، السائقين والرحلات" />
      <Tabs defaultValue="dashboard" className="mt-2">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">لوحة المعلومات</TabsTrigger>
          <TabsTrigger value="shipments">الشحنات</TabsTrigger>
          <TabsTrigger value="carriers">شركات الشحن</TabsTrigger>
          <TabsTrigger value="trips">الرحلات</TabsTrigger>
          <TabsTrigger value="drivers">السائقون</TabsTrigger>
          <TabsTrigger value="vehicles">الأسطول</TabsTrigger>
          <TabsTrigger value="payroll">الرواتب</TabsTrigger>
          <TabsTrigger value="attendance">الحضور والانصراف</TabsTrigger>
          <TabsTrigger value="slips">كشوف الرواتب</TabsTrigger>
          <TabsTrigger value="employees">الموظفون</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4"><ShippingDashboard /></TabsContent>
        <TabsContent value="shipments" className="mt-4"><ShipmentsTab /></TabsContent>
        <TabsContent value="carriers" className="mt-4"><CarriersTab /></TabsContent>
        <TabsContent value="trips" className="mt-4"><TripsTab /></TabsContent>
        <TabsContent value="drivers" className="mt-4"><DriversTab /></TabsContent>
        <TabsContent value="vehicles" className="mt-4"><VehiclesTab /></TabsContent>
        <TabsContent value="payroll" className="mt-4"><PayrollManager department="الشحن" /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceManager department="الشحن" /></TabsContent>
        <TabsContent value="slips" className="mt-4"><PayrollSlipGenerator department="الشحن" companyName="شركة الشحن" /></TabsContent>
        <TabsContent value="employees" className="mt-4"><EmployeesTab department="الشحن" /></TabsContent>
      </Tabs>
    </div>
  );
}