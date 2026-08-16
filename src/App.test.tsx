import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

const ROUTE_HEADINGS: Record<string, string> = {
  "/": "NexaForge",
  "/image/resize": "Image Resize",
  "/image/convert": "Image Converter",
  "/image/compress": "Image Compress",
  "/pdf/merge": "PDF Merge",
  "/pdf/split": "PDF Split",
  "/pdf/rotate": "PDF Rotate",
  "/data/json-formatter": "JSON Formatter",
  "/data/csv-viewer": "CSV Viewer",
  "/data/csv-to-json": "CSV to JSON",
  "/data/json-to-csv": "JSON to CSV",
  "/text/base64": "Base64",
  "/text/hash": "Hash Generator",
  "/text/uuid": "UUID Generator",
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
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: heading, level: 1 })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toContain(heading);
    });

    const canonical = document.querySelector("link[rel='canonical']");
    expect(canonical).toBeTruthy();
    await waitFor(() => {
      expect(canonical).toHaveAttribute("href", `${window.location.origin}${path}`);
    });
  });

  it("redirects unknown routes to home", async () => {
    render(
      <MemoryRouter
        initialEntries={["/invalid"]}
        initialIndex={0}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "NexaForge" })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toContain("NexaForge");
    });
  });
});

