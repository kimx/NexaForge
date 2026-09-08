import { Link } from "react-router-dom";
import { useLanguage, useLocalizedToolMeta } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { localizePath } from "../../routing/localePaths";

export interface TextWorkflowTool {
  label?: string;
  path?: string;
  toolId?: string;
}

export function TextWorkflowLinks({ tools, heading }: { tools: TextWorkflowTool[]; heading?: string }): JSX.Element | null {
  const { locale, t } = useLanguage();
  const toolMeta = useLocalizedToolMeta();
  if (tools.length === 0) return null;

  const links = tools.map((tool) => {
    const registeredTool = tool.toolId ? FILE_TOOLS.find((item) => item.id === tool.toolId) : undefined;
    return {
      path: tool.path ?? registeredTool?.path ?? "",
      label: tool.label ?? (tool.toolId ? toolMeta(tool.toolId, "title") : ""),
    };
  }).filter((tool) => tool.path && tool.label);

  if (links.length === 0) return null;

  return (
    <nav className="text-workflow-links" aria-label={heading ?? t("textWorkflow.nextTools")}>
      <h3>{heading ?? t("textWorkflow.next")}</h3>
      <div className="text-workflow-links__list">
        {links.map((tool) => <Link className="btn secondary" key={tool.path} to={localizePath(tool.path, locale)}>{tool.label}</Link>)}
      </div>
    </nav>
  );
}
