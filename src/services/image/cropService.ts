import type { CropSettings, ImageCropResult } from "../../types/imageCrop";
import { createCropRenderPlan, traceCropPath } from "../../utils/imageCropGeometry";

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to serialize cropped image."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

function croppedFileName(fileName: string, mimeType: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  const extension = mimeType === "image/jpeg" ? ".jpg" : mimeType === "image/webp" ? ".webp" : ".png";
  return `${baseName}-cropped${extension}`;
}

export async function cropImage(file: File, settings: CropSettings): Promise<ImageCropResult> {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width <= 0 || bitmap.height <= 0) {
      throw new Error("Image has no drawable pixels.");
    }

    const plan = createCropRenderPlan(bitmap.width, bitmap.height, settings);
    const canvas = document.createElement("canvas");
    canvas.width = plan.outputWidth;
    canvas.height = plan.outputHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context unavailable.");
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (plan.background) {
      context.fillStyle = plan.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.save();
    context.beginPath();
    traceCropPath(context, settings.shape, (point) => ({
      x: (point.x - plan.shapeBounds.x) * plan.pixelsPerStageUnit,
      y: (point.y - plan.shapeBounds.y) * plan.pixelsPerStageUnit,
    }));
    context.clip();
    context.save();
    context.translate(
      (plan.imageBounds.x + plan.imageBounds.width / 2 - plan.shapeBounds.x) * plan.pixelsPerStageUnit,
      (plan.imageBounds.y + plan.imageBounds.height / 2 - plan.shapeBounds.y) * plan.pixelsPerStageUnit
    );
    context.rotate(((settings.imageTransform.rotationQuarterTurns ?? 0) * Math.PI) / 2);
    context.scale(
      settings.imageTransform.flipHorizontal ? -1 : 1,
      settings.imageTransform.flipVertical ? -1 : 1
    );
    context.drawImage(
      bitmap,
      (-plan.imageDrawSize.width * plan.pixelsPerStageUnit) / 2,
      (-plan.imageDrawSize.height * plan.pixelsPerStageUnit) / 2,
      plan.imageDrawSize.width * plan.pixelsPerStageUnit,
      plan.imageDrawSize.height * plan.pixelsPerStageUnit
    );
    context.restore();
    context.restore();

    const blob = await canvasToBlob(canvas, plan.mimeType, plan.quality);
    return {
      blob,
      fileName: croppedFileName(file.name, plan.mimeType),
      mimeType: plan.mimeType,
      size: blob.size,
      width: plan.outputWidth,
      height: plan.outputHeight,
    };
  } finally {
    bitmap.close();
  }
}
