import { render, screen } from "@testing-library/react";
import { LanguageProvider, translate, useLanguage } from "./LanguageContext";

function LocaleProbe(): JSX.Element {
  const { locale } = useLanguage();
  return <output>{locale}</output>;
}

describe("Chinese translation coverage", () => {
  it("provides localized navigation, EXIF, JWT, and Markdown copy", () => {
    expect(translate("zh-TW", "sidebar.navigation")).toBe("工具導覽");
    expect(translate("zh-TW", "tool.image-exif.shared.jpegOnly")).toBe("EXIF 工具目前僅支援 JPEG 檔案。");
    expect(translate("zh-TW", "tool.image-exif-viewer.error.processing")).toBe("無法讀取這張照片的 EXIF 中繼資料。");
    expect(translate("zh-TW", "tool.image-remove-exif.label.removedBytes", { count: 42 })).toBe(
      "已移除 42 位元組的 EXIF 中繼資料。"
    );
    expect(translate("zh-TW", "tool.jwt-decoder.error.decodeFailed")).toBe(
      "JWT 格式無效，請確認權杖包含標頭、載荷與簽章三個區段。"
    );
    expect(translate("zh-TW", "tool.markdown-previewer.sample")).toContain("Markdown 預覽");
    expect(translate("zh-TW", "tool.markdown-previewer.sample")).not.toContain("Type some Markdown");
  });
});

describe("LanguageProvider route determinism", () => {
  it("accepts an explicit locale for server rendering", () => {
    render(
      <LanguageProvider initialLocale="en">
        <LocaleProbe />
      </LanguageProvider>
    );

    expect(screen.getByText("en")).toBeInTheDocument();
  });

  it("does not let a stored preference override an unprefixed URL", () => {
    window.localStorage.setItem("nexaforge-locale", "en");
    window.history.replaceState({}, "", "/");

    render(
      <LanguageProvider>
        <LocaleProbe />
      </LanguageProvider>
    );

    expect(screen.getByText("zh-TW")).toBeInTheDocument();
  });
});
