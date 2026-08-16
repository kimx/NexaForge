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
import { QrPage } from "./pages/qr/QrPage";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { ToolSidebar } from "./components/ToolSidebar";

function ScrollToTop(): JSX.Element {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname]);

  return null;
}

function ToolFrame({ children }: { children: JSX.Element }): JSX.Element {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className="site-shell">
      <ScrollToTop />
      <Header />
      {isHome ? (
        children
      ) : (
        <div className="site-content">
          <ToolSidebar />
          <div className="content-shell">
            <div className="tool-page-shell">{children}</div>
          </div>
        </div>
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

      <Route path="/qr-code" element={<ToolFrame><QrPage /></ToolFrame>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
