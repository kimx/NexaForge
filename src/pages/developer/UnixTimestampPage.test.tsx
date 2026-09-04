import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { LanguageProvider } from "../../context/LanguageContext";
import { UnixTimestampPage } from "./UnixTimestampPage";

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter
      initialEntries={["/en/developer/unix-timestamp"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LanguageProvider initialLocale="en">
        <UnixTimestampPage />
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe("UnixTimestampPage", () => {
  it("converts ten-digit seconds and shows UTC and ISO output", () => {
    renderPage();
    const input = screen.getByRole("textbox", { name: "Unix timestamp" });

    fireEvent.change(input, { target: { value: "1700000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    expect(screen.getAllByText("Detected as seconds")).toHaveLength(2);
    expect(screen.getByText("UTC datetime")).toBeVisible();
    expect(screen.getByText("2023-11-14T22:13:20.000Z")).toBeVisible();
  });

  it("converts a pre-1970 UTC date to negative seconds and milliseconds", () => {
    renderPage();
    fireEvent.change(screen.getByRole("combobox", { name: "Conversion direction" }), {
      target: { value: "date-to-timestamp" },
    });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "1969-12-31" } });
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "23:59:59" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Timezone" }), {
      target: { value: "utc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    expect(screen.getByTestId("unix-result-seconds")).toHaveTextContent("-1");
    expect(screen.getByTestId("unix-result-milliseconds")).toHaveTextContent("-1000");
  });

  it("uses browser time for the Current Timestamp action", () => {
    const now = 1700000000123;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Current Timestamp" }));

    expect(screen.getByRole("textbox", { name: "Unix timestamp" })).toHaveValue(String(now));
    expect(screen.getByText("2023-11-14T22:13:20.123Z")).toBeVisible();
    nowSpy.mockRestore();
  });

  it("clears both timestamp and date inputs", () => {
    renderPage();
    fireEvent.change(screen.getByRole("combobox", { name: "Conversion direction" }), {
      target: { value: "date-to-timestamp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByLabelText("Date")).toHaveValue("");
    expect(screen.getByLabelText("Time")).toHaveValue("");
  });
});
