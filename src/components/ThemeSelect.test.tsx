import { fireEvent, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { ThemeSelect } from "./ThemeSelect";
import { renderWithProviders } from "../test/renderWithProviders";

describe("ThemeSelect", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("follows the system by default and persists explicit choices across remounts", () => {
    const { unmount } = renderWithProviders(<ThemeSelect />);
    const toggle = screen.getByRole("button", { name: "Appearance: System; switch to Light" });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "system");
    fireEvent.click(toggle);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem("nexaforge-theme")).toBe("light");
    expect(toggle).toHaveAccessibleName("Appearance: Light; switch to Dark");
    fireEvent.click(toggle);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("nexaforge-theme")).toBe("dark");
    unmount();
    renderWithProviders(<ThemeSelect />);
    const restored = screen.getByRole("button", { name: "Appearance: Dark; switch to System" });
    fireEvent.click(restored);
    expect(document.documentElement).toHaveAttribute("data-theme", "system");
    expect(localStorage.getItem("nexaforge-theme")).toBe("system");
  });

  it("ignores invalid saved values and localizes the control", () => {
    localStorage.setItem("nexaforge-theme", "invalid");
    renderWithProviders(<ThemeSelect />, { locale: "zh-TW" });
    const toggle = screen.getByRole("button", { name: "外觀：跟隨系統；切換至淺色模式" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAccessibleName("外觀：淺色模式；切換至深色模式");
  });

  it("still switches appearance when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    renderWithProviders(<ThemeSelect />);
    fireEvent.click(screen.getByRole("button", { name: "Appearance: System; switch to Light" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("applies saved appearance from the HTML head before React starts", () => {
    const html = readFileSync("index.html", "utf8");
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(script).toBeTruthy();
    localStorage.setItem("nexaforge-theme", "dark");
    window.eval(script!);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    delete document.documentElement.dataset.theme;
    localStorage.setItem("nexaforge-theme", "invalid");
    window.eval(script!);
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});
