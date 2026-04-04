import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang.jsx";
import ThemePicker from "./ThemePicker";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang, toggle } = useLang();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3" role="banner">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-11 w-11 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground" aria-label="فتح القائمة">
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <ThemePicker />
          <Button
            variant="outline"
            size="sm"
            onClick={toggle}
            className="text-xs font-semibold px-3 h-11 min-h-[44px] gap-1.5"
            aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
          >
            <span className="text-base leading-none">{lang === 'ar' ? '🇬🇧' : '🇸🇦'}</span>
            {lang === 'ar' ? 'EN' : 'AR'}
          </Button>
        </header>

        {/* Main content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto" role="main">
          <Outlet />
        </main>
      </div>
    </div>);

}