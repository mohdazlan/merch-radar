"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "mr-demo-mode";

// localStorage-backed external store: SSR renders Demo Mode ON (the default
// so the app is fully testable with no API keys), the client re-reads on mount.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) !== "false";
}

function getServerSnapshot(): boolean {
  return true;
}

type DemoModeContextValue = {
  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
};

const DemoModeContext = createContext<DemoModeContextValue>({
  demoMode: true,
  setDemoMode: () => {},
});

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const demoMode = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setDemoMode = useCallback((on: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, String(on));
    listeners.forEach((cb) => cb());
  }, []);

  return (
    <DemoModeContext.Provider value={{ demoMode, setDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
