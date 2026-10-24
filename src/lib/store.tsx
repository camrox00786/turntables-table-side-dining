import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { seedState } from "./demo-data";
import type { ActiveOffer, CartLine, Weather } from "./types";

/**
 * Demo adapter: all state lives in the browser (localStorage) and syncs across tabs.
 * Replace `load`/`save` with backend calls (with row-level security per venue) for production.
 */
export interface CustomerSession {
  weather: Weather | null;
  activeOffer?: ActiveOffer;
  offerHistory: Record<string, "expired" | "dismissed" | "used">;
  spinCount: number;
  phone?: string;
  squadCode?: string;
  myName?: string;
  myOrderIds: string[];
  useLoyaltyReward: boolean;
}

export type AppState = ReturnType<typeof seedState> & {
  carts: Record<string, CartLine[]>;
  customer: CustomerSession;
};

const KEY = "turntables-demo-v1";

export function initialState(): AppState {
  return {
    ...seedState(),
    carts: {},
    customer: { weather: null, offerHistory: {}, spinCount: 0, myOrderIds: [], useLoyaltyReward: false },
  };
}

interface Ctx {
  state: AppState;
  set: (fn: (draft: AppState) => void) => void;
  reset: () => void;
  hydrated: boolean;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const skipSave = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      /* corrupted demo state: fall back to seed */
    }
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        skipSave.current = true;
        setState(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const set = useCallback((fn: (d: AppState) => void) => {
    setState((s) => {
      const d = structuredClone(s);
      fn(d);
      return d;
    });
  }, []);

  const reset = useCallback(() => setState(initialState()), []);

  return <StoreCtx.Provider value={{ state, set, reset, hydrated }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

export function cartKey(venueId: string, table: number, squadCode?: string) {
  return squadCode ? `squad:${squadCode}` : `${venueId}:${table}`;
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
