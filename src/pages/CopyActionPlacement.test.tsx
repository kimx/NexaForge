import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { LanguageProvider } from "../context/LanguageContext";
import { DeveloperToolsPage } from "./developer/DeveloperToolsPage";
import { HashPage } from "./text/HashPage";
import { HtmlEncoderPage } from "./text/HtmlEncoderPage";
import { MarkdownPreviewPage } from "./text/MarkdownPreviewPage";
import { TextDiffPage } from "./text/TextDiffPage";
import { TextToolsPage } from "./text/TextToolsPage";

function renderPage(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider initialLocale="en">{ui}</LanguageProvider>
    </MemoryRouter>
  );
}

function expectCopyInResult(copyName: string | RegExp): void {
  const options = screen.getByRole("heading", { name: "Options" }).closest("section");
  const result = screen.getByRole("heading", { name: "Result" }).closest("section");

  expect(options).not.toBeNull();
  expect(result).not.toBeNull();
  expect(within(options as HTMLElement).queryByRole("button", { name: copyName })).not.toBeInTheDocument();
  expect(within(result as HTMLElement).getByRole("button", { name: copyName })).toBeInTheDocument();
}

describe("copy action placement", () => {
  it("places HTML Encoder copy below its result", () => {
    renderPage(<HtmlEncoderPage />);
    expectCopyInResult("Copy output");
  });

  it("places Markdown source copy below its preview", () => {
    renderPage(<MarkdownPreviewPage />);
    expectCopyInResult("Copy source");
  });

  it("places Hash copy below its result", () => {
    renderPage(<HashPage />);
    expectCopyInResult("Copy");
  });

  it("places Text Diff actions below its result after comparison", () => {
    renderPage(<TextDiffPage />);
    fireEvent.change(screen.getByLabelText("Original"), { target: { value: "before" } });
    fireEvent.change(screen.getByLabelText("Changed"), { target: { value: "after" } });
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));

    expectCopyInResult("Copy result");
  });

  it("places text-tool copy directly below its result without a Next Actions group", () => {
    renderPage(<TextToolsPage kind="case-converter" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "NexaForge" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expectCopyInResult("Copy");
    expect(screen.queryByRole("heading", { name: "Next Actions" })).not.toBeInTheDocument();
  });

  it("places developer-tool copy directly below its result without a Next Actions group", () => {
    renderPage(<DeveloperToolsPage kind="url-encoder" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Nexa Forge" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    expectCopyInResult("Copy output");
    expect(screen.queryByRole("heading", { name: "Next Actions" })).not.toBeInTheDocument();
  });
});
