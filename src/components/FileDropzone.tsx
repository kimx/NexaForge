import { useCallback, useId, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { validateFileSize, validateMime } from "../utils/validation";
import { useLanguage } from "../context/LanguageContext";

export interface FileDropzoneProps {
  label: string;
  onFiles: (files: File[]) => void;
  onRejectedFiles?: (files: string[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
}

export function FileDropzone({
  label,
  onFiles,
  onRejectedFiles,
  accept = "*/*",
  multiple = false,
  maxSize,
}: FileDropzoneProps): JSX.Element {
  const [isDragging, setDragging] = useState(false);
  const inputId = useId();
  const { t } = useLanguage();

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const list = Array.from(fileList);
      const accepted: File[] = [];
      const rejected: string[] = [];

      list.forEach((file) => {
        const mimeError = accept ? validateMime(file, accept) : null;
        const sizeValidation =
          maxSize === undefined
            ? validateFileSize(file)
            : file.size > maxSize
              ? { message: t("fileDropzone.tooLarge") }
              : null;
        if (mimeError || sizeValidation) {
          rejected.push(file.name);
          return;
        }
        accepted.push(file);
      });

      if (onRejectedFiles && rejected.length > 0) {
        onRejectedFiles(rejected);
      }
      if (accepted.length > 0) {
        onFiles(accepted);
      }
    },
    [maxSize, accept, onFiles, onRejectedFiles]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(false);
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

  return (
    <section
      className={`file-dropzone${isDragging ? " dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      aria-label={t("fileDropzone.aria")}
    >
      <input
        id={inputId}
        className="file-input"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
      <label htmlFor={inputId} className="file-dropzone-label">
        <strong>{label}</strong>
        <span>{t("fileDropzone.orSelect")}</span>
      </label>
      <p>{t("fileDropzone.help")}</p>
    </section>
  );
}
