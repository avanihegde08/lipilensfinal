// Client-side image helpers: EXIF-aware decoding, crop/rotate, compression and quick quality hints.

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export type PixelArea = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This image could not be opened."));
    img.src = src;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return canvas.toDataURL("image/jpeg", quality);
}

function fit(w: number, h: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/** Decodes a picked file (respecting EXIF orientation) into a JPEG data URL, max 2400px edge. */
export async function fileToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("This photo is larger than 8 MB. Please pick a smaller one.");
  if (file.type && !file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  let source: CanvasImageSource & { width: number; height: number };
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      source = await loadImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const { w, h } = fit(source.width, source.height, 2400);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(source, 0, 0, w, h);
  return canvasToJpeg(canvas, 0.92);
}

/** Grabs the current video frame as a JPEG data URL. */
export function captureVideoFrame(video: HTMLVideoElement): string {
  const { w, h } = fit(video.videoWidth, video.videoHeight, 2400);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
  return canvasToJpeg(canvas, 0.92);
}

/**
 * Applies rotation and crop (area in rotated-image pixels, as react-easy-crop reports),
 * then resizes to a 1600px long edge and compresses to JPEG.
 */
export async function cropRotateCompress(src: string, area: PixelArea | null, rotation: number): Promise<string> {
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rw = Math.round(img.width * cos + img.height * sin);
  const rh = Math.round(img.width * sin + img.height * cos);

  const rotated = document.createElement("canvas");
  rotated.width = rw;
  rotated.height = rh;
  const rctx = rotated.getContext("2d")!;
  rctx.translate(rw / 2, rh / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -img.width / 2, -img.height / 2);

  const crop = area ?? { x: 0, y: 0, width: rw, height: rh };
  const { w, h } = fit(crop.width, crop.height, 1600);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.drawImage(rotated, crop.x, crop.y, crop.width, crop.height, 0, 0, w, h);
  return canvasToJpeg(out, 0.85);
}

/** Long edge the OCR input is enlarged to; measured to cut Kannada errors on small crops. */
export const OCR_TARGET_EDGE = 1800;

/** Scale factor for OCR: enlarge small images up to 3x so letters are big enough; never shrink. */
export function ocrScale(width: number, height: number) {
  const scale = Math.min(3, Math.max(1, OCR_TARGET_EDGE / Math.max(width, height)));
  return scale > 1.05 ? scale : 1;
}

/** Returns a smoothly enlarged canvas copy for OCR (the saved photo stays unchanged). */
export async function upscaleForOcr(src: string): Promise<string | HTMLCanvasElement> {
  const img = await loadImage(src);
  const scale = ocrScale(img.width, img.height);
  if (scale === 1) return src;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function makeThumbnail(src: string, maxEdge = 360): Promise<string> {
  const img = await loadImage(src);
  const { w, h } = fit(img.width, img.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return canvasToJpeg(canvas, 0.75);
}

export type QualityHint = { dark: boolean; blurry: boolean; small: boolean };

/** Rough brightness and sharpness check on a downscaled grayscale copy. Heuristic only. */
export async function assessQuality(src: string): Promise<QualityHint> {
  const img = await loadImage(src);
  const { w, h } = fit(img.width, img.height, 320);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * (data[i * 4] ?? 0) + 0.587 * (data[i * 4 + 1] ?? 0) + 0.114 * (data[i * 4 + 2] ?? 0);
    gray[i] = g;
    sum += g;
  }
  const mean = sum / (w * h);
  // Variance of the Laplacian: low values suggest a blurry photo.
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        (gray[i - w] ?? 0) + (gray[i + w] ?? 0) + (gray[i - 1] ?? 0) + (gray[i + 1] ?? 0) - 4 * (gray[i] ?? 0);
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  }
  const variance = n ? lapSq / n - (lapSum / n) ** 2 : 0;
  return { dark: mean < 55, blurry: variance < 40, small: Math.max(img.width, img.height) < 400 };
}
