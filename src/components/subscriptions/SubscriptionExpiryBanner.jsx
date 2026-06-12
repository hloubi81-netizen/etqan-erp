import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription.jsx";
import { useNavigate } from "react-router-dom";

export default function SubscriptionExpiryBanner() {
  const { subscription } = useSubscription() || {};
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (!subscription?.expiry_date || dismissed) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(subscription.expiry_date);
  expiry.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysLeft > 7 || daysLeft < 0) return null;

  const isUrgent = daysLeft <= 2;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${
      isUrgent
        ? "bg-red-600 text-white"
        : "bg-amber-500 text-white"
    }`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {daysLeft === 0
          ? "اشتراكك ينتهي اليوم! جدد الآن لتجنب توقف النظام."
          : daysLeft === 1
          ? "اشتراكك ينتهي غداً! جدد الآن لتجنب توقف النظام."
          : `اشتراكك ينتهي خلال ${daysLeft} أيام — جدد باقتك لتجنب توقف النظام.`}
      </span>
      <button
        onClick={() => navigate("/select-plan")}
        className="shrink-0 bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-bold transition-colors"
      >
        تجديد الآن
      </button>
      <button onClick={() => setDismissed(true)} className="shrink-0 opacity-80 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}