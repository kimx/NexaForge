import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { localizePath } from "../../routing/localePaths";

export interface TextWorkflowTool {
  label: string;
  path: string;
}

export function TextWorkflowLinks({ tools, heading }: { tools: TextWorkflowTool[]; heading?: string }): JSX.Element | null {
  const { locale } = useLanguage();
  if (tools.length === 0) return null;

  return (
    <nav className="text-workflow-links" aria-label={heading ?? "Next tools"}>
      <h3>{heading ?? "Next"}</h3>
      <div className="text-workflow-links__list">
        {tools.map((tool) => <Link className="btn secondary" key={tool.path} to={localizePath(tool.path, locale)}>{tool.label}</Link>)}
      </div>
    </nav>
  );
}
