import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("hw_logged_in") === "true";
    if (!isLoggedIn) {
      setLocation("/login");
    } else {
      setIsChecking(false);
    }
  }, [setLocation]);

  if (isChecking) return null;

  return <>{children}</>;
}
