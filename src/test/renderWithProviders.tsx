import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider, type Locale } from "../context/LanguageContext";

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", locale = "en" }: { route?: string; locale?: Locale } = {}
): RenderResult {
  return render(
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LanguageProvider initialLocale={locale}>{ui}</LanguageProvider>
    </MemoryRouter>
  );
}
