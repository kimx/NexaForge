import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider, translate } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { INDEXABLE_ROUTES } from "../../routing/routes";
import { IdPhotoLayoutPage } from "./IdPhotoLayoutPage";

afterEach(cleanup);

describe("ID photo layout page", () => {
  it("is discoverable and indexable in both languages", () => {
    expect(FILE_TOOLS.find(tool => tool.id === "id-photo-layout")?.path).toBe("/image/id-photo-layout");
    expect(INDEXABLE_ROUTES).toContain("/image/id-photo-layout");
    expect(INDEXABLE_ROUTES).toContain("/en/image/id-photo-layout");
    expect(translate("en", "tool.id-photo-layout.title")).toBe("ID Photo Layout");
    expect(translate("zh-TW", "tool.id-photo-layout.title")).toBe("證件照排版");
  });

  it("provides physical layout controls and prevents export before selecting a photo", () => {
    render(<MemoryRouter><LanguageProvider initialLocale="en"><IdPhotoLayoutPage /></LanguageProvider></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Create print file" })).toBeDisabled();
    expect(screen.getByText(/Actual size/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Photo size"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("Photo width (mm)"), { target: { value: "200" } });
    expect(screen.getByRole("alert")).toHaveTextContent("does not fit");
    expect(screen.getByLabelText("Photo width (mm)")).toHaveAccessibleDescription(/does not fit/);
    fireEvent.change(screen.getByLabelText("Photo width (mm)"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Copies"), { target: { value: "13" } });
    expect(screen.getByText(/13 photos/)).toBeInTheDocument();
  });
});
