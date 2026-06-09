import { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export const FEATURE_LABELS = {
  accounting: "المحاسبة",
  invoices: "الفواتير",
  vouchers: "السندات",
  warehouses: "المخازن",
  costs: "التكاليف",
  branches: "الفروع",
  reports: "التقارير",
  financial: "القوائم المالية",
  users: "المستخدمون",
};

export const PLAN_PRESETS = {
  free_trial: {
    label: "تجريبي مجاني",
    max_users: 999,
    duration_months: 3,
    color: "bg-amber-100 text-amber-700",
    features: {
      accounting: true,
      invoices: true,
      vouchers: true,
      warehouses: true,
      costs: true,
      branches: true,
      reports: true,
      financial: true,
      users: true,
    },
  },
  basic: {
    label: "أساسي",
    max_users: 2,
    color: "bg-blue-100 text-blue-700",
    features: {
      accounting: true,
      invoices: true,
      vouchers: true,
      warehouses: false,
      costs: false,
      branches: false,
      reports: true,
      financial: false,
      users: false,
    },
  },
  advanced: {
    label: "متقدم",
    max_users: 10,
    color: "bg-purple-100 text-purple-700",
    features: {
      accounting: true,
      invoices: true,
      vouchers: true,
      warehouses: true,
      costs: true,
      branches: false,
      reports: true,
      financial: true,
      users: true,
    },
  },
  enterprise: {
    label: "شامل",
    max_users: 999,
    color: "bg-emerald-100 text-emerald-700",
    features: {
      accounting: true,
      invoices: true,
      vouchers: true,
      warehouses: true,
      costs: true,
      branches: true,
      reports: true,
      financial: true,
      users: true,
    },
  },
};

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);

  useEffect(() => {
    base44.entities.Subscription.filter({ is_active: true }, "-created_date", 1)
      .then(list => {
        if (list.length > 0) setSubscription(list[0]);
        setSubscriptionLoaded(true);
      })
      .catch(() => { setSubscriptionLoaded(true); });
  }, []);

  function hasFeature(key) {
    if (!subscription) return true; // no subscription = full access (admin mode)
    return !!(subscription.features?.[key]);
  }

  return (
    <SubscriptionContext.Provider value={{ subscription, hasFeature, subscriptionLoaded }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}