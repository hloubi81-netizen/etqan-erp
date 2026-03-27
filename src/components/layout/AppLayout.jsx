import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/useLang.jsx";
import ThemePicker from "./ThemePicker";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { lang, toggle } = useLang();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
          






          
          <div className="flex-1" />
          <ThemePicker />
          <Button
            variant="outline"
            size="sm"
            onClick={toggle}
            className="text-xs font-semibold px-3 h-8 gap-1.5"
          >
            <span className="text-base leading-none">{lang === 'ar' ? '🇬🇧' : '🇸🇦'}</span>
            {lang === 'ar' ? 'EN' : 'AR'}
          </Button>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>);

}