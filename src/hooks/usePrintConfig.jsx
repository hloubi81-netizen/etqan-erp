import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const DEFAULT_CONFIG = {
  company_name: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  company_tax_number: "",
  logo_url: "",
  format: "simplified",
  show_logo: true,
  show_tax_number: true,
  show_signature: false,
  footer_notes: "",
  shipping_notes: "",
  terms: "",
  custom_field_1_label: "",
  custom_field_1_value: "",
  custom_field_2_label: "",
  custom_field_2_value: "",
  primary_color: "#4338ca",
};

let cachedConfig = null;

export function usePrintConfig() {
  const [config, setConfig] = useState(cachedConfig || DEFAULT_CONFIG);

  useEffect(() => {
    if (cachedConfig) return;
    base44.entities.InvoicePrintConfig.list().then((list) => {
      if (list.length > 0) {
        cachedConfig = { ...DEFAULT_CONFIG, ...list[0] };
        setConfig(cachedConfig);
      }
    });
  }, []);

  return config;
}

export function printDocument(elementId, title = "طباعة") {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head>
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body { margin: 0; direction: rtl; font-family: Cairo, sans-serif; background: white; }
        @media print { body { margin: 0; } @page { margin: 10mm; } }
      </style>
    </head><body>${el.innerHTML}</body></html>
  `);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}