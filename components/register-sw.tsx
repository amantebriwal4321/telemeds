"use client";

import { useEffect } from "react";

import { installEgressGuard } from "@/lib/egress";

export function RegisterServiceWorker() {
  useEffect(() => {
    installEgressGuard();
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* The page still runs if the cache worker does not install. */
    });
  }, []);
  return null;
}
