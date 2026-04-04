import { useEffect, useState } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    localStorage.setItem("hw_logged_in", "true");
    setReady(true);
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
