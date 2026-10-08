import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import {
  registerPdfPasswordPresenter,
  type PdfPasswordPrompt,
} from "../services/pdf/pdfPasswordPrompt";
import { PdfPasswordModal } from "./PdfPasswordModal";

export function PdfPasswordProvider(): JSX.Element | null {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState<PdfPasswordPrompt | null>(null);

  useEffect(() => registerPdfPasswordPresenter(setPrompt), []);

  return prompt ? <PdfPasswordModal key={prompt.id} prompt={prompt} t={t} /> : null;
}
