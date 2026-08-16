import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { LanguageProvider } from "./context/LanguageContext";

const REDIRECT_KEY = "browser-file-tools:restore-route";

if (typeof window !== "undefined") {
  const restoreRoute = window.sessionStorage.getItem(REDIRECT_KEY);
  if (restoreRoute) {
    window.history.replaceState({}, "", restoreRoute);
    window.sessionStorage.removeItem(REDIRECT_KEY);
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
