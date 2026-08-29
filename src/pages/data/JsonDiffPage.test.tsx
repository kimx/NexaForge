import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { JsonDiffPage } from "./JsonDiffPage";
import { LanguageProvider } from "../../context/LanguageContext";
import { renderWithProviders } from "../../test/renderWithProviders";

describe("JsonDiffPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("nexaforge-locale", "en");
  });

  it("loads a sample and renders structured semantic differences", async () => {
    renderWithProviders(<JsonDiffPage />, { route: "/en/data/json-diff" });

    fireEvent.click(screen.getByRole("button", { name: "Load Sample" }));
    fireEvent.click(screen.getByRole("button", { name: "Compare JSON" }));

    await waitFor(() => expect(screen.getByText(/changed · .* added · .* removed/)).toBeInTheDocument());
    expect(screen.getByText("$.legacy")).toBeInTheDocument();
    expect(screen.getByText("$.user.status")).toBeInTheDocument();
    expect(screen.getByText("$.user.name")).toBeInTheDocument();
  });

  it("accepts formatter JSON through local navigation state", () => {
    render(
      <MemoryRouter initialEntries={[{
        pathname: "/en/data/json-diff",
        state: { leftJson: '{"from":"formatter"}' },
      }]}>
        <LanguageProvider initialLocale="en"><JsonDiffPage /></LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("textbox", { name: "Original JSON" })).toHaveValue('{"from":"formatter"}');
  });

  it("reports validation errors for the invalid side without comparing", () => {
    renderWithProviders(<JsonDiffPage />, { route: "/en/data/json-diff" });
    const [left, right] = screen.getAllByRole("textbox");

    fireEvent.change(left, { target: { value: '{"broken":}' } });
    fireEvent.change(right, { target: { value: '{"valid":true}' } });
    fireEvent.click(screen.getByRole("button", { name: "Compare JSON" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Left JSON format error");
    expect(screen.queryByText(/changed · .* added · .* removed/)).not.toBeInTheDocument();
  });

  it("can hide unchanged nodes, swap inputs, and clear all state", async () => {
    renderWithProviders(<JsonDiffPage />, { route: "/en/data/json-diff" });
    const [left, right] = screen.getAllByRole("textbox");

    fireEvent.change(left, { target: { value: '{"same":1,"changed":1}' } });
    fireEvent.change(right, { target: { value: '{"same":1,"changed":2}' } });
    fireEvent.click(screen.getByRole("button", { name: "Compare JSON" }));
    await screen.findByText("$.same");
    fireEvent.click(screen.getByRole("checkbox", { name: "Show differences only" }));
    expect(screen.queryByText("$.same")).not.toBeInTheDocument();
    expect(screen.getByText("$.changed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Swap" }));
    expect(left).toHaveValue('{"same":1,"changed":2}');
    expect(right).toHaveValue('{"same":1,"changed":1}');

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(left).toHaveValue("");
    expect(right).toHaveValue("");
    expect(screen.queryByRole("checkbox", { name: "Show differences only" })).not.toBeInTheDocument();
  });
});
