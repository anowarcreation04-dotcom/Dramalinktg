import { useEffect, useState } from "react";

const KEY = "neonflix:theme";
export type Theme = "dark" | "light";

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    let initial: Theme = "dark";
    try {
      const saved = localStorage.getItem(KEY) as Theme | null;
      if (saved === "light" || saved === "dark") initial = saved;
    } catch {}
    setTheme(initial);
    apply(initial);
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      apply(next);
      try { localStorage.setItem(KEY, next); } catch {}
      return next;
    });
  };

  return { theme, toggle };
}
