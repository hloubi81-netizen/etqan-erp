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
      "--button": "217 91% 40%",
      "--button-foreground": "0 0% 100%",
      "--button-hover": "217 91% 32%",
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
      "--button": "142 71% 35%",
      "--button-foreground": "0 0% 100%",
      "--button-hover": "142 71% 27%",
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
      "--button": "262 80% 50%",
      "--button-foreground": "0 0% 100%",
      "--button-hover": "262 80% 42%",
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
      "--button": "346 77% 49%",
      "--button-foreground": "0 0% 100%",
      "--button-hover": "346 77% 40%",
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
      "--button": "24 90% 45%",
      "--button-foreground": "0 0% 100%",
      "--button-hover": "24 90% 37%",
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
      "--button": "215 25% 35%",
      "--button-foreground": "0 0% 100%",
      "--button-hover": "215 25% 27%",
    },
  },
};

export const BUTTON_COLORS = {
  theme: {
    label: "لون الثيم",
    en: "Theme",
    preview: null,
  },
  blue: {
    label: "أزرق",
    en: "Blue",
    preview: "#1d4ed8",
    vars: { "--button": "217 91% 45%", "--button-hover": "217 91% 35%" },
  },
  green: {
    label: "أخضر",
    en: "Green",
    preview: "#16a34a",
    vars: { "--button": "142 71% 40%", "--button-hover": "142 71% 30%" },
  },
  red: {
    label: "أحمر",
    en: "Red",
    preview: "#dc2626",
    vars: { "--button": "0 72% 50%", "--button-hover": "0 72% 40%" },
  },
  amber: {
    label: "كهرماني",
    en: "Amber",
    preview: "#d97706",
    vars: { "--button": "38 92% 45%", "--button-hover": "38 92% 36%" },
  },
  teal: {
    label: "زيتي",
    en: "Teal",
    preview: "#0d9488",
    vars: { "--button": "173 80% 38%", "--button-hover": "173 80% 30%" },
  },
  purple: {
    label: "بنفسجي",
    en: "Purple",
    preview: "#7c3aed",
    vars: { "--button": "262 80% 50%", "--button-hover": "262 80% 42%" },
  },
  slate: {
    label: "رمادي",
    en: "Slate",
    preview: "#475569",
    vars: { "--button": "215 25% 40%", "--button-hover": "215 25% 30%" },
  },
};

const ThemeContext = createContext(null);

function applyTheme(themeKey, buttonColorKey) {
  const theme = THEMES[themeKey];
  if (!theme) return;
  const root = document.documentElement;
  // Apply theme base vars (includes default button vars)
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
  // Override button vars if user chose a custom button color
  if (buttonColorKey && buttonColorKey !== "theme" && BUTTON_COLORS[buttonColorKey]) {
    const bc = BUTTON_COLORS[buttonColorKey];
    Object.entries(bc.vars).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });
  }
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem("appTheme") || "blue");
  const [buttonColor, setButtonColor] = useState(() => localStorage.getItem("appButtonColor") || "theme");

  useEffect(() => {
    applyTheme(theme, buttonColor);
  }, [theme, buttonColor]);

  // When the authenticated user loads, sync their saved preferences.
  useEffect(() => {
    if (user?.theme && THEMES[user.theme] && user.theme !== theme) {
      setTheme(user.theme);
      localStorage.setItem("appTheme", user.theme);
    }
    if (user?.button_color && BUTTON_COLORS[user.button_color] && user.button_color !== buttonColor) {
      setButtonColor(user.button_color);
      localStorage.setItem("appButtonColor", user.button_color);
    }
  }, [user]);

  async function changeTheme(key) {
    setTheme(key);
    localStorage.setItem("appTheme", key);
    try {
      await base44.auth.updateMe({ theme: key });
    } catch (e) {
      console.error("Failed to persist theme to user profile", e);
    }
  }

  async function changeButtonColor(key) {
    setButtonColor(key);
    localStorage.setItem("appButtonColor", key);
    try {
      await base44.auth.updateMe({ button_color: key });
    } catch (e) {
      console.error("Failed to persist button color to user profile", e);
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, buttonColor, changeButtonColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}