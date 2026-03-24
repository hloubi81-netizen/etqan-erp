import { Button } from "@/components/ui/button";
import { FileDown, FileText, Printer } from "lucide-react";
import { exportStatementToPDF, printElement } from "@/utils/exportUtils";

/**
 * For financial statements / reports (non-table format)
 * sections: [{ heading, rows: [{label, value}] }]
 */
export default function PrintExportBar({ title, sections, printId, filename }) {
  return (
    <div className="flex items-center gap-2 justify-end mb-4">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => exportStatementToPDF(title, sections, filename || title)}
      >
        <FileText className="h-3.5 w-3.5" />
        تصدير PDF
      </Button>
      {printId && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => printElement(printId, title)}
        >
          <Printer className="h-3.5 w-3.5" />
          طباعة
        </Button>
      )}
    </div>
  );
}