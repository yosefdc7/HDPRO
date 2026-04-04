import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("rj@rjhardware.ph");
  const [password, setPassword] = useState("••••••••");

  useEffect(() => {
    if (localStorage.getItem("hw_logged_in") === "true") {
      setLocation("/dashboard");
    }
  }, [setLocation]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("hw_logged_in", "true");
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto bg-blue-50 w-16 h-16 flex items-center justify-center rounded-2xl mb-2">
            <span className="text-3xl">🔧📦</span>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900" data-testid="title-login">
            Hardware Inventory Pro
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Built for Filipino Hardware Stores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email Address</Label>
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
              <Label htmlFor="password" className="text-slate-700">Password</Label>
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
              className="w-full h-12 text-base font-semibold mt-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg"
              data-testid="button-login"
            >
              Log In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-6">
          <button className="text-blue-600 text-sm font-medium hover:underline" data-testid="link-signup">
            Don't have an account? Sign Up
          </button>
          <p className="text-xs text-slate-400 font-medium">
            🇵🇭 Made for Philippine Hardware Stores
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
