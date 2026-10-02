import { useLanguage } from "../../context/LanguageContext";
import { fileWorkflowMessages } from "../../i18n/fileWorkflowMessages";
import { formatFileSize } from "../../utils/fileSize";

export function WorkflowFileList({ files, disabled, onChange }: { files: File[]; disabled: boolean; onChange: (files: File[]) => void }) {
  const { locale } = useLanguage(); const c = fileWorkflowMessages[locale];
  function move(index: number, delta: number) {
    const next = [...files]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; onChange(next);
  }
  return <ol className="workflow-file-list" aria-label={c.files}>{files.map((file, index) => <li key={`${file.name}-${index}`}>
    <span>{file.name}<small>{formatFileSize(file.size)}</small></span>
    <div><button type="button" className="btn secondary" aria-label={`${c.up}: ${file.name}`} disabled={disabled || index === 0} onClick={() => move(index, -1)}>↑</button>
      <button type="button" className="btn secondary" aria-label={`${c.down}: ${file.name}`} disabled={disabled || index === files.length - 1} onClick={() => move(index, 1)}>↓</button>
      <button type="button" className="btn secondary" aria-label={`${c.remove}: ${file.name}`} disabled={disabled} onClick={() => onChange(files.filter((_, i) => i !== index))}>×</button></div>
  </li>)}</ol>;
}
