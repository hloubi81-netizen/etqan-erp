import { Button } from "@/components/ui/button";
import { FileDown, FileText, Printer } from "lucide-react";
import { exportToCSV, exportToPDF, printElement } from "@/utils/exportUtils";
import { useLang } from "@/hooks/useLang.jsx";
import { tr } from "@/lib/translations";

export default function ExportButtons({ columns, data, title, filename, printId }) {
  const { lang } = useLang() || { lang: "ar" };
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => exportToCSV(columns, data, filename || title)}
      >
        <FileDown className="h-3.5 w-3.5" />
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => exportToPDF(title, columns, data, filename || title)}
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </Button>
      {printId && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => printElement(printId, title)}
        >
          <Printer className="h-3.5 w-3.5" />
          {tr("print", lang)}
        </Button>
      )}
    </div>
  );
}