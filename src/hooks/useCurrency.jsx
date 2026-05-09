import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState(() => localStorage.getItem("selectedCurrencyId") || "local");

  useEffect(() => {
    base44.entities.Currency.list().then(list => {
      setCurrencies(list || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedCurrencyId", selectedCurrencyId);
  }, [selectedCurrencyId]);

  const localCurrency = currencies.find(c => c.is_local);
  const selectedCurrency = selectedCurrencyId === "local"
    ? localCurrency
    : currencies.find(c => c.id === selectedCurrencyId);

  // Returns exchange rate to convert FROM a given currency name TO the selected display currency
  function getDisplayRate(fromCurrencyName) {
    if (!fromCurrencyName || !selectedCurrency) return 1;
    const fromCur = currencies.find(c => c.name === fromCurrencyName);
    if (!fromCur) return 1;
    if (fromCur.id === selectedCurrency.id) return 1;

    // Convert via local currency as pivot
    const fromRate = fromCur.is_local ? 1 : (fromCur.exchange_rate || 1);
    const toRate = selectedCurrency.is_local ? 1 : (selectedCurrency.exchange_rate || 1);
    return fromRate / toRate;
  }

  function isLocalCurrency() {
    return !selectedCurrency || selectedCurrency?.is_local;
  }

  return (
    <CurrencyContext.Provider value={{
      currencies,
      selectedCurrencyId,
      setSelectedCurrencyId,
      selectedCurrency,
      localCurrency,
      getDisplayRate,
      isLocalCurrency,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}