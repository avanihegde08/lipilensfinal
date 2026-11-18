import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ImageUp, RefreshCw, ScanLine, ShieldCheck, Sun, X } from "lucide-react";
import { toast } from "sonner";

import { ClientOnly } from "@/components/lipi/ClientOnly";
import { useImagePicker } from "@/components/lipi/useImagePicker";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { capture } from "@/lib/lipi/capture";
import { assessQuality, cropRotateCompress, makeThumbnail, type QualityHint } from "@/lib/lipi/image";
import { getSettings } from "@/lib/lipi/settings";
import { newScanId, saveScan } from "@/lib/lipi/storage";
import { readKannadaLocally, type OcrProgress } from "@/lib/lipi/ocr";
import { readKannadaOnline, sceneOcrUrl, SceneOcrError, wakeSceneOcr } from "@/lib/lipi/sceneOcr";
import type { Scan, ScanResult } from "@/lib/lipi/types";

const Cropper = lazy(() => import("react-easy-crop"));

export const Route = createFileRoute("/scan/crop")({
  head: () => ({
    meta: [
      { title: "Frame the sign — Lipi Lens" },
      {
        name: "description",
        content: "Slide and zoom over the Kannada words you want read, then let Lipi Lens read them.",
      },
      { property: "og:title", content: "Frame the sign — Lipi Lens" },
      {
        property: "og:description",
        content: "Slide and zoom over the Kannada words you want read, then get the meaning.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CropScreen,
});

type Area = { x: number; y: number; width: number; height: number };

function CropScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  // Frame matches the photo's own shape, so by default the whole photo is read (wide signs keep their edges).
  const [aspect, setAspect] = useState(4 / 3);
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [quality, setQuality] = useState<QualityHint | null>(null);
  const [ocr, setOcr] = useState<OcrProgress | null>(null);
  const inFlight = useRef(false);
  const [online, setOnline] = useState(false);
  // Street-sign reader is used only when it is set up and the user has not turned it off.
  useEffect(() => {
    const use = getSettings().onlineReader && Boolean(sceneOcrUrl());
    setOnline(use);
    if (use) wakeSceneOcr();
  }, []);
  const picker = useImagePicker(
    useCallback((dataUrl: string) => {
      setSource(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setArea(null);
      setProblem(null);
    }, []),
  );

  useEffect(() => {
    const existing = capture.get().source;
    if (!existing) {
      void navigate({ to: "/scan" });
      return;
    }
    setSource(existing);
  }, [navigate]);

  // Gentle, non-blocking photo check for camera and gallery photos alike. Never rejects a photo.
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    setQuality(null);
    assessQuality(source)
      .then((hint) => !cancelled && setQuality(hint))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [source]);

  const qualityTip = quality?.dark
    ? "This photo looks dark, so the letters may be hard to read."
    : quality?.blurry
      ? "This photo looks a little blurry, so some letters may be misread."
      : quality?.small
        ? "This photo is quite small. Zoom in on the words, or use a closer photo."
        : null;

  const read = useCallback(async () => {
    if (!source || inFlight.current) return;
    inFlight.current = true;
    setReading(true);
    setProblem(null);
    setOcr({ stage: "loading", progress: 0 });
    try {
      const prepared = await cropRotateCompress(source, area, rotation);
      capture.setPrepared(prepared);
      const settings = getSettings();
      // 1) Free street-sign reader (no AI credits). 2) If it is unavailable, read on this device.
      let result: ScanResult | null = null;
      let fallbackReason: string | null = null;
      if (settings.onlineReader && sceneOcrUrl()) {
        setOcr({ stage: "online", progress: 0 });
        try {
          result = await readKannadaOnline(prepared);
          if (result.blocks.length === 0) {
            result = null;
            fallbackReason = "the street-sign reader found no words, so this device tried too.";
          }
        } catch (error) {
          fallbackReason =
            error instanceof SceneOcrError && error.code === "offline"
              ? "you're offline."
              : `${(error as Error).message.replace(/\.$/, "")}.`;
        }
      }
      if (!result) {
        setOcr({ stage: "loading", progress: 0 });
        result = { ...(await readKannadaLocally(prepared, setOcr)), fallback_reason: fallbackReason };
      }
      const thumb = settings.saveImages ? await makeThumbnail(prepared, 360) : null;
      const scan: Scan = {
        id: newScanId(),
        createdAt: Date.now(),
        image: settings.saveImages ? prepared : null,
        thumb,
        result,
        favorite: false,
        note: "",
      };
      await saveScan(scan);
      await queryClient.invalidateQueries({ queryKey: ["scans"] });
      capture.clear();
      void navigate({ to: "/scan/$id", params: { id: scan.id } });
    } catch (error) {
      setProblem((error as Error)?.message || "Something went wrong. Please try again.");
    } finally {
      inFlight.current = false;
      setReading(false);
      setOcr(null);
    }
  }, [area, navigate, queryClient, rotation, source]);

  if (!source) return null;

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      {picker.input}
      <header className="flex items-center justify-between px-4 pt-3 pb-2 safe-top">
        <button
          type="button"
          onClick={() => void navigate({ to: "/scan" })}
          aria-label="Back to the camera"
          className="grid size-10 place-items-center rounded-full bg-accent text-maroon active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-maroon">Frame the words</h1>
          <p className="text-[11px] text-muted-foreground">Drag to move, pinch or slide to zoom</p>
        </div>
        <Link
          to="/"
          aria-label="Cancel and go home"
          className="grid size-10 place-items-center rounded-full bg-accent text-maroon active:scale-95"
        >
          <X className="size-5" />
        </Link>
      </header>

      <div className="relative mx-4 h-[56vh] min-h-[280px] overflow-hidden rounded-3xl bg-viewfinder shadow-lift">
        <ClientOnly>
          <Suspense
            fallback={
              <div className="grid h-full place-items-center text-xs text-viewfinder-foreground/80">
                Getting your photo ready…
              </div>
            }
          >
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={(_area, pixels) => setArea(pixels)}
              onMediaLoaded={(media) => {
                if (media.naturalWidth && media.naturalHeight) setAspect(media.naturalWidth / media.naturalHeight);
              }}
              aspect={aspect}
              showGrid
              restrictPosition
              objectFit="contain"
            />
          </Suspense>
        </ClientOnly>
      </div>

      <div className="mt-4 grid gap-3 px-5">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Zoom {zoom.toFixed(1)}×</span>
          <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0] ?? 1)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">
            Straighten {Math.round(rotation)}°
          </span>
          <Slider
            min={-45}
            max={45}
            step={1}
            value={[rotation]}
            onValueChange={(v) => setRotation(v[0] ?? 0)}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setRotation(0);
            setZoom(1);
            setCrop({ x: 0, y: 0 });
          }}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          <RefreshCw className="size-3.5" /> Reset the frame
        </button>
      </div>

      {qualityTip && (
        <div role="status" className="mx-5 mt-4 flex items-start gap-2.5 rounded-2xl bg-accent p-3.5">
          <Sun className="mt-0.5 size-4 shrink-0 text-marigold" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-maroon">{qualityTip}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              You can still read it, but a clearer, well-lit photo gives a better result.
            </p>
            <button
              type="button"
              onClick={picker.open}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              <ImageUp className="size-3.5" /> Choose a clearer photo
            </button>
          </div>
        </div>
      )}

      {problem && (
        <div className="mx-5 mt-4 rounded-2xl bg-destructive/10 p-3.5">
          <p className="text-sm font-semibold text-destructive">That did not work</p>
          <p className="mt-1 text-sm text-muted-foreground">{problem}</p>
        </div>
      )}

      <div className="mt-auto px-5 pt-5 pb-6 safe-bottom">
        <p className="mb-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0 text-primary" />
          {online
            ? "Your framed photo goes to the free Lipi Lens reader and is not stored. Avoid personal details."
            : "Read on this device: your photo is not uploaded. Avoid photos with personal details."}
        </p>
        <Button variant="hero" size="xl" className="w-full" onClick={() => void read()} disabled={reading}>
          <ScanLine className="size-5" />
          {reading ? "Reading the sign…" : "Read it"}
        </Button>
      </div>

      {reading && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 grid place-items-center bg-viewfinder/85 backdrop-blur-sm"
        >
          <div className="w-56 rounded-3xl bg-card p-5 text-center shadow-lift">
            <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-2xl bg-scan">
              <span className="absolute inset-x-0 top-0 h-10 scan-beam animate-scan-beam" />
              <span lang="kn" className="absolute inset-0 grid place-items-center font-kannada text-3xl text-white/90">
                ಅ
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-maroon">
              {ocr?.stage === "online"
                ? "Reading the sign…"
                : ocr?.stage === "reading"
                  ? "Reading the letters…"
                  : "Getting the Kannada reader ready…"}
              {ocr && ocr.stage !== "online" && ocr.progress > 0 ? ` ${ocr.progress}%` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ocr?.stage === "online"
                ? "Usually 10–20 seconds. If the reader is asleep, this phone reads it instead."
                : ocr?.stage === "reading"
                ? "On this device — this takes a few seconds"
                : "The first time, about 5 MB of language data downloads. After that it is quick."}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
