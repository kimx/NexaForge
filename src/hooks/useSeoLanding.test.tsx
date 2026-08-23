import { renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../context/LanguageContext";
import { useSeoLanding } from "./useSeoLanding";

describe("useSeoLanding", () => {
  it("resolves the active localized route to its content and functional preset", () => {
    const wrapper = ({ children }: PropsWithChildren): JSX.Element => (
      <MemoryRouter
        initialEntries={["/en/image/jpg-to-webp"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider initialLocale="en">{children}</LanguageProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useSeoLanding(), { wrapper });

    expect(result.current?.definition.path).toBe("/image/jpg-to-webp");
    expect(result.current?.definition.preset).toEqual({
      sourceFormat: "jpeg",
      outputFormat: "webp",
    });
    expect(result.current?.content.h1).toBe("Free Online JPG to WebP Converter");
  });
});
