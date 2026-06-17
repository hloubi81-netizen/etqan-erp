import { base44 } from "@/api/base44Client";
import { getPrintSettings } from "@/components/print/PrintTemplateDesigner";

/**
 * Get the best print settings for a given document type.
 * First checks for a bound template in the PrintTemplate entity,
 * then falls back to the general template from localStorage.
 *
 * @param {string} documentType - e.g. "فاتورة مبيعات", "إيصال نقطة بيع"
 * @returns {Promise<object>} The print settings object
 */
export async function getBoundPrintSettings(documentType) {
  try {
    const templates = await base44.entities.PrintTemplate.filter({
      document_type: documentType,
      is_default: true,
    });
    if (templates.length > 0 && templates[0].settings) {
      return { ...templates[0].settings, _templateId: templates[0].id, _templateName: templates[0].name };
    }
  } catch (e) {
    // Silently fall back to localStorage
  }

  // Fall back to general template
  return getPrintSettings();
}

/**
 * Get the company settings from localStorage.
 */
export function getCompanySettings() {
  const SETTINGS_KEY = "itqan_app_settings";
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      return parsed.company || {};
    }
  } catch {}
  return {};
}