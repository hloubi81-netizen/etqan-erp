import { THEMES, useTheme } from "@/hooks/useTheme.jsx";
import { Palette } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLang } from "@/hooks/useLang.jsx";

export default function ThemePicker() {
  const { theme, changeTheme } = useTheme();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent transition-colors"
        title={lang === "ar" ? "تغيير الثيم" : "Change Theme"}
      >
        <Palette className="h-3.5 w-3.5" />
        <span
          className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-sm"
          style={{ backgroundColor: THEMES[theme]?.preview }}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 w-52">
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">
            {lang === "ar" ? "لون الثيم" : "Theme Color"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => { changeTheme(key); setOpen(false); }}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all text-xs",
                  theme === key
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-border hover:bg-accent"
                )}
              >
                <span
                  className="h-7 w-7 rounded-full border-2 border-white/20 shadow"
                  style={{ backgroundColor: t.preview }}
                />
                <span className="font-medium">{lang === "ar" ? t.label : t.en}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}