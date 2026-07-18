import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@/portal/bootstrap";

// Prevent the browser from restoring scroll position on navigation (SPA + bfcache).
if (typeof window !== "undefined" && "scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

createRoot(document.getElementById("root")!).render(<App />);
