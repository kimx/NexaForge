import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { JsonPathTesterPage } from "./JsonPathTesterPage";

describe("JsonPathTesterPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("nexaforge-locale", "en");
  });

  it("runs the sample query locally and exposes copy/download output actions", async () => {
    renderWithProviders(<JsonPathTesterPage />, { route: "/en/developer/jsonpath-tester" });

    expect(screen.getByRole("heading", { level: 1, name: "JSONPath Tester" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Run JSONPath" }));

    await waitFor(() => expect(
      (screen.getByRole("textbox", { name: "Query results" }) as HTMLTextAreaElement).value
    ).toContain("Nigel Rees"));
    const output = screen.getByRole("textbox", { name: "Query results" }) as HTMLTextAreaElement;
    expect(output.value).toContain("Nigel Rees");
    expect(screen.getByRole("button", { name: "Copy" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
  });

  it("associates JSONPath syntax errors with the query field", async () => {
    renderWithProviders(<JsonPathTesterPage />);
    const query = screen.getByRole("textbox", { name: "JSONPath query" });

    fireEvent.change(query, { target: { value: "$.store[" } });
    fireEvent.click(screen.getByRole("button", { name: "Run JSONPath" }));

    await waitFor(() => expect(query).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByRole("alert")).toHaveTextContent("Missing closing bracket");
  });
});
