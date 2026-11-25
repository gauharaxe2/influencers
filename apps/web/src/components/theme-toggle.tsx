"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  resolveTheme,
  type ThemeMode,
} from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = resolveTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    setTheme(initial);
    applyTheme(initial);
    setReady(true);
  }, []);

  function toggleTheme() {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      className={className ? `theme-toggle ${className}` : "theme-toggle"}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      disabled={!ready}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} width="18" height="18" />
      <span className="theme-toggle__label">{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
