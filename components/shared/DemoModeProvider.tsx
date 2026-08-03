"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "mr-demo-mode";

// localStorage-backed external store. Default is OFF now that production eBay
// keys are live — a first-time visitor should see real marketplace data, not
// synthetic fixtures. Old visitors who deliberately toggled it ON keep their
// preference (localStorage takes precedence over the default).
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
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot(): boolean {
  return false;
}

type DemoModeContextValue = {
  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
};

const DemoModeContext = createContext<DemoModeContextValue>({
  demoMode: false,
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
