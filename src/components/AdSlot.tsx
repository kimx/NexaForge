import { useEffect, useRef } from "react";

export interface AdSlotProps {
  position: "tool-result" | "home";
  adSlotId?: string;
}

type WindowWithAds = Window & { adsbygoogle?: Array<{ [key: string]: unknown }> };

const ADSENSE_CLIENT = "ca-pub-7081186471554630";
const AD_SLOT_FALLBACK: Record<AdSlotProps["position"], string> = {
  home: "",
  "tool-result": "",
};
const AD_SLOT_PATTERN = /^\d{16}$/;

export function AdSlot({ position, adSlotId }: AdSlotProps): JSX.Element {
  const adRef = useRef<HTMLModElement>(null);
  const slotId = adSlotId ?? AD_SLOT_FALLBACK[position];

  if (!AD_SLOT_PATTERN.test(slotId)) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        `[AdSlot] Invalid ad slot id "${slotId}" for position "${position}". Please use your real AdSense slot ID.`
      );
    }

    return <></>;
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!adRef.current) {
      return;
    }

    if (adRef.current.dataset.adsbygoogleStatus === "rendered") {
      return;
    }

    try {
      const adsWindow = window as WindowWithAds;
      adsWindow.adsbygoogle = adsWindow.adsbygoogle ?? [];
      adsWindow.adsbygoogle.push({});
      adRef.current.dataset.adsbygoogleStatus = "rendered";
    } catch (error) {
      void error;
    }
  }, [slotId]);

  return (
    <section className={`ad-slot ad-slot--${position}`} aria-label="Advertisement">
      <span className="ad-slot__label">Advertisement ({position})</span>
      <ins
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
