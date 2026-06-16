"use client";

import { useEffect } from "react";

const THEMES = [
  "barangay-bato",
  "light",
  "corporate",
  "winter",
  "business",
  "night",
] as const;
const DEFAULT_THEME = "barangay-bato";
type ThemeName = (typeof THEMES)[number];

function readStoredTheme(): ThemeName {
  const storedTheme = window.localStorage.getItem("barangay-bato-theme");
  return THEMES.includes(storedTheme as ThemeName)
    ? (storedTheme as ThemeName)
    : DEFAULT_THEME;
}

export function ThemeInitializer() {
  useEffect(() => {
    document.documentElement.dataset.theme = readStoredTheme();
  }, []);

  return null;
}
