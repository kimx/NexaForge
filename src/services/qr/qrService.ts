import QRCode from "qrcode";
import type { FileProcessResult } from "../../types/tool";
import type { QrCodeOptions } from "../../types/tool";

export async function generateQrImage(text: string, options: QrCodeOptions): Promise<FileProcessResult> {
  const dataUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel: options.errorCorrectionLevel,
    width: options.size,
    type: "image/png",
    margin: 2,
  });
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return {
    blob,
    fileName: "qr-code.png",
    mimeType: "image/png",
    size: blob.size,
  };
}
