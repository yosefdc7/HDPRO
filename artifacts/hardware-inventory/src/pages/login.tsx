import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("rj@rjhardware.ph");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("hw_logged_in") === "true") {
      setLocation("/dashboard");
    }
  }, [setLocation]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("hw_logged_in", "true");
      setLocation("/dashboard");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-800 to-blue-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="mx-auto bg-white/10 w-20 h-20 flex items-center justify-center rounded-3xl mb-4 shadow-lg">
            <span className="text-4xl">🔧</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Hardware Inventory Pro</h1>
          <p className="text-blue-200 mt-2 text-sm font-medium">RJ Hardware & Construction Supply</p>
        </div>

        <Card className="shadow-2xl border-none rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-slate-200 focus-visible:ring-blue-600"
                  data-testid="input-email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-slate-200 focus-visible:ring-blue-600"
                  data-testid="input-password"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold mt-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl transition-all duration-200 active:scale-95"
                data-testid="button-login"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-3 px-6 pb-6 pt-0">
            <button className="text-blue-600 text-sm font-medium hover:underline" data-testid="link-signup">
              Don't have an account? Sign Up
            </button>
          </CardFooter>
        </Card>

        <p className="text-center text-blue-300/60 text-xs mt-6">
          🇵🇭 Made for Philippine Hardware Stores
        </p>
      </div>
    </div>
  );
}
