import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Download, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";

function Section({ label, count, color }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg ${color}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm font-bold">{count ?? "..."}</span>
    </div>
  );
}

export default function CompanyDataExport() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [done, setDone] = useState(false);

  const sid = user?.subscription_id;

  const fetchPreview = async () => {
    if (!sid) return;
    setLoading(true);
    setDone(false);
    const [employees, assets, custodies] = await Promise.all([
      base44.entities.Employee.filter({ subscription_id: sid }).catch(() => []),
      base44.entities.FixedAsset.filter({ subscription_id: sid }).catch(() => []),
      base44.entities.Custody.filter({ subscription_id: sid }).catch(() => []),
    ]);
    setPreview({ employees, assets, custodies });
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    fetchPreview();
  };

  const exportToExcel = () => {
    if (!preview) return;
    const wb = XLSX.utils.book_new();

    // Sheet: Employees
    const empRows = preview.employees.map(e => ({
      "رقم الموظف": e.employee_number || "",
      "الاسم": e.name || "",
      "القسم": e.department || "",
      "المنصب": e.position || "",
      "الراتب الأساسي": e.salary || 0,
      "تاريخ التعيين": e.hire_date || "",
      "الحالة": e.status || "",
      "الهاتف": e.phone || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empRows), "الموظفون");

    // Sheet: Fixed Assets
    const assetRows = preview.assets.map(a => ({
      "رقم الأصل": a.asset_number || "",
      "الاسم": a.name || "",
      "التصنيف": a.category || "",
      "تاريخ الشراء": a.purchase_date || "",
      "تكلفة الشراء": a.purchase_cost || 0,
      "الإهلاك المتراكم": a.accumulated_depreciation || 0,
      "القيمة الدفترية الصافية": a.net_book_value || 0,
      "الحالة": a.status || "",
      "الموقع": a.location || "",
      "المسؤول": a.responsible_party || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assetRows), "الأصول الثابتة");

    // Sheet: Custodies
    const custodyRows = preview.custodies.map(c => ({
      "رقم العهدة": c.custody_number || "",
      "اسم الموظف": c.employee_name || "",
      "الغرض": c.purpose || "",
      "المبلغ المصروف": c.issued_amount || 0,
      "المنفق فعلياً": c.spent_amount || 0,
      "المبلغ المستعاد": c.returned_amount || 0,
      "تاريخ الصرف": c.issue_date || "",
      "تاريخ الإرجاع المتوقع": c.expected_return_date || "",
      "الحالة": c.status || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(custodyRows), "العهَد");

    // Export
    const date = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `بيانات_الشركة_${date}.xlsx`);
    setDone(true);
  };

  if (!sid) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="gap-2">
        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
        تصدير بيانات شركتك
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              تصدير بيانات الشركة
            </DialogTitle>
            <DialogDescription>
              سيتم تصدير بيانات موظفيك وأصولك وعهدك في ملف Excel واحد خاص بك.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-2">
            <Section
              label="👤 الموظفون"
              count={loading ? "..." : `${preview?.employees?.length ?? 0} سجل`}
              color="bg-blue-50 text-blue-700"
            />
            <Section
              label="🏗️ الأصول الثابتة"
              count={loading ? "..." : `${preview?.assets?.length ?? 0} سجل`}
              color="bg-amber-50 text-amber-700"
            />
            <Section
              label="💼 العهَد"
              count={loading ? "..." : `${preview?.custodies?.length ?? 0} سجل`}
              color="bg-violet-50 text-violet-700"
            />
          </div>

          <div className="mt-4">
            {done ? (
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium justify-center py-2">
                <CheckCircle2 className="h-4 w-4" />
                تم تصدير الملف بنجاح!
              </div>
            ) : (
              <Button
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={exportToExcel}
                disabled={loading || !preview}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل...</>
                ) : (
                  <><Download className="h-4 w-4" /> تحميل ملف Excel</>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}