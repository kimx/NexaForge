import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CronBuilderPage } from "./CronBuilderPage";

describe("CronBuilderPage", () => {
  it("offers accessible presets and keeps individual weekdays editable", () => {
    renderWithProviders(<CronBuilderPage />);

    const everyDay = screen.getByRole("button", { name: "Every day" });
    const weekdays = screen.getByRole("button", { name: "Weekdays" });
    const weekends = screen.getByRole("button", { name: "Weekends" });
    expect(everyDay).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("checkbox").map((checkbox) => checkbox.parentElement?.textContent)).toEqual([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ]);

    fireEvent.click(weekdays);
    expect(screen.getByLabelText("Cron expression")).toHaveValue("* * * * 1,2,3,4,5");
    expect(weekdays).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("checkbox", { name: "Monday" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Sunday" })).not.toBeChecked();

    fireEvent.click(weekends);
    expect(screen.getByLabelText("Cron expression")).toHaveValue("* * * * 0,6");
    expect(weekends).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(everyDay);
    expect(screen.getByLabelText("Cron expression")).toHaveValue("* * * * *");
    expect(everyDay).toHaveAttribute("aria-pressed", "true");
  });

  it("builds an expression and shows five future executions", async () => {
    renderWithProviders(<CronBuilderPage />);

    fireEvent.change(screen.getByLabelText("Minute schedule"), {
      target: { value: "specific" },
    });
    fireEvent.change(screen.getByLabelText("Minute value"), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText("Hour schedule"), {
      target: { value: "specific" },
    });
    fireEvent.change(screen.getByLabelText("Hour value"), {
      target: { value: "9" },
    });

    expect(screen.getByLabelText("Cron expression")).toHaveValue("30 9 * * *");
    expect(screen.getByText(/Time zone:/)).toBeVisible();

    await waitFor(() => {
      expect(
        within(screen.getByRole("list", { name: "Next five executions" })).getAllByRole("listitem")
      ).toHaveLength(5);
    });
  });

  it("resets day of month when a weekday is selected", async () => {
    renderWithProviders(<CronBuilderPage />);

    fireEvent.change(screen.getByLabelText("Day of month schedule"), {
      target: { value: "specific" },
    });
    fireEvent.change(screen.getByLabelText("Day of month value"), {
      target: { value: "12" },
    });
    expect(screen.getByLabelText("Cron expression")).toHaveValue("* * 12 * *");

    fireEvent.click(screen.getByRole("checkbox", { name: "Monday" }));

    expect(screen.getByLabelText("Day of month schedule")).toHaveValue("every");
    expect(screen.getByLabelText("Cron expression")).toHaveValue("* * * * 1");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Day of month was reset because weekdays are selected."
    );
  });

  it("keeps the expression copy action available while refreshing future times", async () => {
    renderWithProviders(<CronBuilderPage />);

    const refresh = screen.getByRole("button", { name: "Refresh execution times" });
    fireEvent.click(refresh);

    expect(screen.getByRole("button", { name: "Copy Cron expression" })).toBeEnabled();
    await waitFor(() => expect(refresh).not.toHaveAttribute("aria-busy", "true"));
  });

  it("shows an inline validation error instead of crashing on an empty numeric field", async () => {
    renderWithProviders(<CronBuilderPage />);

    fireEvent.change(screen.getByLabelText("Minute schedule"), {
      target: { value: "interval" },
    });
    fireEvent.change(screen.getByLabelText("Minute value"), {
      target: { value: "" },
    });

    expect(screen.getByLabelText("Cron expression")).toHaveValue("");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "One or more schedule values are outside the allowed range."
    );
    expect(screen.getByRole("button", { name: "Copy Cron expression" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Minute value"), {
      target: { value: "15" },
    });
    expect(screen.getByLabelText("Cron expression")).toHaveValue("*/15 * * * *");
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("handles clipboard rejection and keeps the expression selectable", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderWithProviders(<CronBuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Copy Cron expression" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to copy result to clipboard."
    );
    expect(screen.getByLabelText("Cron expression")).toHaveValue("* * * * *");
  });

  it("replaces a previous copied announcement when a later copy is rejected", async () => {
    const writeText = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderWithProviders(<CronBuilderPage />);
    const copy = screen.getByRole("button", { name: "Copy Cron expression" });

    fireEvent.click(copy);
    expect(await screen.findByText("Copied.")).toBeVisible();
    fireEvent.click(copy);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to copy result to clipboard."
    );
    expect(screen.queryByText("Copied.")).not.toBeInTheDocument();
  });
});
