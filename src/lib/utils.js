import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

export const isIframe = window.self !== window.top;

/**
 * تنسيق الأرقام حسب اللغة
 * ar → أرقام عربية هندية (٠١٢٣...)
 * en → أرقام لاتينية (0123...)
 */
export function formatNumber(value, lang = "ar", options = {}) {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return value;
  return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", options).format(num);
}

export function formatCurrency(value, lang = "ar", decimals = 2) {
  return formatNumber(value, lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}