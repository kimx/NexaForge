import { act, waitFor } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { Suspense } from "react";
import { MemoryRouter } from "react-router-dom";
import { ToolFrame } from "./App";
import { LanguageProvider } from "./context/LanguageContext";

let serverRendering = false;
let routeReady = false;
let resolveRoute: (() => void) | undefined;
let routePromise: Promise<void>;

function SlowRoute(): JSX.Element {
  if (!serverRendering && !routeReady) {
    throw routePromise;
  }

  return <p>Hydrated route content</p>;
}

function HydrationFrame(): JSX.Element {
  return (
    <MemoryRouter
      initialEntries={["/en/pdf/add-page-numbers"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LanguageProvider initialLocale="en">
        <ToolFrame>
          <SlowRoute />
        </ToolFrame>
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe("ToolFrame hydration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    serverRendering = false;
    routeReady = false;
    resolveRoute = undefined;
  });

  it("keeps a deferred route hydrated while the mobile chrome updates", async () => {
    serverRendering = true;
    routePromise = new Promise<void>((resolve) => {
      resolveRoute = resolve;
    });
    const serverWarnings = vi.spyOn(console, "error").mockImplementation(() => {});
    let markup: string;
    try {
      markup = renderToString(<HydrationFrame />);
    } finally {
      serverWarnings.mockRestore();
    }
    serverRendering = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
    );

    const container = document.createElement("div");
    container.innerHTML = markup;
    document.body.append(container);
    const recoverableErrors: string[] = [];
    let root: Root | undefined;
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    try {
      await act(async () => {
        root = hydrateRoot(container, <HydrationFrame />, {
          onRecoverableError: (error) =>
            recoverableErrors.push(error instanceof Error ? error.message : String(error)),
        });
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      });

      expect(recoverableErrors).toEqual([]);
      await waitFor(() => {
        expect(container.querySelector(".header-tools-button")).toBeInTheDocument();
      });
      expect(container).toHaveTextContent("Hydrated route content");

      await act(async () => {
        routeReady = true;
        resolveRoute?.();
        await routePromise;
      });

      expect(container).toHaveTextContent("Hydrated route content");
    } finally {
      await act(async () => root?.unmount());
      scrollTo.mockRestore();
      container.remove();
    }
  });
});
