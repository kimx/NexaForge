import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { SqlFormatterPage } from "./SqlFormatterPage";

describe("SqlFormatterPage", () => {
  it("formats SQL Server input and exposes copyable output", async () => {
    renderWithProviders(<SqlFormatterPage />);

    fireEvent.change(screen.getByLabelText("SQL input"), {
      target: { value: "select id, display_name from users where active = 1" },
    });
    fireEvent.change(screen.getByLabelText("SQL dialect"), {
      target: { value: "transactsql" },
    });
    fireEvent.change(screen.getByLabelText("Keyword case"), {
      target: { value: "upper" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Format SQL" }));

    await waitFor(() => {
      expect((screen.getByLabelText("SQL output") as HTMLTextAreaElement).value).toContain("SELECT");
    });
    expect(screen.getByRole("button", { name: "Copy" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
  });

  it("minifies without changing whitespace inside a quoted value", async () => {
    renderWithProviders(<SqlFormatterPage />);

    fireEvent.change(screen.getByLabelText("SQL input"), {
      target: { value: "select 'two  spaces' as value from users" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Minify SQL" }));

    await waitFor(() => {
      expect((screen.getByLabelText("SQL output") as HTMLTextAreaElement).value).toContain("'two  spaces'");
    });
    expect((screen.getByLabelText("SQL output") as HTMLTextAreaElement).value).not.toContain("\n");
  });

  it("associates an empty-input error with the SQL field", async () => {
    renderWithProviders(<SqlFormatterPage />);

    fireEvent.click(screen.getByRole("button", { name: "Format SQL" }));

    const error = await screen.findByText("Enter SQL to process.");
    expect(error).toHaveAttribute("id");
    expect(screen.getByLabelText("SQL input")).toHaveAttribute("aria-describedby", error.id);
    expect(screen.queryByLabelText("SQL output")).not.toBeInTheDocument();
  });
});
