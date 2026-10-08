import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { PdfPasswordProvider } from "./PdfPasswordProvider";
import { requestPdfPassword } from "../services/pdf/pdfPasswordPrompt";
import { renderWithProviders } from "../test/renderWithProviders";

function renderPasswordProvider(): void {
  renderWithProviders(
    <>
      <PdfPasswordProvider />
      <button type="button">Start PDF operation</button>
    </>
  );
}

describe("PdfPasswordModal", () => {
  afterEach(() => vi.restoreAllMocks());

  it("focuses the password field, retries incorrect passwords, supports visibility and submits", async () => {
    renderPasswordProvider();
    const trigger = screen.getByRole("button", { name: "Start PDF operation" });
    trigger.focus();

    const bytes = new Uint8Array([37, 80, 68, 70]);
    const verify = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("wrong"), { code: "WRONG_PASSWORD" }))
      .mockResolvedValueOnce(bytes);
    let result!: Promise<Uint8Array>;
    act(() => {
      result = requestPdfPassword("private.pdf", verify);
    });
    const dialog = await screen.findByRole("dialog", { name: "Unlock password-protected PDF" });
    const input = screen.getByLabelText("PDF password");

    expect(document.activeElement).toBe(input);
    expect(dialog).toHaveTextContent("private.pdf");
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Unlock" }));
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(document.activeElement).toBe(input);

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(input, { target: { value: "incorrect" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("That password is incorrect. Try again.");
    expect(input).toHaveValue("");

    fireEvent.change(input, { target: { value: "correct" } });
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
      await result;
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await result).toEqual(bytes);
    expect(verify).toHaveBeenNthCalledWith(1, "incorrect", expect.any(AbortSignal));
    expect(verify).toHaveBeenNthCalledWith(2, "correct", expect.any(AbortSignal));
    expect(document.activeElement).toBe(trigger);
  });

  it("cancels the active PDF operation with Escape", async () => {
    renderPasswordProvider();
    let result!: Promise<Uint8Array>;
    act(() => {
      result = requestPdfPassword("cancel.pdf", vi.fn());
    });
    const dialog = await screen.findByRole("dialog");

    fireEvent.keyDown(dialog, { key: "Escape" });

    await expect(result).rejects.toMatchObject({ code: "password-cancelled" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
