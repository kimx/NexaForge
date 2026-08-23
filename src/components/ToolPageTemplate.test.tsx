import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../context/LanguageContext";
import type { ProcessingState, ToolDefinition, ToolWorkflow } from "../types/tool";
import { ToolPageTemplate } from "./ToolPageTemplate";

const tool: ToolDefinition = {
  id: "json-formatter",
  title: "JSON Formatter",
  description: "Format JSON",
  path: "/data/json-formatter",
  category: "Data",
};

function Template({ state, route = "/" }: { state: ProcessingState; route?: string }): JSX.Element {
  const workflow: ToolWorkflow = { state };

  return (
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LanguageProvider initialLocale="en">
        <ToolPageTemplate
          tool={tool}
          meta={{ title: tool.title, description: tool.description, canonical: tool.path, h1: tool.title }}
          breadcrumb={["Home", tool.title]}
          workflow={workflow}
        >
          {{
            workspace: <button type="button">Process JSON</button>,
            options: null,
            result: <p>Formatted JSON</p>,
            howItWorks: ["Paste JSON", "Format it"],
            faq: [],
            relatedTools: [],
          }}
        </ToolPageTemplate>
      </LanguageProvider>
    </MemoryRouter>
  );
}

function rect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 600,
    width: 600,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("ToolPageTemplate result focus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_ADSENSE_SLOT_TOOL_RESULT", "1234567890");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("places monetization after the task guidance instead of inside the primary workflow", () => {
    render(<Template state="ready" />);

    const guidance = screen.getByRole("heading", { name: "How it works" }).closest("section");
    const advertisement = screen.getByRole("region", { name: /advertisement/i });
    const faq = screen.getByRole("heading", { name: "FAQ" }).closest("section");

    if (!guidance || !faq) {
      throw new Error("Expected guidance and FAQ headings to belong to section elements.");
    }

    expect(guidance.compareDocumentPosition(advertisement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(advertisement.compareDocumentPosition(faq) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses route-specific page identity and avoids duplicate FAQ content", () => {
    render(<Template state="ready" route="/en/image/jpg-to-webp" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Free Online JPG to WebP Converter" })
    ).toBeVisible();
    expect(screen.getByText(
      "Convert JPG images to WebP for free with private, browser-local processing and no upload, installation, or registration."
    )).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Frequently asked questions" })
    ).toBeVisible();
    expect(screen.queryByRole("heading", { level: 2, name: "FAQ" })).not.toBeInTheDocument();
  });

  it("makes the breadcrumb return path actionable and marks the current page", () => {
    render(<Template state="ready" route="/en/data/json-formatter" />);

    const breadcrumb = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(within(breadcrumb).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/en");
    expect(within(breadcrumb).getByText("Free Online JSON Formatter")).toHaveAttribute("aria-current", "page");
  });

  it("focuses a newly completed result when it is outside the viewport", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Template state="ready" />);
    const result = screen.getByRole("region", { name: /result|結果/i });
    vi.spyOn(result, "getBoundingClientRect").mockReturnValue(rect(1200, 1350));

    rerender(<Template state="success" />);
    act(() => vi.runAllTimers());

    expect(result).toHaveAttribute("tabindex", "-1");
    expect(result).toHaveFocus();
    expect(result.scrollIntoView).toHaveBeenCalled();
  });

  it("keeps the trigger focused when the completed result is already visible", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Template state="ready" />);
    const trigger = screen.getByRole("button", { name: "Process JSON" });
    const result = screen.getByRole("region", { name: /result|結果/i });
    vi.spyOn(result, "getBoundingClientRect").mockReturnValue(rect(100, 300));
    trigger.focus();

    rerender(<Template state="success" />);
    act(() => vi.runAllTimers());

    expect(trigger).toHaveFocus();
    expect(result.scrollIntoView).not.toHaveBeenCalled();
  });
});
