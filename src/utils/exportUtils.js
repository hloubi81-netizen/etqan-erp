import jsPDF from "jspdf";

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
  const pageW = doc.internal.pageSize.width;
  doc.setFontSize(14);
  doc.text(title, pageW / 2, 15, { align: "center" });

  const colWidth = (pageW - 20) / columns.length;
  let y = 25;

  // Header row
  doc.setFillColor(37, 99, 235);
  doc.rect(10, y, pageW - 20, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  columns.forEach((c, i) => {
    doc.text(c.label, pageW - 10 - colWidth * i - colWidth / 2, y + 5.5, { align: "center" });
  });
  y += 8;

  // Data rows
  doc.setTextColor(0, 0, 0);
  data.forEach((row, ri) => {
    if (y > 190) { doc.addPage(); y = 15; }
    if (ri % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(10, y, pageW - 20, 7, "F"); }
    columns.forEach((c, i) => {
      const val = c.render ? c.render(row[c.key], row) : row[c.key];
      const str = val !== null && val !== undefined ? String(val) : "";
      doc.text(str, pageW - 10 - colWidth * i - colWidth / 2, y + 5, { align: "center" });
    });
    y += 7;
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