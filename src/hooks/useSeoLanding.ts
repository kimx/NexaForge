import { useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import {
  findSeoLanding,
  type LandingContent,
  type SeoLandingDefinition,
} from "../seo/landingPages";

export interface ActiveSeoLanding {
  definition: SeoLandingDefinition;
  content: LandingContent;
}

export function useSeoLanding(): ActiveSeoLanding | undefined {
  const { pathname } = useLocation();
  const { locale } = useLanguage();
  const definition = findSeoLanding(pathname);

  return definition
    ? { definition, content: definition.content[locale] }
    : undefined;
}
