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
      
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-3 py-2.5 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <ThemePicker />
          <Button
            variant="outline"
            size="sm"
            onClick={toggle}
            className="text-xs font-semibold px-2.5 h-8 gap-1"
          >
            <span className="text-sm leading-none">{lang === 'ar' ? '🇬🇧' : '🇸🇦'}</span>
            <span className="hidden sm:inline">{lang === 'ar' ? 'EN' : 'AR'}</span>
          </Button>
        </header>

        {/* Main content */}
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>);

}