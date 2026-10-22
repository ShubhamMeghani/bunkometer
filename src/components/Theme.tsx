"use client";

import { useEffect, useSyncExternalStore } from "react";

// SPEC R44: Dark (default) / Light / System, remembered on this device. The inline script in the root
// layout applies it before first paint; these components change it and follow the OS in System mode.

type Pref = "dark" | "light" | "system";
const KEY = "theme";
const EVENT = "bunkometer:theme";

function readPref(): Pref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "system" ? v : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(pref: Pref) {
  const theme = pref === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : pref;
  document.documentElement.setAttribute("data-theme", theme);
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Keeps System mode in step with the OS while the app is open. Mounted once in the root layout. */
export function ThemeSync() {
  useEffect(() => {
    const mql = matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (readPref() === "system") applyTheme("system");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return null;
}

const OPTIONS: { value: Pref; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, readPref, () => "dark" as Pref);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Theme</legend>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 font-semibold ${
              pref === o.value ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2"
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={o.value}
              checked={pref === o.value}
              className="sr-only"
              onChange={() => {
                try {
                  localStorage.setItem(KEY, o.value);
                } catch {
                  // storage blocked: still apply for this visit
                }
                applyTheme(o.value);
                window.dispatchEvent(new Event(EVENT));
              }}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
