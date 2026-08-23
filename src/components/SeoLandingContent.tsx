import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Locale } from "../context/LanguageContext";
import type { LandingContent } from "../seo/landingPages";
import { localizePath } from "../routing/localePaths";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface SeoLandingContentProps {
  content: LandingContent;
  locale: Locale;
}

export function SeoLandingContent({
  content,
  locale,
}: SeoLandingContentProps): JSX.Element {
  const isEnglish = locale === "en";
  const relatedHeading = isEnglish ? "Related tools" : "相關工具";
  const isNarrow = useMediaQuery("(max-width: 650px)");
  const [isExpanded, setIsExpanded] = useState(!isNarrow);

  useEffect(() => {
    setIsExpanded(!isNarrow);
  }, [isNarrow]);

  return (
    <details
      className="tool-card seo-landing seo-landing-disclosure"
      open={isExpanded}
      onToggle={(event) => setIsExpanded(event.currentTarget.open)}
    >
      <summary className="seo-landing-disclosure__summary">
        {isEnglish ? "About this tool" : "了解這項工具"}
      </summary>
      <div className="seo-landing__body">
        <p className="seo-landing__intro">{content.intro}</p>

        {content.sections.map((section) => (
          <section key={section.heading} className="seo-landing__section">
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}

        <section className="seo-landing__section">
        <h2>{isEnglish ? "How to use this tool" : "如何使用這項工具"}</h2>
        <ol className="seo-landing__steps">
          {content.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        </section>

        <section className="seo-landing__section">
        <h2>{isEnglish ? "Private, local processing" : "隱私與本機處理"}</h2>
        <p>{content.privacy}</p>
        </section>

        <section className="seo-landing__section">
        <h2>{isEnglish ? "Frequently asked questions" : "常見問題"}</h2>
        <div className="tool-faq">
          {content.faq.map(({ q, a }) => (
            <details key={q} className="tool-faq__item">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        </section>

        <nav className="seo-landing__related" aria-label={relatedHeading}>
        <h2>{relatedHeading}</h2>
        <ul className="related-tools">
          {content.related.map(({ path, label }) => (
            <li key={path}>
              <Link to={localizePath(path, locale)}>{label}</Link>
            </li>
          ))}
        </ul>
        </nav>
      </div>
    </details>
  );
}
