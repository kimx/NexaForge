import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import { FeedbackPrompt } from "./FeedbackPrompt";

const { submitFeedback } = vi.hoisted(() => ({
  submitFeedback: vi.fn(),
}));

vi.mock("../utils/analytics", () => ({ submitFeedback }));

describe("FeedbackPrompt", () => {
  afterEach(() => {
    submitFeedback.mockReset();
  });

  it("submits one fixed helpful response even when clicked repeatedly", async () => {
    submitFeedback.mockResolvedValue(true);
    renderWithProviders(<FeedbackPrompt tool="text-cleaner" />);

    fireEvent.click(screen.getByRole("button", { name: "Helpful" }));
    fireEvent.click(screen.getByRole("button", { name: "Helpful" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Thanks for your feedback."));
    expect(submitFeedback).toHaveBeenCalledOnce();
    expect(submitFeedback).toHaveBeenCalledWith("text-cleaner", "helpful", undefined);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows a failure message when the fixed problem response cannot be sent", async () => {
    submitFeedback.mockResolvedValue(false);
    renderWithProviders(<FeedbackPrompt tool="image-compress" />);

    fireEvent.click(screen.getByRole("button", { name: "I had a problem" }));
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Feedback could not be sent."));
    expect(screen.getByRole("radio", { name: "Processing failed or produced no result" })).toBeChecked();
  });
});
