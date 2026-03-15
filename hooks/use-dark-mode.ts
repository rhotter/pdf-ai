import { useState, useEffect } from "react";

export function useDarkMode(themePref: "system" | "light" | "dark") {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (themePref === "light") {
      setIsDark(false);
      return;
    }
    if (themePref === "dark") {
      setIsDark(true);
      return;
    }

    // System preference
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themePref]);

  return isDark;
}
