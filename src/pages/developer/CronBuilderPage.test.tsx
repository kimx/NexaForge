import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CronBuilderPage } from "./CronBuilderPage";

describe("CronBuilderPage", () => {
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
});
