import jsPDF from "jspdf";
import "jspdf-autotable";

// ─── CSV / Excel Export ───────────────────────────────────────────────
export function exportToCSV(columns, data, filename = "export") {
  const headers = columns.map((c) => c.label).join(",");
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = c.render ? c.render(row[c.key], row) : row[c.key];
      const str = val !== null && val !== undefined ? String(val) : "";
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );
  const csv = "\uFEFF" + [headers, ...rows].join("\n"); // BOM for Arabic
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export ───────────────────────────────────────────────────────
export function exportToPDF(title, columns, data, filename = "export") {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, doc.internal.pageSize.width / 2, 15, { align: "center" });

  const headers = [columns.map((c) => c.label)];
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = c.render ? c.render(row[c.key], row) : row[c.key];
      return val !== null && val !== undefined ? String(val) : "";
    })
  );

  doc.autoTable({
    head: headers,
    body: rows,
    startY: 20,
    styles: { font: "helvetica", fontSize: 8, halign: "right" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  doc.save(`${filename}.pdf`);
}

// ─── Generic table PDF (for financial statements) ─────────────────────
export function exportStatementToPDF(title, sections, filename = "statement") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.text(title, doc.internal.pageSize.width / 2, 15, { align: "center" });

  let y = 25;
  sections.forEach(({ heading, rows }) => {
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.text(heading, 20, y); y += 6;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    rows.forEach(({ label, value }) => {
      doc.text(label, 25, y);
      doc.text(String(value), 180, y, { align: "right" });
      y += 5;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 4;
  });

  doc.save(`${filename}.pdf`);
}

// ─── Print ────────────────────────────────────────────────────────────
export function printElement(elementId, title = "") {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open("", "_blank");
  win.document.write(`
    <html dir="rtl"><head><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;direction:rtl;font-size:12px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;text-align:right}
    th{background:#2563eb;color:white}tr:nth-child(even){background:#f5f7fa}
    @media print{button{display:none}}</style></head>
    <body><h2 style="text-align:center">${title}</h2>${el.innerHTML}</body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
}