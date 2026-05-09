import { createContext, useContext, useState, useEffect } from "react";
import { formatNumber, formatCurrency } from "@/lib/utils";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "ar");

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    localStorage.setItem("lang", lang);
  }, [lang]);

  function toggle() {
    setLang(l => l === "ar" ? "en" : "ar");
  }

  const fNum = (value, options) => formatNumber(value, lang, options);
  const fCur = (value, decimals) => formatCurrency(value, lang, decimals);

  return (
    <LangContext.Provider value={{ lang, toggle, isRTL: lang === "ar", fNum, fCur }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}