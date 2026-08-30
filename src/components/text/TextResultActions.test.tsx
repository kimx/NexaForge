import { fireEvent, screen } from "@testing-library/react";
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
    fireEvent.click(screen.getByRole("button", { name: /use output as input/i }));
    expect(onUseAsInput).toHaveBeenCalledWith("apple");
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /download/i })).toBeEnabled();
  });
});
