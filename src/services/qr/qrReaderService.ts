export interface QrReadResult {
  text: string;
  format: string;
}

export interface QrCameraControls {
  stop(): void;
}

export interface QrCameraSession {
  stop(): void;
}

export interface QrReaderDependencies {
  createObjectUrl(file: Blob): string;
  revokeObjectUrl(url: string): void;
  decodeImage(url: string): Promise<QrReadResult>;
  startCamera(
    video: HTMLVideoElement,
    onDecoded: (result: QrReadResult) => void,
    onError: (error: Error) => void
  ): Promise<QrCameraControls>;
}

async function decodeImageWithZxing(url: string): Promise<QrReadResult> {
  const { BrowserQRCodeReader } = await import("@zxing/browser");
  const reader = new BrowserQRCodeReader();
  const result = await reader.decodeFromImageUrl(url);
  return { text: result.getText(), format: "QR_CODE" };
}

async function startCameraWithZxing(
  video: HTMLVideoElement,
  onDecoded: (result: QrReadResult) => void,
  onError: (error: Error) => void
): Promise<QrCameraControls> {
  const { BrowserQRCodeReader } = await import("@zxing/browser");
  const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 120 });
  return reader.decodeFromConstraints(
    { audio: false, video: { facingMode: { ideal: "environment" } } },
    video,
    (result, error) => {
      if (result) {
        onDecoded({ text: result.getText(), format: "QR_CODE" });
        return;
      }
      if (error && error.name !== "NotFoundException") {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  );
}

const defaultDependencies: QrReaderDependencies = {
  createObjectUrl: (file) => URL.createObjectURL(file),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  decodeImage: decodeImageWithZxing,
  startCamera: startCameraWithZxing,
};

export async function readQrFromImage(
  file: Blob,
  dependencies: Partial<QrReaderDependencies> = {}
): Promise<QrReadResult> {
  const resolved = { ...defaultDependencies, ...dependencies };
  const url = resolved.createObjectUrl(file);
  try {
    return await resolved.decodeImage(url);
  } finally {
    resolved.revokeObjectUrl(url);
  }
}

export async function startQrCamera(
  video: HTMLVideoElement,
  onResult: (result: QrReadResult) => void,
  onError: (error: Error) => void,
  dependencies: Pick<QrReaderDependencies, "startCamera"> = defaultDependencies
): Promise<QrCameraSession> {
  let stopped = false;
  let controls: QrCameraControls | null = null;

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    controls?.stop();
    const stream = video.srcObject;
    if (stream && "getTracks" in stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    video.srcObject = null;
  };

  controls = await dependencies.startCamera(
    video,
    (result) => {
      onResult(result);
      stop();
    },
    onError
  );
  if (stopped) controls.stop();

  return { stop };
}
