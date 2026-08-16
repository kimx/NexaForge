import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { HomePage } from "./pages/HomePage";
import { ImageResizePage } from "./pages/image/ResizePage";
import { ImageCompressPage } from "./pages/image/CompressPage";
import { ImageConvertPage } from "./pages/image/ConvertPage";
import { PdfMergePage } from "./pages/pdf/MergePage";
import { PdfSplitPage } from "./pages/pdf/SplitPage";
import { PdfRotatePage } from "./pages/pdf/RotatePage";
import { JsonFormatterPage } from "./pages/data/JsonFormatterPage";
import { CsvViewerPage } from "./pages/data/CsvViewerPage";
import { CsvToJsonPage } from "./pages/data/CsvToJsonPage";
import { JsonToCsvPage } from "./pages/data/JsonToCsvPage";
import { Base64Page } from "./pages/text/Base64Page";
import { HashPage } from "./pages/text/HashPage";
import { UuidPage } from "./pages/text/UuidPage";
import { HtmlEncoderPage } from "./pages/text/HtmlEncoderPage";
import { QrPage } from "./pages/qr/QrPage";
import { JwtDecoderPage } from "./pages/developer/JwtDecoderPage";
import { JwtKeyGeneratorPage } from "./pages/developer/JwtKeyGeneratorPage";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { ToolSidebar } from "./components/ToolSidebar";
import { FILE_TOOLS } from "./data/tools";
import { useLanguage, useLocalizedToolMeta } from "./context/LanguageContext";

function ScrollToTop(): JSX.Element | null {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname]);

  return null;
}

function formatRouteLabel(pathname: string, t: (key: string) => string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return t("sidebar.home");
  }

  const words = parts
    .map((part) =>
      part
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ")
    );

  return words.join(" ");
}

const TOOL_VISUALS: Record<string, { label: string; tone: string }> = {
  "image-resize": { label: "IMG", tone: "blue" },
  "image-compress": { label: "↘", tone: "mint" },
  "image-convert": { label: "IMG", tone: "sky" },
  "pdf-merge": { label: "PDF", tone: "red" },
  "pdf-split": { label: "✂", tone: "violet" },
  "pdf-rotate": { label: "PDF", tone: "red" },
  "json-formatter": { label: "{}", tone: "blue" },
  "csv-viewer": { label: "CSV", tone: "mint" },
  "csv-to-json": { label: "CSV", tone: "mint" },
  "json-to-csv": { label: "{}", tone: "blue" },
  "base64": { label: "64", tone: "amber" },
  "html-encoder": { label: "HTML", tone: "blue" },
  hash: { label: "#", tone: "violet" },
  uuid: { label: "ID", tone: "sky" },
  "jwt-key": { label: "KEY", tone: "violet" },
  "jwt-decoder": { label: "JWT", tone: "blue" },
  "qr-code": { label: "QR", tone: "blue" },
};

function ToolFrame({ children }: { children: JSX.Element }): JSX.Element {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const localToolMeta = useLocalizedToolMeta();
  const isHome = pathname === "/";
  const routeLabel = formatRouteLabel(pathname, t);
  const currentTool = FILE_TOOLS.find((tool) => tool.path === pathname);
  const landingTitle = currentTool ? localToolMeta(currentTool.id, "title") : routeLabel;
  const landingDescription = currentTool ? localToolMeta(currentTool.id, "description") : t("home.subtitle");
  const landingVisual = currentTool ? TOOL_VISUALS[currentTool.id] : undefined;

  return (
    <div className="site-shell">
      <ScrollToTop />
      <Header />
      {isHome ? (
        children
      ) : (
        <>
          <section className="page-landing">
            {landingVisual ? (
              <span
                className={`page-landing__icon page-landing__icon--${landingVisual.tone}`}
                aria-hidden="true"
              >
                {landingVisual.label}
              </span>
            ) : null}
            <p className="page-landing__kicker">{t("pageLanding.kicker")}</p>
            <h1 className="page-landing__title">{landingTitle}</h1>
            <p className="page-landing__description">{landingDescription}</p>
          </section>
          <div className="site-content">
            <ToolSidebar />
            <div className="content-shell">
              <div className="tool-page-shell">{children}</div>
            </div>
          </div>
        </>
      )}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ToolFrame><HomePage /></ToolFrame>} />
      <Route path="/image/resize" element={<ToolFrame><ImageResizePage /></ToolFrame>} />
      <Route path="/image/compress" element={<ToolFrame><ImageCompressPage /></ToolFrame>} />
      <Route path="/image/convert" element={<ToolFrame><ImageConvertPage /></ToolFrame>} />

      <Route path="/pdf/merge" element={<ToolFrame><PdfMergePage /></ToolFrame>} />
      <Route path="/pdf/split" element={<ToolFrame><PdfSplitPage /></ToolFrame>} />
      <Route path="/pdf/rotate" element={<ToolFrame><PdfRotatePage /></ToolFrame>} />

      <Route path="/data/json-formatter" element={<ToolFrame><JsonFormatterPage /></ToolFrame>} />
      <Route path="/data/csv-viewer" element={<ToolFrame><CsvViewerPage /></ToolFrame>} />
      <Route path="/data/csv-to-json" element={<ToolFrame><CsvToJsonPage /></ToolFrame>} />
      <Route path="/data/json-to-csv" element={<ToolFrame><JsonToCsvPage /></ToolFrame>} />

      <Route path="/text/base64" element={<ToolFrame><Base64Page /></ToolFrame>} />
      <Route path="/text/hash" element={<ToolFrame><HashPage /></ToolFrame>} />
      <Route path="/text/uuid" element={<ToolFrame><UuidPage /></ToolFrame>} />
      <Route path="/text/html-encoder" element={<ToolFrame><HtmlEncoderPage /></ToolFrame>} />
      <Route path="/developer/jwt-key" element={<ToolFrame><JwtKeyGeneratorPage /></ToolFrame>} />
      <Route path="/developer/jwt-decoder" element={<ToolFrame><JwtDecoderPage /></ToolFrame>} />

      <Route path="/qr-code" element={<ToolFrame><QrPage /></ToolFrame>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
