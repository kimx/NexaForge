import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { LanguageProvider } from "../../context/LanguageContext";
import { LocalTimeConverterPage } from "./LocalTimeConverterPage";

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter
      initialEntries={["/en/developer/local-time"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LanguageProvider initialLocale="en">
        <LocalTimeConverterPage />
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe("LocalTimeConverterPage", () => {
  it("converts an ISO timestamp automatically and keeps the original input", () => {
    renderPage();
    const input = screen.getByRole("textbox", { name: "ISO 8601 / UTC time" });
    const value = "2026-09-08T15:51:28.2433646+00:00";

    fireEvent.change(input, { target: { value } });

    expect(screen.getByText(value, { selector: "code" })).toBeVisible();
    expect(screen.getByText("Local time")).toBeVisible();
    expect(screen.getByText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)).toBeVisible();
    expect(screen.getByText("Detected local timezone", { selector: "dt" })).toBeVisible();
  });

  it("shows a clear error for an invalid timestamp", () => {
    renderPage();

    fireEvent.change(screen.getByRole("textbox", { name: "ISO 8601 / UTC time" }), {
      target: { value: "not a timestamp" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invalid format. Enter an ISO 8601 time ending in Z or a timezone offset such as +00:00."
    );
  });

  it("copies the local result and clears the workflow", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderPage();

    fireEvent.change(screen.getByRole("textbox", { name: "ISO 8601 / UTC time" }), {
      target: { value: "2026-09-08T15:51:28Z" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await screen.findByRole("status");
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/));

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("textbox", { name: "ISO 8601 / UTC time" })).toHaveValue("");
  });
});
