import { useEffect, useState } from "react";
import { defaultPersonalization, PERSONALIZATION_EVENT, PERSONALIZATION_KEYS, readPersonalization, type Personalization } from "../services/personalization";

export function usePersonalization(): Personalization {
  // SSR and initial client render share defaults; browser settings load after hydration.
  const [state, setState] = useState(defaultPersonalization);
  useEffect(() => {
    setState(readPersonalization());
    const update = (event: Event) => {
      const { key, value } = (event as CustomEvent<{ key: keyof Personalization; value: Personalization[keyof Personalization] }>).detail;
      setState((current) => ({ ...current, [key]: value }));
    };
    const sync = (event: StorageEvent) => {
      if (event.key === null || Object.values(PERSONALIZATION_KEYS).some((key) => key === event.key)) setState(readPersonalization());
    };
    window.addEventListener(PERSONALIZATION_EVENT, update);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PERSONALIZATION_EVENT, update);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}
