import { act, fireEvent, screen, within } from "@testing-library/react";
import { Link, Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../test/renderWithProviders";
import { HomePage } from "./HomePage";
import { ImageCompressPage } from "./image/CompressPage";
import { TextCleanerPage } from "./text/TextCleanerPage";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it("records direct and linked visits as one locale-independent recent tool", () => {
  renderWithProviders(<><Link to="/en/image/compress">Sidebar compression</Link><Link to="/image/compress">Chinese compression</Link><Link to="/en">Back home</Link><Routes><Route path="/en" element={<HomePage />} /><Route path="/en/text/text-cleaner" element={<TextCleanerPage />} /><Route path="/en/image/compress" element={<ImageCompressPage />} /><Route path="/image/compress" element={<ImageCompressPage />} /></Routes></>, { route: "/en/text/text-cleaner" });
  expect(JSON.parse(localStorage.getItem("nexaforge-recent-tools") ?? "[]")).toEqual(["text-cleaner"]);
  fireEvent.click(screen.getByRole("link", { name: "Sidebar compression" }));
  fireEvent.click(screen.getByRole("link", { name: "Chinese compression" }));
  expect(JSON.parse(localStorage.getItem("nexaforge-recent-tools") ?? "[]")).toEqual(["image-compress", "text-cleaner"]);
  fireEvent.click(screen.getByRole("link", { name: "Back home" }));
  expect(within(screen.getByTestId("recent-tools")).getAllByRole("article")).toHaveLength(2);
});

it("filters invalid and duplicate legacy recent IDs before applying the four-tool cap", () => {
  localStorage.setItem("nexaforge-recent-tools", JSON.stringify(["missing", "uuid", "uuid", 5, "hash", "text-cleaner", "image-compress", "pdf-merge"]));
  renderWithProviders(<HomePage />);
  const cards = within(screen.getByTestId("recent-tools")).getAllByRole("article");
  expect(cards).toHaveLength(4);
  expect(within(cards[3]).getByRole("link", { name: "Open Image Compress" })).toBeInTheDocument();
});

it("pins from a tool page, survives reload, and unpins from the homepage", () => {
  const first = renderWithProviders(<ImageCompressPage />);
  fireEvent.click(screen.getByRole("button", { name: "Pin Image Compress" }));
  expect(screen.getByRole("button", { name: "Unpin Image Compress" })).toHaveAttribute("aria-pressed", "true");
  first.unmount();
  renderWithProviders(<HomePage />);
  const pinned = screen.getByTestId("pinned-tools");
  expect(within(pinned).getByRole("link", { name: "Open Image Compress" })).toHaveAttribute("href", "/en/image/compress");
  fireEvent.click(within(pinned).getByRole("button", { name: "Unpin Image Compress" }));
  expect(screen.queryByTestId("pinned-tools")).not.toBeInTheDocument();
});

it("persists compression format and quality without files or target input and resets them", () => {
  const first = renderWithProviders(<ImageCompressPage />);
  fireEvent.change(screen.getByLabelText("Output Format"), { target: { value: "webp" } });
  fireEvent.change(screen.getByRole("slider"), { target: { value: "63" } });
  first.unmount();
  renderWithProviders(<ImageCompressPage />);
  expect(screen.getByLabelText("Output Format")).toHaveValue("webp");
  expect(screen.getByRole("slider")).toHaveValue("63");
  fireEvent.click(screen.getByRole("button", { name: "Reset settings" }));
  expect(screen.getByLabelText("Output Format")).toHaveValue("jpeg");
  expect(screen.getByRole("slider")).toHaveValue("80");
});

it("restores only cleaner choices after reload and keeps text private", () => {
  const first = renderWithProviders(<TextCleanerPage />);
  fireEvent.change(screen.getByLabelText(/input text/i), { target: { value: "private customer content" } });
  fireEvent.click(screen.getByLabelText(/trim each line/i));
  first.unmount();
  renderWithProviders(<TextCleanerPage />);
  expect(screen.getByLabelText(/trim each line/i)).toBeChecked();
  expect(screen.getByLabelText(/input text/i)).toHaveValue("");
  expect(Object.values(localStorage).join(" ")).not.toContain("private customer content");
  fireEvent.click(screen.getByRole("button", { name: "Reset settings" }));
  expect(screen.getByLabelText(/trim each line/i)).not.toBeChecked();
});

it("clears only personalization and leaves QR and locale settings intact", () => {
  localStorage.setItem("nexaforge-recent-tools", '["uuid"]');
  localStorage.setItem("nexaforge-pinned-tools", '["uuid"]');
  localStorage.setItem("qr-settings", '{"size":256}');
  localStorage.setItem("nexaforge-locale", "en");
  renderWithProviders(<HomePage />);
  fireEvent.click(screen.getByText("Personal settings"));
  fireEvent.click(screen.getByRole("button", { name: "Clear personal settings" }));
  expect(screen.queryByTestId("recent-tools")).not.toBeInTheDocument();
  expect(screen.queryByTestId("pinned-tools")).not.toBeInTheDocument();
  expect(localStorage.getItem("qr-settings")).toBe('{"size":256}');
  expect(localStorage.getItem("nexaforge-locale")).toBe("en");
});

it("keeps controls usable when browser storage is disabled", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
  renderWithProviders(<ImageCompressPage />);
  fireEvent.change(screen.getByRole("slider"), { target: { value: "61" } });
  expect(screen.getByRole("slider")).toHaveValue("61");
  fireEvent.click(screen.getByRole("button", { name: "Pin Image Compress" }));
  expect(screen.getByRole("button", { name: "Unpin Image Compress" })).toHaveAttribute("aria-pressed", "true");
});

it("updates compression controls when saved choices are cleared in another tab", () => {
  renderWithProviders(<ImageCompressPage />);
  fireEvent.change(screen.getByLabelText("Output Format"), { target: { value: "webp" } });
  localStorage.removeItem("nexaforge-tool-preferences-v1");
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: "nexaforge-tool-preferences-v1" })));
  expect(screen.getByLabelText("Output Format")).toHaveValue("jpeg");
});

it("does not show a cleaner result produced with options that were reset on the homepage", () => {
  renderWithProviders(<><Link to="/en">Back home</Link><Link to="/en/text/text-cleaner">Return to cleaner</Link><Routes><Route path="/en" element={<HomePage />} /><Route path="/en/text/text-cleaner" element={<TextCleanerPage />} /></Routes></>, { route: "/en/text/text-cleaner" });
  fireEvent.change(screen.getByLabelText(/input text/i), { target: { value: "  a  " } });
  fireEvent.click(screen.getByLabelText(/trim each line/i));
  fireEvent.click(screen.getByRole("button", { name: /clean text/i }));
  expect(screen.getByLabelText(/cleaned text/i)).toHaveValue("a");
  fireEvent.click(screen.getByRole("link", { name: "Back home" }));
  fireEvent.click(screen.getByText("Personal settings"));
  fireEvent.click(screen.getByRole("button", { name: "Reset saved tool options" }));
  fireEvent.click(screen.getByRole("link", { name: "Return to cleaner" }));
  expect(screen.getByLabelText(/trim each line/i)).not.toBeChecked();
  expect(screen.queryByLabelText(/cleaned text/i)).not.toBeInTheDocument();
});
