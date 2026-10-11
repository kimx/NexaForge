import type { ImageResizeOptions } from "../../types/tool";

export interface ImageDeliverySettings {
  resize: ImageResizeOptions;
  watermark: { text: string; position: "top-left" | "center" | "bottom-right"; opacity: number; size: number; color: string };
}
export interface ImageDeliveryTemplate extends ImageDeliverySettings { name: string }
export const IMAGE_DELIVERY_TEMPLATES_KEY = "nexaforge-image-delivery-templates-v1";
export const IMAGE_DELIVERY_TEMPLATE_LIMIT = 30;
type TemplateStorage = Pick<Storage, "getItem" | "setItem">;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function within(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

/** Copy only allowed settings: never persist files, filenames or processing results. */
export function sanitizeImageDeliveryTemplate(value: unknown): ImageDeliveryTemplate | null {
  const input = record(value); const resize = record(input.resize); const watermark = record(input.watermark);
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 80) return null;
  if (!within(resize.width, 1, 4096) || !Number.isInteger(resize.width)
    || !within(resize.height, 1, 4096) || !Number.isInteger(resize.height)
    || typeof resize.keepAspectRatio !== "boolean" || !within(resize.quality, .1, 1)
    || !["jpeg", "png", "webp"].includes(resize.format as string)) return null;
  if (typeof watermark.text !== "string" || !watermark.text.trim() || watermark.text.length > 200
    || !["top-left", "center", "bottom-right"].includes(watermark.position as string)
    || !within(watermark.opacity, 5, 100) || !within(watermark.size, 1, 50)
    || typeof watermark.color !== "string" || !/^#[0-9a-f]{6}$/i.test(watermark.color)) return null;
  return {
    name: input.name.trim(),
    resize: { width: resize.width, height: resize.height, keepAspectRatio: resize.keepAspectRatio, quality: resize.quality, format: resize.format as ImageResizeOptions["format"] },
    watermark: { text: watermark.text, position: watermark.position as ImageDeliverySettings["watermark"]["position"], opacity: watermark.opacity, size: watermark.size, color: watermark.color },
  };
}

export function readImageDeliveryTemplates(storage?: TemplateStorage): { templates: ImageDeliveryTemplate[]; error: boolean } {
  if (!storage && typeof window === "undefined") return { templates: [], error: false };
  try {
    const raw = (storage ?? window.localStorage).getItem(IMAGE_DELIVERY_TEMPLATES_KEY);
    if (!raw) return { templates: [], error: false };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { templates: [], error: true };
    const names = new Set<string>();
    const templates = parsed.map(sanitizeImageDeliveryTemplate).filter((item): item is ImageDeliveryTemplate => {
      if (!item || names.has(item.name)) return false;
      names.add(item.name); return true;
    }).slice(0, IMAGE_DELIVERY_TEMPLATE_LIMIT);
    return { templates, error: templates.length !== parsed.length };
  } catch { return { templates: [], error: true }; }
}

export function writeImageDeliveryTemplates(values: ImageDeliveryTemplate[], storage?: TemplateStorage): boolean {
  try {
    const templates = values.map(sanitizeImageDeliveryTemplate);
    if (templates.length > IMAGE_DELIVERY_TEMPLATE_LIMIT || templates.some(item => item === null)
      || new Set(templates.map(item => item!.name)).size !== templates.length) return false;
    (storage ?? window.localStorage).setItem(IMAGE_DELIVERY_TEMPLATES_KEY, JSON.stringify(templates));
    return true;
  } catch { return false; }
}
