import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import {
  CurlConversionError,
  convertCurl,
} from "../../services/curl/curlConverterService";
import { CurlToCodePage } from "./CurlToCodePage";

vi.mock("../../services/curl/curlConverterService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/curl/curlConverterService")>();
  return { ...actual, convertCurl: vi.fn() };
});

const convertCurlMock = vi.mocked(convertCurl);

describe("CurlToCodePage", () => {
  beforeEach(() => {
    convertCurlMock.mockReset();
  });

  it("converts cURL to C# and shows non-blocking warnings", async () => {
    convertCurlMock.mockResolvedValue({
      code: "using var client = new HttpClient();",
      fileExtension: ".cs",
      warnings: [{ code: "redirect", message: "Redirect defaults can differ." }],
    });
    renderWithProviders(<CurlToCodePage />);

    fireEvent.change(screen.getByLabelText("cURL command"), {
      target: { value: "curl https://example.com/api" },
    });
    fireEvent.change(screen.getByLabelText("Target language"), {
      target: { value: "csharp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Convert cURL" }));

    await waitFor(() => {
      expect((screen.getByLabelText("Generated code") as HTMLTextAreaElement).value).toContain("HttpClient");
    });
    expect(screen.getByText("Redirect defaults can differ.")).toBeVisible();
    expect(convertCurlMock).toHaveBeenCalledWith("curl https://example.com/api", "csharp");
  });

  it("preserves source and associates parser failures with the command", async () => {
    convertCurlMock.mockRejectedValue(new CurlConversionError("invalid-curl"));
    renderWithProviders(<CurlToCodePage />);

    const input = screen.getByLabelText("cURL command");
    fireEvent.change(input, { target: { value: "echo nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Convert cURL" }));

    const error = await screen.findByText("Enter a valid cURL command.");
    expect(input).toHaveValue("echo nope");
    expect(input).toHaveAttribute("aria-describedby", error.id);
    expect(screen.queryByLabelText("Generated code")).not.toBeInTheDocument();
  });
});
