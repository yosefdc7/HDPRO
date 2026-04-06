import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react/src/custom-fetch";

// We set this once here. Because Vite proxies /api to port 3000 automatically, 
// using just "/api" works perfectly offline and online.
setBaseUrl("/api");

// If we introduce real JWTs or staff PIN session ids, we grab it here
setAuthTokenGetter(() => {
  return localStorage.getItem("hw_logged_in") === "true" ? "mock_token_for_now" : null;
});

// Re-export the useful hooks so the UI components can just import from "@/lib/api"
export * from "@workspace/api-client-react";
