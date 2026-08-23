import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { formatSql } from "../../services/sql/sqlFormatterService";
import { SqlFormatterPage } from "./SqlFormatterPage";

vi.mock("../../services/sql/sqlFormatterService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sql/sqlFormatterService")>();
  return { ...actual, formatSql: vi.fn() };
});

const formatSqlMock = vi.mocked(formatSql);

describe("SqlFormatterPage", () => {
  beforeEach(() => {
    formatSqlMock.mockReset();
    formatSqlMock.mockImplementation(async (source, options) => {
      const transformed = options.keywordCase === "upper" ? source.toUpperCase() : source;
      return transformed;
    });
  });
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

  it("does not publish a stale result after the input changes", async () => {
    let resolveFormat!: (value: string) => void;
    formatSqlMock.mockReturnValueOnce(new Promise((resolve) => {
      resolveFormat = resolve;
    }));
    renderWithProviders(<SqlFormatterPage />);

    fireEvent.change(screen.getByLabelText("SQL input"), { target: { value: "select old" } });
    fireEvent.click(screen.getByRole("button", { name: "Format SQL" }));
    fireEvent.change(screen.getByLabelText("SQL input"), { target: { value: "select new" } });
    await act(async () => resolveFormat("SELECT OLD"));

    expect(screen.queryByLabelText("SQL output")).not.toBeInTheDocument();
    expect(screen.getByText("Ready to process")).toBeVisible();
  });

  it("clears generated output when a formatting option changes", async () => {
    renderWithProviders(<SqlFormatterPage />);

    fireEvent.change(screen.getByLabelText("SQL input"), { target: { value: "select 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Format SQL" }));
    expect(await screen.findByLabelText("SQL output")).toBeVisible();

    fireEvent.change(screen.getByLabelText("SQL dialect"), { target: { value: "mysql" } });
    expect(screen.queryByLabelText("SQL output")).not.toBeInTheDocument();
  });
});
