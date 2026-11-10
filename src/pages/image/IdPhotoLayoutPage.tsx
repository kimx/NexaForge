import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DownloadButton } from "../../components/DownloadButton";
import { FileDropzone } from "../../components/FileDropzone";
import { FileInfo } from "../../components/FileInfo";
import { ImageCropEditor } from "../../components/ImageCropEditor";
import { ToolPageTemplate } from "../../components/ToolPageTemplate";
import { useLanguage } from "../../context/LanguageContext";
import { FILE_TOOLS } from "../../data/tools";
import { useBlobUrl } from "../../hooks/useBlobUrl";
import { useSeo } from "../../hooks/useSeo";
import { cropImage } from "../../services/image/cropService";
import { calculateIdPhotoLayout, createIdPhotoLayoutExport, drawIdPhotoPage, mmToPixels, type IdPhotoExportFormat } from "../../services/image/idPhotoLayoutService";
import type { CropSettings, CropValidation, ImageCropEditorLabels, ImageCropResult } from "../../types/imageCrop";
import type { FileProcessResult } from "../../types/tool";
import { createCropRenderPlan } from "../../utils/imageCropGeometry";
import { createIdPhotoCrop, fitIdPhotoCrop } from "../../utils/idPhotoCrop";
import { getRelatedTools } from "../../utils/toolHelpers";
import "../../styles/id-photo.css";

const PAPERS = { "4x6": [101.6, 152.4], "5x7": [127, 177.8], A4: [210, 297] } as const;
const tool = FILE_TOOLS.find(item => item.id === "id-photo-layout")!;
const MAX_PIXELS = 40_000_000;

export function IdPhotoLayoutPage(): JSX.Element {
  const { t } = useLanguage();
  const [file, setFile] = useState<File>();
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number }>();
  const [sourceStatus, setSourceStatus] = useState("loading");
  const [validation, setValidation] = useState<CropValidation>({ valid: true });
  const [preset, setPreset] = useState("two");
  const [width, setWidth] = useState(35);
  const [height, setHeight] = useState(45);
  const [paper, setPaper] = useState<keyof typeof PAPERS>("4x6");
  const [landscape, setLandscape] = useState(false);
  const [margin, setMargin] = useState(3);
  const [spacing, setSpacing] = useState(2);
  const [copies, setCopies] = useState(6);
  const [marks, setMarks] = useState(false);
  const [format, setFormat] = useState<IdPhotoExportFormat>("pdf");
  const [settings, setSettings] = useState(() => createIdPhotoCrop(35 / 45));
  const [cropped, setCropped] = useState<ImageCropResult | null>(null);
  const [result, setResult] = useState<FileProcessResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const revision = useRef(0);
  const sourceUrl = useBlobUrl(file);
  const cropUrl = useBlobUrl(cropped?.blob);
  const ratio = Number.isFinite(width / height) && width >= 1 && height >= 1 ? width / height : 35 / 45;
  const options = useMemo(() => ({
    photoWidthMm: width, photoHeightMm: height,
    paperWidthMm: PAPERS[paper][landscape ? 1 : 0], paperHeightMm: PAPERS[paper][landscape ? 0 : 1],
    marginMm: margin, spacingMm: spacing, copies, cropMarks: marks,
  }), [width, height, paper, landscape, margin, spacing, copies, marks]);
  const calculated = useMemo(() => {
    try { return { layout: calculateIdPhotoLayout(options), error: null }; }
    catch (cause) { return { layout: null, error: cause instanceof Error ? cause.message : "invalid-layout" }; }
  }, [options]);
  const { layout } = calculated;
  const visiblePage = Math.min(pageIndex, (layout?.pageCount ?? 1) - 1);
  const meta = { title: `${t("tool.id-photo-layout.title")} - NexaForge`, description: t("tool.id-photo-layout.description"), canonical: tool.path, h1: t("tool.id-photo-layout.title") };
  useSeo(meta);

  const invalidate = (): void => { revision.current += 1; setResult(null); setError(null); };
  const change = (action: () => void): void => { invalidate(); action(); };
  const changeCrop = (next: CropSettings): void => {
    invalidate(); setCropped(null);
    setSettings(sourceSize ? fitIdPhotoCrop(next, ratio, sourceSize) : next);
  };
  const selectFile = (files: File[]): void => {
    invalidate(); setFile(files[0]); setSourceSize(undefined); setSourceStatus("loading");
    setCropped(null); setSettings(createIdPhotoCrop(ratio));
  };
  const onSize = useCallback((size: { width: number; height: number }) => {
    setSourceSize(size);
    if (size.width * size.height > MAX_PIXELS || Math.max(size.width, size.height) > 8192) return;
    setSettings(current => fitIdPhotoCrop(current, ratio, size));
  }, [ratio]);
  useEffect(() => {
    setCropped(null);
    setSettings(current => {
      const next = { ...createIdPhotoCrop(ratio), imageTransform: current.imageTransform };
      return sourceSize ? fitIdPhotoCrop(next, ratio, sourceSize) : next;
    });
  }, [ratio]);

  const oversized = Boolean(sourceSize && (sourceSize.width * sourceSize.height > MAX_PIXELS || Math.max(sourceSize.width, sourceSize.height) > 8192));
  const cropPlan = useMemo(() => {
    if (!sourceSize || oversized) return null;
    try { return createCropRenderPlan(sourceSize.width, sourceSize.height, settings); } catch { return null; }
  }, [sourceSize, oversized, settings]);
  const cropTooLarge = Boolean(cropPlan && cropPlan.outputWidth * cropPlan.outputHeight > MAX_PIXELS);
  const ready = Boolean(file && sourceStatus === "ready" && validation.valid && cropPlan && !oversized && !cropTooLarge);

  useEffect(() => {
    let active = true;
    if (!file || !ready) return;
    const timer = window.setTimeout(() => {
      void cropImage(file, settings).then(photo => { if (active) { setCropped(photo); setError(null); } })
        .catch(() => { if (active) setError("failed"); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [file, settings, ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout || !cropUrl) return;
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      try { drawIdPhotoPage(canvas, image, layout, visiblePage, 600 / layout.pageWidthMm * 25.4); }
      catch { setError("failed"); }
    };
    image.onerror = () => { if (active) setError("failed"); };
    image.src = cropUrl;
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [cropUrl, layout, visiblePage]);
  useEffect(() => () => { revision.current += 1; }, []);

  const labels = useMemo(() => Object.fromEntries([
    "canvas", "presets", "rectangle", "circle", "heart", "star", "polygon", "freehand", "zoom", "undo", "reset", "rotateLeft", "rotateRight", "flipHorizontal", "flipVertical", "closeShape", "addPoint", "point", "xCoordinate", "yCoordinate", "resizeShape",
  ].map(key => [key, t(`tool.image-crop.${key}`)]).concat([
    "notEnoughPoints", "closeShapeHint", "selfIntersection", "shapeTooSmall", "outsideImage",
  ].map(key => [key, t(`tool.image-crop.validation.${key === "closeShapeHint" ? "closeShape" : key}`)]))) as unknown as ImageCropEditorLabels, [t]);

  const exportFile = async (): Promise<void> => {
    if (!file || !layout || !ready || busy) return;
    const version = revision.current;
    setBusy(true); setError(null); setResult(null);
    try {
      const output = await createIdPhotoLayoutExport(file, settings, options, layout, format, paper);
      if (revision.current === version) setResult(output);
    } catch { if (revision.current === version) setError("failed"); }
    finally { setBusy(false); }
  };

  const numberField = (key: string, value: number, update: (next: number) => void, min: number, step = 0.1): JSX.Element => (
    <label>{t(`idPhoto.${key}`)}<input type="number" min={min} step={step} value={Number.isNaN(value) ? "" : value}
      onChange={event => change(() => update(event.target.value === "" ? NaN : Number(event.target.value)))} /></label>
  );

  return <ToolPageTemplate tool={tool} meta={meta} breadcrumb={["Home", tool.title]} showIdleResult>{{
    workspace: <div className="id-photo-workspace">
      <FileDropzone label={t("idPhoto.upload")} accept="image/jpeg,image/png,image/webp" onFiles={selectFile} compact={Boolean(file)} compactLabel={t("tool.image-crop.replaceImage")} maxSize={50 * 1024 * 1024} />
      <p className="id-photo-note">{t("idPhoto.limits")}</p>
      <FileInfo files={file ? [file] : []} mode="single" compact showEmpty={false} onRemove={() => selectFile([])} />
      {sourceSize && <p>{sourceSize.width} × {sourceSize.height} px</p>}
      <div className="id-photo-fields">
        <label>{t("idPhoto.photoSize")}<select value={preset} onChange={event => change(() => {
          setPreset(event.target.value);
          if (event.target.value !== "custom") { setWidth(event.target.value === "one" ? 25 : 35); setHeight(event.target.value === "one" ? 35 : 45); }
        })}><option value="one">{t("idPhoto.one")}</option><option value="two">{t("idPhoto.two")}</option><option value="custom">{t("idPhoto.custom")}</option></select></label>
        {preset === "custom" && <>{numberField("width", width, setWidth, 1)}{numberField("height", height, setHeight, 1)}</>}
      </div>
      <p className="id-photo-note">{t("idPhoto.disclaimer")}</p>
      {sourceUrl && <ImageCropEditor key={sourceUrl} sourceUrl={sourceUrl} fileName={file!.name} value={settings} onChange={changeCrop}
        onValidationChange={setValidation} onSourceStatusChange={setSourceStatus} onSourceSizeChange={onSize} labels={labels} lockedAspectRatio={ratio} />}
      {sourceStatus === "error" && <p role="alert" className="error">{t("idPhoto.failed")}</p>}
      {(oversized || cropTooLarge) && <p role="alert" className="error">{t("idPhoto.tooLarge")}</p>}
      {ready && cropPlan && (cropPlan.outputWidth < mmToPixels(width) || cropPlan.outputHeight < mmToPixels(height)) && <p role="status" className="id-photo-warning">{t("idPhoto.lowResolution", {
        width: cropPlan.outputWidth, height: cropPlan.outputHeight, targetWidth: mmToPixels(width), targetHeight: mmToPixels(height),
      })}</p>}
      <div className="id-photo-fields">
        <label>{t("idPhoto.paper")}<select value={paper} onChange={event => change(() => setPaper(event.target.value as keyof typeof PAPERS))}><option value="4x6">4 × 6″ (101.6 × 152.4 mm)</option><option value="5x7">5 × 7″ (127 × 177.8 mm)</option><option value="A4">A4 (210 × 297 mm)</option></select></label>
        <label>{t("idPhoto.orientation")}<select value={landscape ? "landscape" : "portrait"} onChange={event => change(() => setLandscape(event.target.value === "landscape"))}><option value="portrait">{t("idPhoto.portrait")}</option><option value="landscape">{t("idPhoto.landscape")}</option></select></label>
        {numberField("margin", margin, setMargin, 0)}{numberField("spacing", spacing, setSpacing, 0)}{numberField("copies", copies, setCopies, 1, 1)}
        <label className="id-photo-check"><input type="checkbox" checked={marks} onChange={event => change(() => setMarks(event.target.checked))} />{t("idPhoto.marks")}</label>
      </div>
      {calculated.error && <p role="alert" className="error">{t(`idPhoto.${calculated.error}`)}</p>}
      {error && <p role="alert" className="error">{t(`idPhoto.${error}`)}</p>}
    </div>,
    options: null,
    result: <div className="id-photo-result">
      {layout && <>
        <p role="status">{t("idPhoto.summary", { copies, capacity: layout.capacity, pages: layout.pageCount })}</p>
        <p>{options.paperWidthMm} × {options.paperHeightMm} mm · {mmToPixels(options.paperWidthMm)} × {mmToPixels(options.paperHeightMm)} px · 300 DPI</p>
        {cropped && cropUrl && ready ? <>
          {layout.pageCount > 1 && <label>{t("idPhoto.page")}<select value={visiblePage} onChange={event => setPageIndex(Number(event.target.value))}>{Array.from({ length: layout.pageCount }, (_, index) => <option key={index} value={index}>{index + 1}</option>)}</select></label>}
          <p>{t("idPhoto.pageCount", { page: visiblePage + 1, pages: layout.pageCount, count: Math.min(layout.capacity, copies - visiblePage * layout.capacity) })}</p>
          <canvas ref={canvasRef} className="id-photo-preview" role="img" aria-label={t("idPhoto.preview")} />
        </> : <p role="status">{t(file ? "idPhoto.updating" : "idPhoto.waiting")}</p>}
      </>}
      <p className="id-photo-warning">{t("idPhoto.print")}</p>
      <label>{t("idPhoto.format")}<select value={format} onChange={event => change(() => setFormat(event.target.value as IdPhotoExportFormat))}><option value="pdf">PDF</option><option value="png">PNG</option><option value="jpg">JPG</option></select></label>
      {format !== "pdf" && <p>{t("idPhoto.zip")}</p>}
      <button className="btn primary" disabled={!ready || !layout || busy} aria-busy={busy} onClick={() => void exportFile()}>{t(busy ? "idPhoto.processing" : "idPhoto.create")}</button>
      {result && <DownloadButton result={result} />}
    </div>,
    howItWorks: [0, 1, 2].map(index => t(`idPhoto.how.${index}`)),
    faq: [{ q: t("idPhoto.faqQ"), a: t("idPhoto.faqA") }],
    relatedTools: getRelatedTools(tool.id),
  }}</ToolPageTemplate>;
}
