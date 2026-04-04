import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("hw_pwa_dismissed") === "1";
  });
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }
    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || dismissed || !deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("hw_pwa_dismissed", "1");
  }

  return (
    <div
      className="fixed bottom-16 md:bottom-0 inset-x-0 z-50 flex items-center gap-3 px-4 py-3 bg-blue-700 text-white shadow-lg"
      data-testid="pwa-install-prompt"
      role="complementary"
      aria-label="Install app prompt"
    >
      <span className="text-lg flex-shrink-0">📱</span>
      <p className="flex-1 text-sm font-medium leading-snug">
        Add to Home Screen for the best experience
      </p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={handleInstall}
          className="bg-white text-blue-700 hover:bg-blue-50 text-xs h-8 font-semibold px-3"
          data-testid="pwa-install-btn"
        >
          Install
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="text-blue-100 hover:text-white hover:bg-blue-600 text-xs h-8 px-3"
          data-testid="pwa-dismiss-btn"
        >
          Maybe Later
        </Button>
      </div>
    </div>
  );
}
