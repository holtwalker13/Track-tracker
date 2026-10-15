"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

function externalHttpUrl(href: string): string | null {
  if (!href || href.startsWith("#")) return null;
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin === window.location.origin) return null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url.toString();
}

/** Native chrome for the Capacitor shell. No-ops in a normal browser. */
export function NativeRuntime() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
    void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);

    const stateListener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) router.refresh();
    });

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const external = externalHttpUrl(anchor.getAttribute("href") ?? "");
      if (!external) return;
      event.preventDefault();
      void Browser.open({ url: external });
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      void stateListener.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
