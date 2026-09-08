import { useRef } from "react";

interface LineNumberedCodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  ariaLabel: string;
  describedBy?: string;
  invalid?: boolean;
}

export function LineNumberedCodeEditor({
  value,
  onChange,
  readOnly = false,
  ariaLabel,
  describedBy,
  invalid = false,
}: LineNumberedCodeEditorProps): JSX.Element {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = Math.max(1, value.split(/\r?\n/).length);

  return (
    <div className="line-numbered-editor">
      <div ref={gutterRef} className="line-numbered-editor__gutter" aria-hidden="true">
        {Array.from({ length: lineCount }, (_, index) => (
          <span key={index}>{index + 1}</span>
        ))}
      </div>
      <textarea
        className="line-numbered-editor__textarea"
        value={value}
        readOnly={readOnly}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        spellCheck={false}
        rows={16}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        onScroll={(event) => {
          if (gutterRef.current) {
            gutterRef.current.scrollTop = event.currentTarget.scrollTop;
          }
        }}
      />
    </div>
  );
}
