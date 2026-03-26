import { useState, useEffect, createContext, useContext } from "react";
import { base44 } from "@/api/base44Client";

// ─── Plan presets ─────────────────────────────────────────
export const PLAN_PRESETS = {
  basic: {
    label: "الأساسي",
    color: "bg-blue-100 text-blue-700",
    features: {
      accounting: false,
      invoices:   true,
      vouchers:   false,
      warehouses: true,
      costs:      false,
      branches:   false,
      reports:    true,
      financial:  false,
      users:      false,
    },
    max_users: 2,
  },
  advanced: {
    label: "المتقدم",
    color: "bg-purple-100 text-purple-700",
    features: {
      accounting: true,
      invoices:   true,
      vouchers:   true,
      warehouses: true,
      costs:      false,
      branches:   false,
      reports:    true,
      financial:  true,
      users:      true,
    },
    max_users: 10,
  },
  enterprise: {
    label: "الشامل",
    color: "bg-emerald-100 text-emerald-700",
    features: {
      accounting: true,
      invoices:   true,
      vouchers:   true,
      warehouses: true,
      costs:      true,
      branches:   true,
      reports:    true,
      financial:  true,
      users:      true,
    },
    max_users: 999,
  },
};

export const FEATURE_LABELS = {
  accounting: "المحاسبة",
  invoices:   "الفواتير",
  vouchers:   "السندات",
  warehouses: "المخازن والمواد",
  costs:      "نظام التكاليف",
  branches:   "الفروع والمعارض",
  reports:    "التقارير",
  financial:  "القوائم المالية",
  users:      "إدارة المستخدمين",
};

// ─── Context ──────────────────────────────────────────────
const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Subscription.list("-created_date", 1).then((list) => {
      setSubscription(list[0] || null);
      setLoading(false);
    });
  }, []);

  function hasFeature(feature) {
    if (!subscription || !subscription.is_active) return true;
    return !!(subscription.features?.[feature]);
  }

  return (
    <SubscriptionContext.Provider value={{ subscription, setSubscription, hasFeature, loading }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}