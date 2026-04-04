import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface OfflineContextValue {
  isOffline: boolean;
  isSyncing: boolean;
  setSimulateOffline: (val: boolean) => void;
  simulateOffline: boolean;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOffline: false,
  isSyncing: false,
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

  useEffect(() => {
    function onOffline() { setNetworkOnline(false); }
    function onOnline() {
      setNetworkOnline(true);
      if (!simulateOffline) {
        setIsSyncing(true);
        setTimeout(() => {
          setIsSyncing(false);
          setWasSynced(true);
          setTimeout(() => setWasSynced(false), 3000);
        }, 1500);
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
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
        setWasSynced(true);
        setTimeout(() => setWasSynced(false), 3000);
      }, 1500);
    }
  }, [networkOnline]);

  return (
    <OfflineContext.Provider value={{ isOffline, isSyncing, setSimulateOffline, simulateOffline }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
