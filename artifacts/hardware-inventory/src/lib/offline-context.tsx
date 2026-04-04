import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface OfflineContextValue {
  isOffline: boolean;
  isSyncing: boolean;
  wasSynced: boolean;
  setSimulateOffline: (val: boolean) => void;
  simulateOffline: boolean;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOffline: false,
  isSyncing: false,
  wasSynced: false,
  setSimulateOffline: () => {},
  simulateOffline: false,
});

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine);
  const [simulateOffline, setSimulateOfflineState] = useState(() => {
    return localStorage.getItem("hw_simulate_offline") === "1";
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [wasSynced, setWasSynced] = useState(false);

  const isOffline = !networkOnline || simulateOffline;

  function triggerSyncSequence() {
    setIsSyncing(true);
    setWasSynced(false);
    setTimeout(() => {
      setIsSyncing(false);
      setWasSynced(true);
      setTimeout(() => setWasSynced(false), 2000);
    }, 2000);
  }

  useEffect(() => {
    function onOffline() { setNetworkOnline(false); }
    function onOnline() {
      setNetworkOnline(true);
      if (!simulateOffline) {
        triggerSyncSequence();
      }
    }
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [simulateOffline]);

  const setSimulateOffline = useCallback((val: boolean) => {
    setSimulateOfflineState(val);
    localStorage.setItem("hw_simulate_offline", val ? "1" : "0");
    if (!val && networkOnline) {
      triggerSyncSequence();
    }
  }, [networkOnline]);

  return (
    <OfflineContext.Provider value={{ isOffline, isSyncing, wasSynced, setSimulateOffline, simulateOffline }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
