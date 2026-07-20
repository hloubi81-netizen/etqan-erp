import { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export const THEMES = {
  blue: {
    label: "أزرق",
    en: "Blue",
    preview: "#1d4ed8",
    vars: {
      "--primary": "217 91% 40%",
      "--primary-foreground": "0 0% 100%",
      "--sidebar-background": "222 47% 11%",
      "--sidebar-primary": "217 91% 60%",
      "--sidebar-accent": "217 33% 17%",
      "--ring": "217 91% 40%",
    },
  },
  green: {
    label: "أخضر",
    en: "Green",
    preview: "#16a34a",
    vars: {
      "--primary": "142 71% 35%",
      "--primary-foreground": "0 0% 100%",
      "--sidebar-background": "150 30% 10%",
      "--sidebar-primary": "142 71% 50%",
      "--sidebar-accent": "142 25% 16%",
      "--ring": "142 71% 35%",
    },
  },
  purple: {
    label: "بنفسجي",
    en: "Purple",
    preview: "#7c3aed",
    vars: {
      "--primary": "262 80% 50%",
      "--primary-foreground": "0 0% 100%",
      "--sidebar-background": "260 30% 10%",
      "--sidebar-primary": "262 80% 65%",
      "--sidebar-accent": "262 25% 18%",
      "--ring": "262 80% 50%",
    },
  },
  rose: {
    label: "وردي",
    en: "Rose",
    preview: "#e11d48",
    vars: {
      "--primary": "346 77% 49%",
      "--primary-foreground": "0 0% 100%",
      "--sidebar-background": "344 30% 10%",
      "--sidebar-primary": "346 77% 62%",
      "--sidebar-accent": "344 25% 17%",
      "--ring": "346 77% 49%",
    },
  },
  orange: {
    label: "برتقالي",
    en: "Orange",
    preview: "#ea580c",
    vars: {
      "--primary": "24 90% 45%",
      "--primary-foreground": "0 0% 100%",
      "--sidebar-background": "22 30% 10%",
      "--sidebar-primary": "24 90% 58%",
      "--sidebar-accent": "22 25% 17%",
      "--ring": "24 90% 45%",
    },
  },
  slate: {
    label: "رمادي",
    en: "Slate",
    preview: "#475569",
    vars: {
      "--primary": "215 25% 35%",
      "--primary-foreground": "0 0% 100%",
      "--sidebar-background": "215 28% 10%",
      "--sidebar-primary": "215 25% 55%",
      "--sidebar-accent": "215 20% 17%",
      "--ring": "215 25% 35%",
    },
  },
};

const ThemeContext = createContext(null);

function applyTheme(themeKey) {
  const theme = THEMES[themeKey];
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem("appTheme") || "blue");

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // When the authenticated user loads, sync their saved theme preference.
  useEffect(() => {
    if (user?.theme && THEMES[user.theme] && user.theme !== theme) {
      setTheme(user.theme);
      localStorage.setItem("appTheme", user.theme);
    }
  }, [user]);

  async function changeTheme(key) {
    setTheme(key);
    localStorage.setItem("appTheme", key);
    // Persist to the user's profile so it applies across devices/sessions.
    try {
      await base44.auth.updateMe({ theme: key });
    } catch (e) {
      console.error("Failed to persist theme to user profile", e);
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}