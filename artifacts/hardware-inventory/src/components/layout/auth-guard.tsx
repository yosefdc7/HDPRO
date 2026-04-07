import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("hw_logged_in") === "true";
    if (!isLoggedIn) {
      setLocation("/login");
      return;
    }
    setReady(true);
  }, [setLocation]);

  if (!ready) return null;

  return <>{children}</>;
}
