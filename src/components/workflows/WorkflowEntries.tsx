import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_WORKFLOWS } from "../../data/workflows";
import { fileWorkflowMessages } from "../../i18n/fileWorkflowMessages";
import { localizePath } from "../../routing/localePaths";
import "../../styles/file-workflows.css";

export function WorkflowEntries({ toolId }: { toolId?: string }) {
  const { locale } = useLanguage();
  const items = FILE_WORKFLOWS.filter(item => !toolId || (item.tools as readonly string[]).includes(toolId));
  if (!items.length) return null;
  return <section className="workflow-entries" aria-label={fileWorkflowMessages[locale].heading}>
    <h2>{fileWorkflowMessages[locale].heading}</h2>
    <div className="workflow-entries__links">{items.map(item => <Link key={item.id} to={localizePath(item.path, locale)}><strong>{item[locale].title}<span aria-hidden="true"> →</span></strong><span>{item[locale].description}</span></Link>)}</div>
  </section>;
}
