import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu, Bell, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang.jsx";
import ThemePicker from "./ThemePicker";
import { base44 } from "@/api/base44Client";
import { useEffect } from "react";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang, toggle } = useLang();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
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
              <span>اتقان</span>
            </div>

            {/* Search bar */}
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث..."
                  className="w-full pr-9 pl-3 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                />
              </div>
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

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}