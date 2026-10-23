"use client";

import { useState, useSyncExternalStore } from "react";
import { STAFF_THEME_COOKIE, type StaffTheme } from "@/lib/staff-theme";

const QUERY = "(prefers-color-scheme: light)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function deviceTheme(): StaffTheme {
  return window.matchMedia(QUERY).matches ? "light" : "dark";
}

function serverTheme(): StaffTheme {
  return "dark";
}

function applyTheme(theme: StaffTheme) {
  document.cookie = `${STAFF_THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  document.querySelector(".staff-body")?.setAttribute("data-theme", theme);
}

export function ThemeToggle({ initial }: { initial: StaffTheme | null }) {
  const [chosen, setChosen] = useState<StaffTheme | null>(initial);
  const device = useSyncExternalStore(subscribe, deviceTheme, serverTheme);
  const current = chosen ?? device;

  function choose(theme: StaffTheme) {
    setChosen(theme);
    applyTheme(theme);
  }

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="inline-flex rounded-md border border-staff-line p-0.5 text-xs uppercase tracking-[0.14em]"
    >
      {(["light", "dark"] as const).map((theme) => (
        <button
          key={theme}
          type="button"
          onClick={() => choose(theme)}
          aria-pressed={current === theme}
          className={`rounded px-2.5 py-1 ${
            current === theme ? "bg-staff-accent text-staff-bg" : "text-staff-muted"
          }`}
        >
          {theme === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}
