import { act, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "../context/LanguageContext";
import { AdSlot } from "./AdSlot";

interface AdsWindow extends Window {
  adsbygoogle?: { push: ReturnType<typeof vi.fn> };
}

describe("AdSlot", () => {
  let observerCallback: IntersectionObserverCallback | undefined;
  const observe = vi.fn();
  const disconnect = vi.fn();

  beforeEach(() => {
    observerCallback = undefined;
    observe.mockClear();
    disconnect.mockClear();

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "300px";
      readonly thresholds = [0];

      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }

      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
    }

    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: MockIntersectionObserver,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as AdsWindow).adsbygoogle;
    document
      .querySelectorAll('script[data-nexaforge-adsense="true"]')
      .forEach((script) => script.remove());
  });

  it("defers ad initialization until the reserved slot approaches the viewport", async () => {
    const push = vi.fn();
    (window as AdsWindow).adsbygoogle = { push };

    render(
      <LanguageProvider initialLocale="en">
        <AdSlot position="home" adSlotId="1234567890" />
      </LanguageProvider>
    );

    const slot = screen.getByRole("region", { name: /advertisement/i });
    expect(observe).toHaveBeenCalledWith(slot);
    expect(push).not.toHaveBeenCalled();
    expect(document.querySelector("script[data-nexaforge-adsense]")).toBeNull();

    act(() => {
      observerCallback?.(
        [
          { isIntersecting: true, target: slot } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver
      );
    });

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(document.querySelector("script[data-nexaforge-adsense]")).not.toBeNull();
    expect(disconnect).toHaveBeenCalled();
  });

  it("can change from an invalid to a valid slot without changing hook order", () => {
    const { rerender } = render(
      <LanguageProvider initialLocale="en">
        <AdSlot position="home" adSlotId="invalid" />
      </LanguageProvider>
    );

    rerender(
      <LanguageProvider initialLocale="en">
        <AdSlot position="home" adSlotId="1234567890" />
      </LanguageProvider>
    );

    expect(screen.getByRole("region", { name: /advertisement/i })).toBeInTheDocument();
  });

  it("removes the reserved region when AdSense reports that the slot is unfilled", async () => {
    const push = vi.fn();
    (window as AdsWindow).adsbygoogle = { push };

    render(
      <LanguageProvider initialLocale="en">
        <AdSlot position="home" adSlotId="1234567890" />
      </LanguageProvider>
    );

    const region = screen.getByRole("region", { name: /advertisement/i });
    act(() => {
      observerCallback?.(
        [{ isIntersecting: true, target: region } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));

    document.querySelector(".adsbygoogle")?.setAttribute("data-ad-status", "unfilled");

    await waitFor(() => {
      expect(screen.queryByRole("region", { name: /advertisement/i })).not.toBeInTheDocument();
    });
  });

  it("removes the reserved region when an eligible ad never reports a fill status", async () => {
    vi.useFakeTimers();
    const push = vi.fn();
    (window as AdsWindow).adsbygoogle = { push };

    render(
      <LanguageProvider initialLocale="en">
        <AdSlot position="home" adSlotId="1234567890" />
      </LanguageProvider>
    );

    const region = screen.getByRole("region", { name: /advertisement/i });
    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true, target: region } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
      await Promise.resolve();
    });
    expect(push).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(5_000));

    expect(screen.queryByRole("region", { name: /advertisement/i })).not.toBeInTheDocument();
  });
});
