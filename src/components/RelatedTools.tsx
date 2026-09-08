import { Link } from "react-router-dom";
import { useLanguage, useLocalizedToolMeta } from "../context/LanguageContext";
import { localizePath } from "../routing/localePaths";
import type { ToolDefinition } from "../types/tool";

export interface RelatedToolLink {
  path: string;
  label: string;
}

interface RelatedToolsProps {
  tools?: ToolDefinition[];
  links?: RelatedToolLink[];
  heading?: string;
  ariaLabel?: string;
  className?: string;
}

export function RelatedTools({
  tools = [],
  links,
  heading,
  ariaLabel,
  className = "",
}: RelatedToolsProps): JSX.Element {
  const { locale } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const items = links ?? tools.map((tool) => ({
    path: tool.path,
    label: localToolMeta(tool.id, "title"),
  }));

  return (
    <nav className={`related-tools-nav ${className}`.trim()} aria-label={ariaLabel ?? heading}>
      {heading ? <h2>{heading}</h2> : null}
      <ul className="related-tools">
        {items.map(({ path, label }) => (
          <li key={path}>
            <Link to={localizePath(path, locale)}>{label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
