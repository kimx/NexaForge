import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./context/LanguageContext";

const ROUTE_HEADINGS: Record<string, string> = {
  "/": "NexaForge",
  "/image/resize": "Image Resize",
  "/image/crop": "Image Crop",
  "/image/convert": "Image Converter",
  "/image/compress": "Image Compress",
  "/image/exif-viewer": "EXIF Viewer",
  "/image/remove-exif": "Remove EXIF",
  "/pdf/merge": "PDF Merge",
  "/pdf/split": "PDF Split",
  "/pdf/rotate": "PDF Rotate",
  "/data/json-formatter": "JSON Formatter",
  "/data/csv-viewer": "CSV Viewer",
  "/data/csv-to-json": "CSV to JSON",
  "/data/json-to-csv": "JSON to CSV",
  "/developer/base64": "Base64",
  "/text/hash": "Hash Generator",
  "/text/uuid": "UUID Generator",
  "/text/word-counter": "Word Counter",
  "/text/case-converter": "Case Converter",
  "/text/remove-duplicate-lines": "Remove Duplicate Lines",
  "/text/sort-lines": "Sort Lines",
  "/text/markdown": "Markdown Preview",
  "/qr-code": "QR Code",
};

describe("App routes", () => {
  it.each(Object.entries(ROUTE_HEADINGS))("renders %s and updates page metadata", async (path, heading) => {
    render(
      <MemoryRouter
        initialEntries={[path]}
        initialIndex={0}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByRole("heading", { name: heading, level: 1 }).length).toBeGreaterThan(0);
    if (path !== "/") {
      expect(document.querySelector(".page-landing__visual")).toBeInTheDocument();
    }
    await waitFor(() => {
      expect(document.title).toContain(heading);
    });
    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute("content", expect.stringContaining(heading));
    expect(document.querySelector('script[data-nexaforge-seo]')).toHaveTextContent(heading);

    const canonical = document.querySelector("link[rel='canonical']");
    expect(canonical).toBeTruthy();
    await waitFor(() => {
      expect(canonical).toHaveAttribute("href", `${window.location.origin}${path}`);
    });
  });


  it("redirects the legacy base64 route to the developer route", async () => {
    render(
      <MemoryRouter
        initialEntries={["/text/base64"]}
        initialIndex={0}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByRole("heading", { name: "Base64", level: 1 }).length).toBeGreaterThan(0);
    await waitFor(() => {
      const canonical = document.querySelector("link[rel='canonical']");
      expect(canonical).toHaveAttribute("href", `${window.location.origin}/developer/base64`);
    });
  });

  it("redirects unknown routes to home", async () => {
    render(
      <MemoryRouter
        initialEntries={["/invalid"]}
        initialIndex={0}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "NexaForge" })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toContain("NexaForge");
    });
  });
});
