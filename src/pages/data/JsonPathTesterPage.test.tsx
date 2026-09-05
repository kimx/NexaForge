import { fireEvent, screen, waitFor } from "@testing-library/react";
import { JsonPathTesterPage } from "./JsonPathTesterPage";
import { renderWithProviders } from "../../test/renderWithProviders";

describe("JsonPathTesterPage", () => {
  it("renders the localized page identity and JSONPath controls", async () => {
    renderWithProviders(<JsonPathTesterPage />, { route: "/en/data/jsonpath-tester" });

    expect(screen.getByRole("heading", { level: 1, name: "JSONPath Tester Online" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "JSON input" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "JSONPath expression" })).toHaveValue("$.users[*].name");
    expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument();
    await waitFor(() =>
      expect(document.title).toBe("JSONPath Tester Online – Test JSONPath Expressions | NexaForge")
    );
  });

  it("runs a wildcard expression after the debounce", async () => {
    renderWithProviders(<JsonPathTesterPage />, { route: "/en/data/jsonpath-tester" });

    fireEvent.change(screen.getByRole("textbox", { name: "JSON input" }), {
      target: { value: '{"users":[{"name":"Ada"},{"name":"Lin"}]}' },
    });

    await waitFor(() => expect(screen.getByText(/"Ada"/)).toBeInTheDocument(), {
      timeout: 1200,
    });
    expect(screen.getByText(/"Lin"/)).toBeInTheDocument();
  });

  it("separates invalid JSON, invalid JSONPath, and no matches", async () => {
    renderWithProviders(<JsonPathTesterPage />, { route: "/en/data/jsonpath-tester" });
    const input = screen.getByRole("textbox", { name: "JSON input" });
    const expression = screen.getByRole("textbox", { name: "JSONPath expression" });

    fireEvent.change(input, { target: { value: '{"broken":}' } });
    await waitFor(() => expect(screen.getAllByRole("alert")[0]).toHaveTextContent("Invalid JSON"), {
      timeout: 1200,
    });

    fireEvent.change(input, { target: { value: '{"users":[]}' } });
    fireEvent.change(expression, { target: { value: "$.users[" } });
    await waitFor(() => expect(screen.getAllByRole("alert")[0]).toHaveTextContent("Invalid JSONPath"), {
      timeout: 1200,
    });

    fireEvent.change(expression, { target: { value: "$.users[*].name" } });
    await waitFor(() =>
      expect(screen.getByText("No values matched this JSONPath.")).toBeInTheDocument()
    );
  });

  it("formats input and clears both editors", () => {
    renderWithProviders(<JsonPathTesterPage />, { route: "/en/data/jsonpath-tester" });
    const input = screen.getByRole("textbox", { name: "JSON input" });
    const expression = screen.getByRole("textbox", { name: "JSONPath expression" });

    fireEvent.change(input, { target: { value: '{"name":"NexaForge"}' } });
    fireEvent.click(screen.getByRole("button", { name: "Format JSON" }));
    expect(input).toHaveValue('{\n  "name": "NexaForge"\n}');

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(input).toHaveValue("");
    expect(expression).toHaveValue("");
  });
});
