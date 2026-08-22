import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { DeveloperToolsPage, jsonDiff } from "./DeveloperToolsPage";
import { LanguageProvider } from "../../context/LanguageContext";

function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>
  );
}

describe("jsonDiff", () => {
  it("marks only changed lines while keeping shared structure as context", () => {
    expect(jsonDiff({ a: "kim" }, { a: "kim2" })).toBe([
      "--- left",
      "+++ right",
      "  {",
      '-   "a": "kim"',
      '+   "a": "kim2"',
      "  }",
    ].join("\n"));
  });

  it("reports equivalent JSON values without a diff", () => {
    expect(jsonDiff({ a: 1 }, { a: 1 })).toBe("No differences.");
  });
});

describe("DeveloperToolsPage JSON samples", () => {
  it("starts JSON to YAML with a processable JSON sample", () => {
    const { container } = renderWithRouter(<DeveloperToolsPage kind="json-yaml" />);
    const input = screen.getByRole("textbox", { name: "Input" }) as HTMLTextAreaElement;

    expect(() => JSON.parse(input.value)).not.toThrow();

    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expect(container.querySelector(".developer-output")).not.toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("starts JSON Diff with two processable samples that produce a difference", () => {
    const { container } = renderWithRouter(<DeveloperToolsPage kind="json-diff" />);
    const left = screen.getByRole("textbox", { name: "Left JSON" }) as HTMLTextAreaElement;
    const right = screen.getByRole("textbox", { name: "Right JSON" }) as HTMLTextAreaElement;

    expect(() => JSON.parse(left.value)).not.toThrow();
    expect(() => JSON.parse(right.value)).not.toThrow();

    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expect(container.querySelector(".developer-output")).toHaveTextContent("--- left");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
