import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { ToolSidebar } from "./components/ToolSidebar";
import { useLanguage } from "./context/LanguageContext";
import { FILE_TOOLS } from "./data/tools";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { NotFoundPage } from "./pages/NotFoundPage";
import {
  localeFromPath,
  localizePath,
  stripLocalePrefix,
} from "./routing/localePaths";
import { SEO_ALIAS_PAGES } from "./seo/landingPages";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const HomePage = lazy(() =>
  import("./pages/HomePage").then((module) => ({ default: module.HomePage }))
);
const JsonHubPage = lazy(() =>
  import("./pages/json/JsonHubPage").then((module) => ({ default: module.JsonHubPage }))
);
const CsvToJsonPage = lazy(() =>
  import("./pages/data/CsvToJsonPage").then((module) => ({ default: module.CsvToJsonPage }))
);
const CsvViewerPage = lazy(() =>
  import("./pages/data/CsvViewerPage").then((module) => ({ default: module.CsvViewerPage }))
);
const JsonFormatterPage = lazy(() =>
  import("./pages/data/JsonFormatterPage").then((module) => ({ default: module.JsonFormatterPage }))
);
const JsonToCsvPage = lazy(() =>
  import("./pages/data/JsonToCsvPage").then((module) => ({ default: module.JsonToCsvPage }))
);
const JsonXmlPage = lazy(() =>
  import("./pages/data/JsonXmlPage").then((module) => ({ default: module.JsonXmlPage }))
);
const XmlFormatterPage = lazy(() =>
  import("./pages/data/XmlFormatterPage").then((module) => ({ default: module.XmlFormatterPage }))
);
const DeveloperToolsPage = lazy(() =>
  import("./pages/developer/DeveloperToolsPage").then((module) => ({ default: module.DeveloperToolsPage }))
);
const RegexTesterPage = lazy(() =>
  import("./pages/developer/RegexTesterPage").then((module) => ({ default: module.RegexTesterPage }))
);
const SqlFormatterPage = lazy(() =>
  import("./pages/developer/SqlFormatterPage").then((module) => ({ default: module.SqlFormatterPage }))
);
const CronBuilderPage = lazy(() =>
  import("./pages/developer/CronBuilderPage").then((module) => ({ default: module.CronBuilderPage }))
);
const UrlParserPage = lazy(() =>
  import("./pages/developer/UrlParserPage").then((module) => ({ default: module.UrlParserPage }))
);
const CurlToCodePage = lazy(() =>
  import("./pages/developer/CurlToCodePage").then((module) => ({ default: module.CurlToCodePage }))
);
const SecretGeneratorPage = lazy(() =>
  import("./pages/developer/SecretGeneratorPage").then((module) => ({ default: module.SecretGeneratorPage }))
);
const JsonToCSharpPage = lazy(() =>
  import("./pages/developer/JsonToCSharpPage").then((module) => ({ default: module.JsonToCSharpPage }))
);
const JsonToTypeScriptPage = lazy(() =>
  import("./pages/developer/JsonToTypeScriptPage").then((module) => ({ default: module.JsonToTypeScriptPage }))
);
const JwtDecoderPage = lazy(() =>
  import("./pages/developer/JwtDecoderPage").then((module) => ({ default: module.JwtDecoderPage }))
);
const JwtKeyGeneratorPage = lazy(() =>
  import("./pages/developer/JwtKeyGeneratorPage").then((module) => ({ default: module.JwtKeyGeneratorPage }))
);
const ImageCompressPage = lazy(() =>
  import("./pages/image/CompressPage").then((module) => ({ default: module.ImageCompressPage }))
);
const ImageConvertPage = lazy(() =>
  import("./pages/image/ConvertPage").then((module) => ({ default: module.ImageConvertPage }))
);
const ImageCropPage = lazy(() =>
  import("./pages/image/CropPage").then((module) => ({ default: module.ImageCropPage }))
);
const ExifPage = lazy(() =>
  import("./pages/image/ExifPage").then((module) => ({ default: module.ExifPage }))
);
const ImageResizePage = lazy(() =>
  import("./pages/image/ResizePage").then((module) => ({ default: module.ImageResizePage }))
);
const HeicConverterPage = lazy(() =>
  import("./pages/image/HeicConverterPage").then((module) => ({ default: module.HeicConverterPage }))
);
const ImageBase64Page = lazy(() =>
  import("./pages/image/ImageBase64Page").then((module) => ({ default: module.ImageBase64Page }))
);
const SvgOptimizerPage = lazy(() =>
  import("./pages/image/SvgOptimizerPage").then((module) => ({ default: module.SvgOptimizerPage }))
);
const FaviconGeneratorPage = lazy(() =>
  import("./pages/image/FaviconGeneratorPage").then((module) => ({ default: module.FaviconGeneratorPage }))
);
const SocialResizerPage = lazy(() =>
  import("./pages/image/SocialResizerPage").then((module) => ({ default: module.SocialResizerPage }))
);
const PdfMergePage = lazy(() =>
  import("./pages/pdf/MergePage").then((module) => ({ default: module.PdfMergePage }))
);
const PdfRotatePage = lazy(() =>
  import("./pages/pdf/RotatePage").then((module) => ({ default: module.PdfRotatePage }))
);
const PdfSplitPage = lazy(() =>
  import("./pages/pdf/SplitPage").then((module) => ({ default: module.PdfSplitPage }))
);
const QrPage = lazy(() =>
  import("./pages/qr/QrPage").then((module) => ({ default: module.QrPage }))
);
const QrReaderPage = lazy(() =>
  import("./pages/qr/QrReaderPage").then((module) => ({ default: module.QrReaderPage }))
);
const BarcodeGeneratorPage = lazy(() =>
  import("./pages/qr/BarcodeGeneratorPage").then((module) => ({ default: module.BarcodeGeneratorPage }))
);
const WifiQrPage = lazy(() =>
  import("./pages/qr/WifiQrPage").then((module) => ({ default: module.WifiQrPage }))
);
const VCardQrPage = lazy(() =>
  import("./pages/qr/VCardQrPage").then((module) => ({ default: module.VCardQrPage }))
);
const Base64Page = lazy(() =>
  import("./pages/text/Base64Page").then((module) => ({ default: module.Base64Page }))
);
const HashPage = lazy(() =>
  import("./pages/text/HashPage").then((module) => ({ default: module.HashPage }))
);
const HtmlEncoderPage = lazy(() =>
  import("./pages/text/HtmlEncoderPage").then((module) => ({ default: module.HtmlEncoderPage }))
);
const MarkdownPreviewPage = lazy(() =>
  import("./pages/text/MarkdownPreviewPage").then((module) => ({ default: module.MarkdownPreviewPage }))
);
const TextDiffPage = lazy(() =>
  import("./pages/text/TextDiffPage").then((module) => ({ default: module.TextDiffPage }))
);
const TextToolsPage = lazy(() =>
  import("./pages/text/TextToolsPage").then((module) => ({ default: module.TextToolsPage }))
);
const UuidPage = lazy(() =>
  import("./pages/text/UuidPage").then((module) => ({ default: module.UuidPage }))
);

interface AppRoute {
  path: string;
  element: JSX.Element;
}

const SEO_ALIAS_ELEMENTS: Record<string, JSX.Element> = {
  "image-convert": <ImageConvertPage />,
  "image-compress": <ImageCompressPage />,
  "heic-converter": <HeicConverterPage />,
  "json-formatter": <JsonFormatterPage />,
  base64: <Base64Page />,
  "url-encoder": <DeveloperToolsPage kind="url-encoder" />,
};

const SEO_ALIAS_ROUTES: AppRoute[] = SEO_ALIAS_PAGES.map(({ path, toolId }) => {
  const element = SEO_ALIAS_ELEMENTS[toolId];
  if (!element) {
    throw new Error(`Missing React route component for SEO landing tool: ${toolId}`);
  }
  return { path, element };
});

const APP_ROUTES: AppRoute[] = [
  { path: "/", element: <HomePage /> },
  { path: "/json", element: <JsonHubPage /> },
  { path: "/image/resize", element: <ImageResizePage /> },
  { path: "/image/crop", element: <ImageCropPage /> },
  { path: "/image/compress", element: <ImageCompressPage /> },
  { path: "/image/convert", element: <ImageConvertPage /> },
  { path: "/image/exif-viewer", element: <ExifPage kind="image-exif-viewer" /> },
  { path: "/image/remove-exif", element: <ExifPage kind="image-remove-exif" /> },
  { path: "/image/heic-converter", element: <HeicConverterPage /> },
  { path: "/image/base64", element: <ImageBase64Page /> },
  { path: "/image/svg-optimizer", element: <SvgOptimizerPage /> },
  { path: "/image/favicon-generator", element: <FaviconGeneratorPage /> },
  { path: "/image/social-resizer", element: <SocialResizerPage /> },
  { path: "/pdf/merge", element: <PdfMergePage /> },
  { path: "/pdf/split", element: <PdfSplitPage /> },
  { path: "/pdf/rotate", element: <PdfRotatePage /> },
  { path: "/data/json-formatter", element: <JsonFormatterPage /> },
  { path: "/data/csv-viewer", element: <CsvViewerPage /> },
  { path: "/data/csv-to-json", element: <CsvToJsonPage /> },
  { path: "/data/json-to-csv", element: <JsonToCsvPage /> },
  { path: "/data/json-xml", element: <JsonXmlPage /> },
  { path: "/data/xml-formatter", element: <XmlFormatterPage /> },
  { path: "/text/hash", element: <HashPage /> },
  { path: "/text/uuid", element: <UuidPage /> },
  { path: "/text/word-counter", element: <TextToolsPage kind="word-counter" /> },
  { path: "/text/case-converter", element: <TextToolsPage kind="case-converter" /> },
  { path: "/text/remove-duplicate-lines", element: <TextToolsPage kind="remove-duplicate-lines" /> },
  { path: "/text/sort-lines", element: <TextToolsPage kind="sort-lines" /> },
  { path: "/text/diff", element: <TextDiffPage /> },
  { path: "/text/html-encoder", element: <HtmlEncoderPage /> },
  { path: "/text/markdown", element: <MarkdownPreviewPage /> },
  { path: "/developer/base64", element: <Base64Page /> },
  { path: "/developer/jwt-key", element: <JwtKeyGeneratorPage /> },
  { path: "/developer/jwt-decoder", element: <JwtDecoderPage /> },
  { path: "/developer/url-encoder", element: <DeveloperToolsPage kind="url-encoder" /> },
  { path: "/developer/unix-timestamp", element: <DeveloperToolsPage kind="unix-timestamp" /> },
  { path: "/developer/json-yaml", element: <DeveloperToolsPage kind="json-yaml" /> },
  { path: "/developer/json-diff", element: <DeveloperToolsPage kind="json-diff" /> },
  { path: "/developer/regex-tester", element: <RegexTesterPage /> },
  { path: "/developer/sql-formatter", element: <SqlFormatterPage /> },
  { path: "/developer/cron-builder", element: <CronBuilderPage /> },
  { path: "/developer/url-parser", element: <UrlParserPage /> },
  { path: "/developer/curl-to-code", element: <CurlToCodePage /> },
  { path: "/developer/secret-generator", element: <SecretGeneratorPage /> },
  { path: "/developer/json-to-csharp", element: <JsonToCSharpPage /> },
  { path: "/developer/json-to-typescript", element: <JsonToTypeScriptPage /> },
  { path: "/qr-code", element: <QrPage /> },
  { path: "/qr-code/reader", element: <QrReaderPage /> },
  { path: "/barcode/generator", element: <BarcodeGeneratorPage /> },
  { path: "/qr-code/wifi", element: <WifiQrPage /> },
  { path: "/qr-code/vcard", element: <VCardQrPage /> },
  ...SEO_ALIAS_ROUTES,
];

function RouteLocaleSync(): null {
  const { pathname } = useLocation();
  const { locale, setLocale } = useLanguage();
  const routeLocale = localeFromPath(pathname);

  useEffect(() => {
    if (locale !== routeLocale) {
      setLocale(routeLocale);
    }
  }, [locale, routeLocale, setLocale]);

  return null;
}

function ScrollToTop(): null {
  const { pathname } = useLocation();

  useIsomorphicLayoutEffect(() => {
    const resetRoutePosition = () => {
      if (document.querySelector('[role="dialog"]')) {
        return;
      }
      document.getElementById("main-content")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    resetRoutePosition();
    const frame = window.requestAnimationFrame(resetRoutePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}

function RouteLoading(): JSX.Element {
  const { t } = useLanguage();

  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading__spinner" aria-hidden="true" />
      <span>{t("route.loading")}</span>
    </div>
  );
}

function ToolFrame({ children }: { children: JSX.Element }): JSX.Element {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const basePath = stripLocalePrefix(pathname);
  const isHome = basePath === "/";
  const currentTool = FILE_TOOLS.find((tool) => tool.path === basePath);
  const isNarrowViewport = useMediaQuery("(max-width: 900px)");
  const [isToolsOpen, setToolsOpen] = useState(false);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeTools = useCallback(() => {
    setToolsOpen(false);
    window.setTimeout(() => toolsButtonRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    setToolsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isNarrowViewport || !isToolsOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isNarrowViewport, isToolsOpen]);

  useEffect(() => {
    if (!currentTool || isHome) {
      return;
    }
    try {
      const stored = window.localStorage.getItem("nexaforge-recent-tools");
      const previous = stored ? JSON.parse(stored) : [];
      const recent = Array.isArray(previous)
        ? previous.filter((id): id is string => typeof id === "string")
        : [];
      window.localStorage.setItem(
        "nexaforge-recent-tools",
        JSON.stringify([
          currentTool.id,
          ...recent.filter((id) => id !== currentTool.id),
        ].slice(0, 6))
      );
    } catch {
      // Recent tools are best-effort when storage is unavailable.
    }
  }, [currentTool, isHome]);

  return (
    <div className="site-shell">
      <ScrollToTop />
      <a className="skip-link" href="#main-content">
        {t("skip.toMain")}
      </a>
      <Header
        showBrand
        showToolsButton={isNarrowViewport}
        toolsOpen={isToolsOpen}
        onOpenTools={() => setToolsOpen(true)}
        toolsButtonRef={toolsButtonRef}
      />
      <div className={isHome ? "home-dashboard" : "site-content"}>
        <ToolSidebar
          isMobile={isNarrowViewport}
          isOpen={!isNarrowViewport || isToolsOpen}
          showDesktopBrand={false}
          onClose={closeTools}
          closeButtonRef={closeButtonRef}
        />
        <main
          id="main-content"
          className={isHome ? "home-workspace" : "content-shell"}
          tabIndex={-1}
        >
          <Suspense fallback={<RouteLoading />}>
            {isHome ? children : <div className="tool-page-shell">{children}</div>}
          </Suspense>
        </main>
      </div>
      {isNarrowViewport && isToolsOpen ? (
        <button
          type="button"
          className="tool-sidebar-backdrop"
          aria-hidden="true"
          tabIndex={-1}
          onClick={closeTools}
        />
      ) : null}
      <Footer />
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <>
      <RouteLocaleSync />
      <Routes>
        {APP_ROUTES.flatMap(({ path, element }) => [
          <Route
            key={`zh-TW:${path}`}
            path={path}
            element={<ToolFrame>{element}</ToolFrame>}
          />,
          <Route
            key={`en:${path}`}
            path={localizePath(path, "en")}
            element={<ToolFrame>{element}</ToolFrame>}
          />,
        ])}
        <Route path="/text/base64" element={<Navigate to="/developer/base64" replace />} />
        <Route path="/en/text/base64" element={<Navigate to="/en/developer/base64" replace />} />
        <Route path="*" element={<ToolFrame><NotFoundPage /></ToolFrame>} />
      </Routes>
    </>
  );
}
