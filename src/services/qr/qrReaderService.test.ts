import { describe, expect, it, vi } from "vitest";
import { readQrFromImage, startQrCamera } from "./qrReaderService";

const qrFile = new File(["image"], "qr.png", { type: "image/png" });

describe("readQrFromImage", () => {
  it("returns decoded content and revokes its temporary object URL", async () => {
    const revoked: string[] = [];
    const result = await readQrFromImage(qrFile, {
      createObjectUrl: () => "blob:qr-test",
      revokeObjectUrl: (url) => revoked.push(url),
      decodeImage: async (url) => {
        expect(url).toBe("blob:qr-test");
        return { text: "https://example.com", format: "QR_CODE" };
      },
    });

    expect(result).toEqual({ text: "https://example.com", format: "QR_CODE" });
    expect(revoked).toEqual(["blob:qr-test"]);
  });

  it("revokes its temporary object URL when decoding fails", async () => {
    const revoked: string[] = [];
    await expect(
      readQrFromImage(qrFile, {
        createObjectUrl: () => "blob:broken",
        revokeObjectUrl: (url) => revoked.push(url),
        decodeImage: async () => Promise.reject(new Error("No QR code found")),
      })
    ).rejects.toThrow("No QR code found");

    expect(revoked).toEqual(["blob:broken"]);
  });
});

describe("startQrCamera", () => {
  it("stops decoder controls and every media track exactly once", async () => {
    const video = document.createElement("video");
    const stoppedTracks: string[] = [];
    const stream = {
      getTracks: () => [
        { stop: () => stoppedTracks.push("camera") },
        { stop: () => stoppedTracks.push("microphone") },
      ],
    } as unknown as MediaStream;
    Object.defineProperty(video, "srcObject", { value: stream, writable: true });
    let controlStops = 0;

    const session = await startQrCamera(video, vi.fn(), vi.fn(), {
      startCamera: async () => ({ stop: () => { controlStops += 1; } }),
    });
    session.stop();
    session.stop();

    expect(controlStops).toBe(1);
    expect(stoppedTracks).toEqual(["camera", "microphone"]);
    expect(video.srcObject).toBeNull();
  });

  it("forwards decoded text and stops the camera after success", async () => {
    const video = document.createElement("video");
    const decoded: string[] = [];
    let decodeCallback: ((result: { text: string; format: string }) => void) | undefined;
    let stopped = false;

    const session = await startQrCamera(
      video,
      (result) => decoded.push(result.text),
      vi.fn(),
      {
        startCamera: async (_video, onDecoded) => {
          decodeCallback = onDecoded;
          return { stop: () => { stopped = true; } };
        },
      }
    );
    decodeCallback?.({ text: "camera-result", format: "QR_CODE" });

    expect(decoded).toEqual(["camera-result"]);
    expect(stopped).toBe(true);
    session.stop();
  });
});

