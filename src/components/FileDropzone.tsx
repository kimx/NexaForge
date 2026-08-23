import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import type { FileRejection } from "../types/tool";
import { validateFileSize, validateMime } from "../utils/validation";
import { useLanguage } from "../context/LanguageContext";

export interface FileDropzoneProps {
  label: string;
  onFiles: (files: File[]) => void;
  onRejectedFiles?: (files: FileRejection[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  enablePaste?: boolean;
  setInputRef?: (input: HTMLInputElement | null) => void;
  compact?: boolean;
  compactLabel?: string;
  disabled?: boolean;
}

export function FileDropzone({
  label,
  onFiles,
  onRejectedFiles,
  accept = "*/*",
  multiple = false,
  maxSize,
  enablePaste,
  setInputRef,
  compact = false,
  compactLabel,
  disabled = false,
}: FileDropzoneProps): JSX.Element {
  const [isDragging, setDragging] = useState(false);
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const { t } = useLanguage();
  const compactActionLabel = multiple
    ? t("fileDropzone.addMoreFiles")
    : t("fileDropzone.replaceFile");
  const actionLabel = compact ? (compactLabel ?? compactActionLabel) : label;

  useEffect(() => {
    setInputRef?.(inputRef.current);
    return () => {
      setInputRef?.(null);
    };
  }, [setInputRef]);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      if (disabled) {
        return;
      }
      const list = Array.from(fileList);
      const accepted: File[] = [];
      const rejected: FileRejection[] = [];

      list.forEach((file) => {
        const mimeError = accept ? validateMime(file, accept) : null;
        const sizeValidation =
          maxSize === undefined
            ? validateFileSize(file)
            : file.size > maxSize
              ? {
                  message: t("fileDropzone.tooLarge"),
                  reason: "size exceeds" as const,
                }
              : null;

        if (mimeError || sizeValidation) {
          const error = mimeError ?? sizeValidation;
          if (error) {
            rejected.push({
              fileName: file.name,
              reason: error.reason ?? "invalid mime",
              message: error.message,
            });
          }
          return;
        }
        accepted.push(file);
      });

      if (onRejectedFiles && rejected.length > 0) {
        onRejectedFiles(rejected);
      }
      setRejections(rejected);
      if (accepted.length > 0) {
        onFiles(accepted);
      }
    },
    [maxSize, accept, onFiles, onRejectedFiles, t, disabled]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(false);
      dragDepth.current = 0;
      if (event.dataTransfer.files) {
        handleFiles(event.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.currentTarget.files;
      if (files) {
        handleFiles(files);
      }
      event.currentTarget.value = "";
    },
    [handleFiles]
  );

  const handleDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0 || !event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false);
    }
  }, []);

  useEffect(() => {
    if (!enablePaste || disabled) {
      return;
    }

    const handler = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items || items.length === 0) {
        return;
      }

      const imageFiles = Array.from(items)
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null && file.type.startsWith("image/"));

      if (!imageFiles.length) {
        return;
      }

      event.preventDefault();
      handleFiles(imageFiles);
    };

    window.addEventListener("paste", handler);
    return () => {
      window.removeEventListener("paste", handler);
    };
  }, [enablePaste, handleFiles, disabled]);

  return (
    <section
      className={`file-dropzone${compact ? " file-dropzone--compact" : ""}${isDragging ? " file-dropzone--dragging" : ""}${disabled ? " file-dropzone--disabled" : ""}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={t("fileDropzone.aria")}
      aria-describedby={compact ? undefined : `${inputId}-help`}
      aria-disabled={disabled || undefined}
    >
      <input
        id={inputId}
        className="file-input"
        ref={inputRef}
        type="file"
        disabled={disabled}
        accept={accept}
        multiple={multiple}
        aria-label={`${actionLabel} ${t("fileDropzone.orSelect")}`}
        onChange={handleChange}
      />
      <label htmlFor={inputId} className="file-dropzone-label">
        <strong>{actionLabel}</strong>
        <span>{t("fileDropzone.orSelect")}</span>
      </label>
      {compact ? null : <p id={`${inputId}-help`}>{t("fileDropzone.help")}</p>}
      {rejections.length > 0 ? (
        <ul className="file-dropzone__rejections" role="alert">
          {rejections.map((rejection) => (
            <li key={`${rejection.fileName}-${rejection.reason}`}>
              <strong>{rejection.fileName}</strong>: {rejection.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
