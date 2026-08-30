import { downloadBlob } from "../../utils/download";

interface TextResultActionsProps {
  text: string;
  filename: string;
  onClear: () => void;
  onUseAsInput?: (text: string) => void;
  labels?: Partial<{
    copy: string;
    download: string;
    clear: string;
    useAsInput: string;
  }>;
}

export function TextResultActions({
  text,
  filename,
  onClear,
  onUseAsInput,
  labels,
}: TextResultActionsProps): JSX.Element {
  const handleCopy = async (): Promise<void> => {
    if (text) await navigator.clipboard.writeText(text);
  };

  const handleDownload = (): void => {
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
  };

  return (
    <div className="tool-actions text-result-actions">
      <button type="button" className="btn secondary" onClick={() => void handleCopy()} disabled={!text}>
        {labels?.copy ?? "Copy result"}
      </button>
      <button type="button" className="btn secondary" onClick={handleDownload} disabled={!text}>
        {labels?.download ?? "Download .txt"}
      </button>
      {onUseAsInput ? (
        <button type="button" className="btn secondary" onClick={() => onUseAsInput(text)} disabled={!text}>
          {labels?.useAsInput ?? "Use output as input"}
        </button>
      ) : null}
      <button type="button" className="btn secondary" onClick={onClear}>
        {labels?.clear ?? "Clear"}
      </button>
    </div>
  );
}
