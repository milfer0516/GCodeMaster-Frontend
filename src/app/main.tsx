import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./globals.css";

// ── Inicializar tema antes de renderizar ──────────────────────────
const savedTheme = window.localStorage.getItem("gcodemaster-theme") ?? "dark";
document.documentElement.dataset.theme = savedTheme;
document.documentElement.classList.toggle("dark", savedTheme === "dark");
// ─────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
