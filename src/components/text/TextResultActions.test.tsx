import { fireEvent, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { TextResultActions } from "./TextResultActions";

describe("TextResultActions", () => {
  it("copies, downloads, clears, and reuses output with accessible controls", async () => {
    const onClear = vi.fn();
    const onUseAsInput = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderWithProviders(
      <TextResultActions
        text="apple"
        filename="cleaned-text.txt"
        onClear={onClear}
        onUseAsInput={onUseAsInput}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /copy result/i }));
    expect(writeText).toHaveBeenCalledWith("apple");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Copied"));
    fireEvent.click(screen.getByRole("button", { name: /use output as input/i }));
    expect(onUseAsInput).toHaveBeenCalledWith("apple");
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /download/i })).toBeEnabled();
  });

  it("reports denied clipboard writes without claiming success and offers manual selection", async () => {
    const resultRef = createRef<HTMLTextAreaElement>();
    const writeText = vi.fn().mockRejectedValue(Object.assign(new Error("denied"), { name: "NotAllowedError" }));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    renderWithProviders(
      <>
        <textarea ref={resultRef} aria-label="Result" readOnly value="apple" onChange={() => undefined} />
        <TextResultActions text="apple" filename="result.txt" onClear={vi.fn()} resultRef={resultRef} />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: /copy result/i }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/copy failed/i));
    expect(screen.getByRole("status")).not.toHaveTextContent("Copied");
    fireEvent.click(screen.getByRole("button", { name: /select result text/i }));
    expect(resultRef.current?.selectionStart).toBe(0);
    expect(resultRef.current?.selectionEnd).toBe(5);
    expect(screen.getByLabelText("Result")).toHaveValue("apple");
  });

  it("reports an unavailable clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });

    renderWithProviders(<TextResultActions text="apple" filename="result.txt" onClear={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /copy result/i }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/clipboard api/i));
    expect(screen.getByRole("status")).not.toHaveTextContent("Copied");
  });

  it("uses translated copy feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    renderWithProviders(<TextResultActions text="蘋果" filename="result.txt" onClear={vi.fn()} />, { locale: "zh-TW" });

    fireEvent.click(screen.getByRole("button", { name: "複製結果" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("已複製"));
    expect(screen.getByRole("status")).not.toHaveTextContent("Copied");
  });
});
