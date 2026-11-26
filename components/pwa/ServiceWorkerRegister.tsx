"use client";

import { useEffect } from "react";

/** Enregistre le service worker (page hors connexion + notifications push). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((e) => {
      console.warn("Service worker non enregistré", e);
    });
  }, []);
  return null;
}
