import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from "lucide-react";
import EmptyState from "./EmptyState";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function DataTable({ columns, data, onEdit, onDelete, emptyMessage, pageSize: defaultPageSize = 25 }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  if (!data || data.length === 0) {
    return <div className="bg-card rounded-xl border border-border"><EmptyState title={emptyMessage || "لا توجد بيانات"} /></div>;
  }

  const totalPages = Math.ceil(data.length / pageSize);
  const paginated = data.slice((page - 1) * pageSize, page * pageSize);

  const goTo = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-right font-semibold text-xs w-10">#</TableHead>
              {columns.map((col) => (
                <TableHead key={col.key} className="text-right font-semibold text-xs">{col.label}</TableHead>
              ))}
              {(onEdit || onDelete) && (
                <TableHead className="text-right font-semibold text-xs w-24">إجراءات</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((row, idx) => (
              <TableRow key={row.id || idx} className="hover:bg-muted/30 transition-colors">
                <TableCell className="text-xs text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                {columns.map((col) => (
                  <TableCell key={col.key} className="text-sm">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </TableCell>
                ))}
                {(onEdit || onDelete) && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {onEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(row)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data.length > PAGE_SIZE_OPTIONS[0] && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20 gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>عرض</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(+e.target.value); setPage(1); }}
              className="border rounded px-1.5 py-0.5 bg-background text-foreground text-xs"
            >
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>من {data.length} سجل</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goTo(1)} disabled={page === 1}>
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goTo(page - 1)} disabled={page === 1}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs px-2 text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goTo(page + 1)} disabled={page === totalPages}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goTo(totalPages)} disabled={page === totalPages}>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}