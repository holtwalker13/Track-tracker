"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type MedalClassNavigationContextValue = {
  pending: boolean;
  beginMedalScopeReload: () => void;
};

const MedalClassNavigationContext = createContext<MedalClassNavigationContextValue | null>(
  null
);

function MedalClassNavigationProviderInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const scopeKey = `${searchParams.get("classId") ?? ""}|${searchParams.get("subgroupId") ?? ""}`;
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [scopeKey]);

  const beginMedalScopeReload = useCallback(() => {
    setPending(true);
  }, []);

  const value = useMemo(
    () => ({ pending, beginMedalScopeReload }),
    [pending, beginMedalScopeReload]
  );

  return (
    <MedalClassNavigationContext.Provider value={value}>
      {children}
    </MedalClassNavigationContext.Provider>
  );
}

export function MedalClassNavigationProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <MedalClassNavigationProviderInner>{children}</MedalClassNavigationProviderInner>
    </Suspense>
  );
}

export function useMedalClassNavigation() {
  const ctx = useContext(MedalClassNavigationContext);
  if (!ctx) {
    return {
      pending: false,
      beginMedalScopeReload: () => {},
    };
  }
  return ctx;
}

const LOADING_LAYERS = [
  { height: "h-36", delay: "0s" },
  { height: "h-52", delay: "0.8s" },
  { height: "h-72", delay: "1.6s" },
  { height: "h-44", delay: "2.4s" },
] as const;

/** Fades medal-scoped sections and shows slow gradient placeholders while class scope reloads. */
export function MedalScopeLoadingShell({ children }: { children: ReactNode }) {
  const { pending } = useMedalClassNavigation();

  return (
    <div className="relative" aria-busy={pending || undefined}>
      <div
        className={cn(
          "transition-[opacity,filter] duration-500 ease-out",
          pending && "pointer-events-none select-none opacity-[0.08] blur-[3px]"
        )}
      >
        {children}
      </div>
      {pending ? (
        <div
          className="absolute inset-0 z-20 flex flex-col gap-4 pt-1"
          aria-live="polite"
          aria-label="Loading class data"
        >
          {LOADING_LAYERS.map((layer, index) => (
            <div
              key={index}
              className={cn(
                "medal-scope-loading-layer rounded-2xl border border-card-border/30",
                layer.height
              )}
              style={{ animationDelay: layer.delay }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
