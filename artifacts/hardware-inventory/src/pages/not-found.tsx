import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center space-y-4 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-7xl">🔧</div>
        <h1 className="text-3xl font-bold text-slate-900">Page Not Found</h1>
        <p className="text-slate-500">
          Looks like this aisle doesn't exist.
        </p>
        <Button
          onClick={() => navigate("/dashboard")}
          className="bg-blue-700 hover:bg-blue-800 text-white mt-4"
          data-testid="go-home-btn"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
