import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export interface AdSlotProps {
  position: "tool-result" | "home";
  adSlotId?: string;
}

type WindowWithAds = Window & {
  adsbygoogle?: { push: (configuration: Record<string, unknown>) => unknown };
};

const ADSENSE_CLIENT = "ca-pub-7081186471554630";
const AD_SLOT_FALLBACK: Record<AdSlotProps["position"], string> = {
  home: "",
  "tool-result": "",
};
const AD_SLOT_PATTERN = /^\d{10,16}$/;

function ensureAdSenseScript(): void {
  if (document.querySelector('script[data-nexaforge-adsense="true"]')) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.dataset.nexaforgeAdsense = "true";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.append(script);
}

export function AdSlot({ position, adSlotId }: AdSlotProps): JSX.Element {
  const containerRef = useRef<HTMLElement>(null);
  const adRef = useRef<HTMLModElement>(null);
  const [eligibleSlot, setEligibleSlot] = useState<string | null>(null);
  const { t } = useLanguage();
  const slotId = adSlotId ?? AD_SLOT_FALLBACK[position];
  const isValidSlot = AD_SLOT_PATTERN.test(slotId);

  useEffect(() => {
    if (!isValidSlot || typeof window === "undefined" || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    if (typeof window.IntersectionObserver === "function") {
      const observer = new window.IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setEligibleSlot(slotId);
            observer.disconnect();
          }
        },
        { rootMargin: "300px 0px" }
      );
      observer.observe(container);
      return () => observer.disconnect();
    }

    const timer = window.setTimeout(() => setEligibleSlot(slotId), 1);
    return () => window.clearTimeout(timer);
  }, [isValidSlot, slotId]);

  useEffect(() => {
    if (
      !isValidSlot ||
      eligibleSlot !== slotId ||
      typeof window === "undefined" ||
      !adRef.current ||
      adRef.current.dataset.adsbygoogleStatus === "rendered"
    ) {
      return;
    }

    try {
      ensureAdSenseScript();
      const adsWindow = window as WindowWithAds;
      const adsQueue =
        adsWindow.adsbygoogle ?? ([] as Array<Record<string, unknown>>);
      adsWindow.adsbygoogle = adsQueue;
      adsQueue.push({});
      adRef.current.dataset.adsbygoogleStatus = "rendered";
    } catch (error) {
      void error;
    }
  }, [eligibleSlot, isValidSlot, slotId]);

  if (!isValidSlot) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        `[AdSlot] Invalid ad slot id "${slotId}" for position "${position}". Please use your real AdSense slot ID.`
      );
    }

    return <></>;
  }

  return (
    <section
      ref={containerRef}
      className={`ad-slot ad-slot--${position}`}
      aria-label={t("adSlot.aria")}
    >
      <span className="ad-slot__label">{t("adSlot.label", { position })}</span>
      <ins
        key={slotId}
        ref={adRef}
        className="adsbygoogle ad-slot__unit"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}
