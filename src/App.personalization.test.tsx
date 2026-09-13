import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import { renderWithProviders } from "./test/renderWithProviders";

beforeEach(() => localStorage.clear());

it("tracks real direct, related, sidebar, language-switch and home launches with a four-tool cap", async () => {
  localStorage.setItem("nexaforge-recent-tools", '["uuid","hash","text-cleaner","pdf-merge","base64"]');
  renderWithProviders(<App />, { route: "/en/image/compress" });
  await screen.findByRole("heading", { level: 1, name: "Image Compress" });
  await waitFor(() => expect(JSON.parse(localStorage.getItem("nexaforge-recent-tools") ?? "[]")).toEqual(["image-compress", "uuid", "hash", "text-cleaner"]));
  fireEvent.click(within(screen.getByRole("navigation", { name: "Related Tools" })).getByRole("link", { name: "Image Resize" }));
  await screen.findByRole("heading", { level: 1, name: "Free Online Image Resizer" });
  fireEvent.click(within(screen.getByRole("complementary")).getByRole("link", { name: "Image Converter" }));
  await screen.findByRole("heading", { level: 1, name: "Image Converter" });
  const languageButtons = within(screen.getByRole("group", { name: /language/i })).getAllByRole("button");
  fireEvent.click(languageButtons[0]);
  await waitFor(() => expect(languageButtons[0]).toHaveAttribute("aria-pressed", "true"));
  expect(JSON.parse(localStorage.getItem("nexaforge-recent-tools") ?? "[]")).toEqual(["image-convert", "image-resize", "image-compress", "uuid"]);
  fireEvent.click(languageButtons[1]);
  await screen.findByRole("heading", { level: 1, name: "Image Converter" });
  fireEvent.click(within(screen.getByRole("banner")).getByRole("link", { name: "NexaForge Utility File Workspace" }));
  await screen.findByTestId("recent-tools");
  expect(within(screen.getByTestId("recent-tools")).getAllByRole("article")).toHaveLength(4);
  fireEvent.click(screen.getByRole("link", { name: "Open Word Counter" }));
  await screen.findByRole("heading", { level: 1, name: "Word Counter" });
  expect(JSON.parse(localStorage.getItem("nexaforge-recent-tools") ?? "[]")).toEqual(["word-counter", "image-convert", "image-resize", "image-compress"]);
}, 20_000);
