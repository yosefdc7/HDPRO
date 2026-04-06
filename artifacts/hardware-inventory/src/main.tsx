import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./lib/api"; // Initialize api bindings before anything else
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
