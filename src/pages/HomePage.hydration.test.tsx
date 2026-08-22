import { act } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../context/LanguageContext";
import { HomePage } from "./HomePage";

function homeTree(): JSX.Element {
  return (
    <MemoryRouter
      initialEntries={["/en"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LanguageProvider initialLocale="en">
        <HomePage />
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe("HomePage hydration", () => {
  it("keeps the first client render equal to SSR when recent tools are stored", async () => {
    window.localStorage.removeItem("nexaforge-recent-tools");
    const container = document.createElement("div");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    container.innerHTML = renderToString(homeTree());
    consoleError.mockClear();
    document.body.append(container);
    window.localStorage.setItem(
      "nexaforge-recent-tools",
      JSON.stringify(["json-formatter"])
    );
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(container, homeTree());
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    const messages = consoleError.mock.calls.flat().map(String).join("\n");
    await act(async () => root?.unmount());
    container.remove();
    consoleError.mockRestore();
    expect(messages).not.toMatch(/hydration|did not match|server html/i);
  });
});
