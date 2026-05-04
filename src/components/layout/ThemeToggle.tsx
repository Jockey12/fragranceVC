"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("fragrancevc-theme") as Theme | null;
    const preferred: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const nextTheme = saved ?? preferred;

    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    window.localStorage.setItem("fragrancevc-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  return (
    <button
      className="rounded-full border border-white/45 bg-white/35 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-ink/62 transition hover:bg-white/65"
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark and light mode"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
