import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
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
      className="flex items-center gap-3 px-4 py-3 bg-blue-700 text-white"
      data-testid="pwa-install-prompt"
    >
      <span className="text-xl flex-shrink-0">🔧</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">Install Hardware Inventory Pro</p>
        <p className="text-xs text-blue-200 mt-0.5">Add to home screen for quick access</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={handleInstall}
          className="bg-white text-blue-700 hover:bg-blue-50 text-xs h-8 gap-1"
          data-testid="pwa-install-btn"
        >
          <Download className="h-3.5 w-3.5" />
          Install
        </Button>
        <button
          onClick={handleDismiss}
          className="text-blue-200 hover:text-white p-1 rounded"
          aria-label="Dismiss"
          data-testid="pwa-dismiss-btn"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
