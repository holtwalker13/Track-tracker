"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ScopeChangeGuardSheet } from "@/components/coach-scope/scope-change-guard-sheet";

export type CoachScopeDirtyGuard = {
  isDirty: () => boolean;
  save: () => Promise<boolean>;
};

type PendingSwitch = () => void;

const CoachScopeDirtyContext = createContext<{
  registerGuard: (guard: CoachScopeDirtyGuard | null) => void;
  requestScopeChange: (apply: PendingSwitch) => void;
} | null>(null);

export function CoachScopeDirtyProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<CoachScopeDirtyGuard | null>(null);
  const [guardOpen, setGuardOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const pendingApplyRef = useRef<PendingSwitch | null>(null);

  const registerGuard = useCallback((guard: CoachScopeDirtyGuard | null) => {
    guardRef.current = guard;
  }, []);

  const requestScopeChange = useCallback((apply: PendingSwitch) => {
    const guard = guardRef.current;
    if (!guard?.isDirty()) {
      apply();
      return;
    }
    pendingApplyRef.current = apply;
    setGuardOpen(true);
  }, []);

  const closeGuard = useCallback(() => {
    setGuardOpen(false);
    pendingApplyRef.current = null;
  }, []);

  const value = useMemo(
    () => ({ registerGuard, requestScopeChange }),
    [registerGuard, requestScopeChange]
  );

  return (
    <CoachScopeDirtyContext.Provider value={value}>
      {children}
      <ScopeChangeGuardSheet
        open={guardOpen}
        onClose={closeGuard}
        saving={saving}
        onKeepEditing={closeGuard}
        onDiscardAndSwitch={() => {
          const next = pendingApplyRef.current;
          closeGuard();
          next?.();
        }}
        onSaveAndSwitch={async () => {
          const guard = guardRef.current;
          const next = pendingApplyRef.current;
          if (!guard || !next) {
            closeGuard();
            return;
          }
          setSaving(true);
          const ok = await guard.save();
          setSaving(false);
          if (!ok) return;
          closeGuard();
          next();
        }}
      />
    </CoachScopeDirtyContext.Provider>
  );
}

export function useCoachScopeDirtyContext() {
  return useContext(CoachScopeDirtyContext);
}

export function useRegisterCoachScopeDirtyGuard(guard: CoachScopeDirtyGuard | null) {
  const ctx = useCoachScopeDirtyContext();
  const guardRef = useRef(guard);
  guardRef.current = guard;

  const stable = useMemo(
    () =>
      guard
        ? {
            isDirty: () => guardRef.current?.isDirty() ?? false,
            save: () => guardRef.current?.save() ?? Promise.resolve(true),
          }
        : null,
    [guard]
  );

  useEffect(() => {
    ctx?.registerGuard(stable);
    return () => ctx?.registerGuard(null);
  }, [ctx, stable]);
}
