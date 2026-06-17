import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

const SETTINGS_KEY = "itqan_app_settings";

const DEFAULT_SETTINGS = {
  company: { name: "شركة اتقان للتجارة", phone: "", email: "", address: "", taxNumber: "", commercialRegister: "", logo: "" },
  notifications: { overdueInvoices: false, lowStock: false, dailySummary: false },
  einvoice: {
    enabled: false,
    system: "zatca",
    zatca_vat_number: "", zatca_cr_number: "", zatca_otp: "", zatca_environment: "sandbox", zatca_cert: "", zatca_private_key: "",
    eta_client_id: "", eta_client_secret: "", eta_tax_id: "", eta_branch_code: "", eta_environment: "preproduction",
  },
  invoices: { defaultPayment: "نقداً", taxRate: 15, showTax: true, autoNumber: true, numberPrefix: "INV-", showLogo: true, printCopies: 1, footerNote: "" },
  purchases: {
    autoUpdateProductPrice: true,
    autoUpdateLastPurchasePrice: true,
    autoUpdateAvgCost: true,
    requireCostCenter: false,
    requireWarehouse: true,
  },
  accounting: { fiscalYearStart: "01-01", defaultCurrency: "SAR", decimalPlaces: 2, autoPostJournals: true, requireCostCenter: false },
  warehouse: { defaultWarehouse: "", enableSerialNumbers: false, lowStockAlert: true, lowStockThreshold: 10, allowNegativeStock: false },
  pos: { cashierName: "", enableDiscount: true, maxDiscountPercent: 20, enableTax: true, taxRate: 15, printReceipt: true, receiptNote: "" },
  hr: { workDaysPerWeek: 5, workHoursPerDay: 8, overtimeRate: 1.5, currency: "SAR", payrollDay: 25 },
  assets: { defaultDepreciationMethod: "القسط الثابت", defaultUsefulLife: 5, fiscalYearEnd: "12-31" },
  security: { twoFactorAuth: false, sessionTimeout: false, sessionTimeoutMinutes: 30, activityLogEnabled: true },
};

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  const getSection = useCallback((section) => {
    return settings[section] || DEFAULT_SETTINGS[section] || {};
  }, [settings]);

  const update = useCallback((section, key, value) => {
    setSettings(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }, []);

  const saveSettings = useCallback(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    toast.success("تم حفظ الإعدادات بنجاح");
  }, [settings]);

  return (
    <AppSettingsContext.Provider value={{ settings, getSection, update, saveSettings, SETTINGS_KEY }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}

/**
 * Returns field-level rules for a given section and field.
 * Usage: const rule = useFieldRule("purchases", "autoUpdateProductPrice");
 * Returns: { visible: true, required: false, disabled: false, defaultValue: undefined }
 */
export function useFieldRule(section, fieldKey) {
  const { getSection } = useAppSettings();
  const sectionData = getSection(section);

  return {
    visible: sectionData[`show_${fieldKey}`] !== false,
    required: sectionData[`require_${fieldKey}`] === true,
    disabled: sectionData[`disable_${fieldKey}`] === true,
    defaultValue: sectionData[`default_${fieldKey}`],
    enabled: sectionData[fieldKey],
    value: sectionData[fieldKey],
  };
}

export { DEFAULT_SETTINGS, SETTINGS_KEY };