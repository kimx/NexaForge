import { formatFileSize } from "../utils/fileSize";
import { useLanguage } from "../context/LanguageContext";

interface SizeComparisonProps {
  originalSize: number;
  outputSize: number;
}

export function SizeComparison({ originalSize, outputSize }: SizeComparisonProps): JSX.Element {
  const { t } = useLanguage();
  const safeOriginalSize = Math.max(0, originalSize);
  const safeOutputSize = Math.max(0, outputSize);
  const difference = safeOriginalSize - safeOutputSize;
  const percentage = safeOriginalSize > 0 ? (Math.abs(difference) / safeOriginalSize) * 100 : 0;
  const comparisonLabel =
    difference >= 0
      ? t("label.sizeSaved", { size: formatFileSize(difference), percentage: percentage.toFixed(1) })
      : t("label.sizeIncreased", { size: formatFileSize(Math.abs(difference)), percentage: percentage.toFixed(1) });

  return (
    <dl className="size-comparison" aria-label={t("label.sizeComparison")}>
      <div>
        <dt>{t("label.originalSize")}</dt>
        <dd>{formatFileSize(safeOriginalSize)}</dd>
      </div>
      <div>
        <dt>{t("label.outputSize")}</dt>
        <dd>{formatFileSize(safeOutputSize)}</dd>
      </div>
      <div className={difference >= 0 ? "size-comparison__saved" : "size-comparison__increased"}>
        <dt>{t("label.sizeChange")}</dt>
        <dd>{comparisonLabel}</dd>
      </div>
    </dl>
  );
}
