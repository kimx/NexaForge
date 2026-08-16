import { formatFileSize } from "../utils/fileSize";
import { useLanguage } from "../context/LanguageContext";

interface FileInfoProps {
  files: File[];
}

export function FileInfo({ files }: FileInfoProps): JSX.Element {
  const { t } = useLanguage();

  if (files.length === 0) {
    return <p>{t("fileInfo.noSelection")}</p>;
  }
  return (
    <ul className="file-list">
      {files.map((file) => (
        <li key={file.name + file.size}>
          <span>{file.name}</span>
          <span>{formatFileSize(file.size)}</span>
          <span>{file.type || t("fileInfo.unknownType")}</span>
        </li>
      ))}
    </ul>
  );
}
