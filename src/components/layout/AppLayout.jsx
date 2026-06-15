import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang.jsx";
import ThemePicker from "./ThemePicker";
import { base44 } from "@/api/base44Client";
import GlobalSearch from "./GlobalSearch";
import TutorialButton from "@/components/shared/TutorialButton";
import PageAccessGuard from "@/components/shared/PageAccessGuard";
import { cn } from "@/lib/utils";
import OnboardingGuide from "@/components/assistant/OnboardingGuide";
import Onboarding from "@/pages/Onboarding";
import { useSubscription } from "@/hooks/useSubscription.jsx";
import SubscriptionExpiryBanner from "@/components/subscriptions/SubscriptionExpiryBanner";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang, toggle } = useLang();
  const [user, setUser] = useState(null);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const { subscription, subscriptionLoaded } = useSubscription() || {};

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Show onboarding only if:
  // 1. Subscription data is loaded
  // 2. No subscription found
  // 3. User is loaded and is admin (non-admins are invited users who join an existing subscription)
  // 4. Onboarding not yet completed this session
  const isAdmin = user?.role === "admin";
  const needsOnboarding = subscriptionLoaded && !subscription && !onboardingDone && !!user && isAdmin;

  if (needsOnboarding) {
    return <Onboarding onComplete={() => { setOnboardingDone(true); window.location.reload(); }} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Office-style top ribbon */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          {/* Main toolbar */}
          <div className="flex items-center gap-2 px-4 py-2">
            {/* Hamburger for mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 rounded hover:bg-gray-100 text-gray-600"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* App name pill */}
            <div className="hidden lg:flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold">
              <span>ETQAN</span>
            </div>

            {/* Global Search */}
            <div className="flex-1 max-w-sm">
              <GlobalSearch />
            </div>

            <div className="flex-1" />

            {/* Right actions */}
            <div className="flex items-center gap-1">
              <ThemePicker />

              <Button
                variant="ghost"
                size="sm"
                onClick={toggle}
                className="text-xs font-semibold px-2 h-8 text-gray-600 hover:bg-gray-100"
              >
                <span className="text-sm">{lang === 'ar' ? '🇬🇧' : '🇸🇦'}</span>
                <span className="hidden sm:inline mr-1">{lang === 'ar' ? 'EN' : 'AR'}</span>
              </Button>

              <button className="relative p-1.5 rounded hover:bg-gray-100 text-gray-500">
                <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              </button>

              {/* User pill */}
              {user && (
                <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                  <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user.full_name?.charAt(0) || user.email?.charAt(0) || "؟"}
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-semibold text-gray-700 leading-tight">{user.full_name || "مستخدم"}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{user.email}</p>
                  </div>
                  <ChevronDown className="h-3 w-3 text-gray-400 hidden sm:block" />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Subscription Expiry Banner */}
        <SubscriptionExpiryBanner />

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <PageAccessGuard>
            <Outlet />
          </PageAccessGuard>
        </main>
      </div>

      {/* Tutorial Button - appears on all pages */}
      <TutorialButton />

      {/* Onboarding */}
      <OnboardingGuide />
    </div>
  );
}