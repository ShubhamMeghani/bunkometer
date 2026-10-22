"use client";

import { useEffect } from "react";

/** Registers the app-shell service worker in production builds (SPEC R47). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a nice-to-have; the app works without it.
    });
  }, []);
  return null;
}

/** Forget cached pages, e.g. on sign-out on a shared phone. */
export async function clearPageCache(): Promise<void> {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith("bunkometer-pages")).map((k) => caches.delete(k)));
}
