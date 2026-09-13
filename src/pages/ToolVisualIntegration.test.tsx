import { fireEvent, screen, within } from "@testing-library/react";
import { HomePage } from "./HomePage";
import { ToolSidebar } from "../components/ToolSidebar";
import { renderWithProviders } from "../test/renderWithProviders";
import { FILE_TOOLS } from "../data/tools";
import { TOOL_CATEGORY_ORDER, getToolVisual } from "../data/toolVisuals";

afterEach(() => window.localStorage.clear());

it("shows registered visuals and complete action names for every card", () => {
  renderWithProviders(<HomePage />);
  fireEvent.click(screen.getByRole("button", { name: "All" }));
  const cards = document.querySelectorAll("#featured-tools article");
  expect(cards).toHaveLength(FILE_TOOLS.length);
  FILE_TOOLS.forEach((tool, index) => {
    expect(cards[index].querySelector(".home-tool-card__icon")).toHaveTextContent(getToolVisual(tool).label);
    const card = within(cards[index] as HTMLElement);
    const title = card.getByRole("heading", { level: 3 }).textContent;
    expect(card.getByRole("link", { name: `Open ${title}` })).toHaveAttribute("href", `/en${tool.path}`);
  });
});

it("shares category order and actual SVGs between category and tool navigation", () => {
  renderWithProviders(<><HomePage /><ToolSidebar /></>);
  const toggles = Array.from(document.querySelectorAll<HTMLButtonElement>(".tool-sidebar__category-toggle"));
  expect(toggles.map(button => button.getAttribute("aria-controls")?.replace("tool-sidebar-category-", ""))).toEqual([...TOOL_CATEGORY_ORDER]);
  expect(Array.from(document.querySelectorAll(".finder-filter")).slice(2).map(button => button.textContent)).toEqual([...TOOL_CATEGORY_ORDER]);
  for (const button of toggles) {
    fireEvent.click(button);
    const list = document.getElementById(button.getAttribute("aria-controls")!)!;
    const categorySvg = button.querySelector(".tool-sidebar__icon svg")!.innerHTML;
    for (const link of within(list).getAllByRole("link")) {
      expect(link.querySelector("svg")!.innerHTML).toBe(categorySvg);
    }
  }
  fireEvent.change(screen.getByRole("textbox", { name: "Tool search" }), { target: { value: "base64" } });
  for (const section of document.querySelectorAll(".tool-sidebar__section")) {
    const categorySvg = section.querySelector("h2 svg")!.innerHTML;
    for (const link of section.querySelectorAll("li a")) expect(link.querySelector("svg")!.innerHTML).toBe(categorySvg);
  }
});

it("preserves visual identity across pinned, recent, featured and search cards", () => {
  window.localStorage.setItem("nexaforge-pinned-tools", JSON.stringify(["regex-tester"]));
  window.localStorage.setItem("nexaforge-recent-tools", JSON.stringify(["list-cleanup"]));
  renderWithProviders(<HomePage />);
  const fixtures = [["pinned-tools", "regex-tester"], ["recent-tools", "list-cleanup"], ["featured-tools", "image-resize"]] as const;
  const visuals = fixtures.map(([section, id]) => {
    const tool = FILE_TOOLS.find(tool => tool.id === id)!;
    const card = within(screen.getByTestId(section)).getByRole("heading", { name: tool.title }).closest("article")!;
    return { tool, html: card.querySelector(".home-tool-card__icon")!.outerHTML };
  });
  for (const { tool, html } of visuals) {
    fireEvent.change(screen.getByRole("textbox", { name: "Search Tools" }), { target: { value: tool.title } });
    const card = screen.getByRole("heading", { name: tool.title }).closest("article")!;
    expect(card.querySelector(".home-tool-card__icon")!.outerHTML).toBe(html);
  }
});
