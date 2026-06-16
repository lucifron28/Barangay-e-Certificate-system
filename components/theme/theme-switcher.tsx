"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";

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

export function ThemeSwitcher() {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    const initialTheme = readStoredTheme();

    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  function handleThemeChange(nextTheme: string) {
    setTheme(nextTheme);
    window.localStorage.setItem("barangay-bato-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <label className="form-control w-full max-w-44">
      <span className="label py-0 text-xs">
        <span className="label-text inline-flex items-center gap-1 text-xs">
          <Palette className="size-3.5" aria-hidden />
          Theme
        </span>
      </span>
      <select
        className="select select-bordered select-sm"
        value={theme}
        onChange={(event) => handleThemeChange(event.target.value)}
        aria-label="Theme"
      >
        {THEMES.map((item) => (
          <option value={item} key={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}
