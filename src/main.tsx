import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./styles/issue23-tools.css";
import "./styles/issue26-tools.css";
import { LanguageProvider } from "./context/LanguageContext";
import { canHydratePrerenderedRoot } from "./routing/hydration";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("NexaForge root element was not found.");
}

const app = (
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if (
  canHydratePrerenderedRoot({
    hasContent: rootElement.hasChildNodes(),
    prerenderPath: rootElement.dataset.prerenderPath,
    currentPath: window.location.pathname,
  })
) {
  hydrateRoot(rootElement, app);
} else {
  rootElement.replaceChildren();
  createRoot(rootElement).render(app);
}
