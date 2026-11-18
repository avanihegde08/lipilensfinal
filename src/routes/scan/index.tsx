import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, ImageUp } from "lucide-react";
import { toast } from "sonner";

import { useImagePicker } from "@/components/lipi/useImagePicker";
import { capture } from "@/lib/lipi/capture";
import { captureVideoFrame } from "@/lib/lipi/image";

export const Route = createFileRoute("/scan/")({
  head: () => ({
    meta: [
      { title: "Scan a Kannada sign — Lipi Lens" },
      {
        name: "description",
        content: "Point your camera at a Kannada shop sign, bus board or milestone and Lipi Lens reads it for you.",
      },
      { property: "og:title", content: "Scan a Kannada sign — Lipi Lens" },
      {
        property: "og:description",
        content: "Point your camera at a Kannada sign and get the script, the pronunciation and the meaning.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanCamera,
});

function ScanCamera() {
  const navigate = useNavigate();
  const picker = useImagePicker();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setBlocked(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setReady(true);
      } catch {
        if (!cancelled) setBlocked(true);
      }
    };

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const shoot = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error("The camera is still starting. Try once more in a second.");
      return;
    }
    setFlash(true);
    const dataUrl = captureVideoFrame(video);
    capture.setSource(dataUrl);
    // The framing screen checks light and sharpness and shows a tip when needed.
    void navigate({ to: "/scan/crop" });
  }, [navigate]);

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-viewfinder text-viewfinder-foreground">
      {picker.input}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 size-full object-cover"
        aria-label="Camera viewfinder"
      />

      {/* Frame guides */}
      <div aria-hidden className="pointer-events-none absolute inset-x-8 inset-y-28">
        <span className="absolute left-0 top-0 size-9 rounded-tl-2xl border-l-4 border-t-4 border-turmeric animate-bracket-pulse" />
        <span className="absolute right-0 top-0 size-9 rounded-tr-2xl border-r-4 border-t-4 border-turmeric animate-bracket-pulse" />
        <span className="absolute bottom-0 left-0 size-9 rounded-bl-2xl border-b-4 border-l-4 border-turmeric animate-bracket-pulse" />
        <span className="absolute bottom-0 right-0 size-9 rounded-br-2xl border-b-4 border-r-4 border-turmeric animate-bracket-pulse" />
        <span className="absolute inset-x-0 top-1/2 h-16 -translate-y-1/2 scan-beam animate-scan-beam" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 pt-3 safe-top">
        <button
          type="button"
          onClick={() => void navigate({ to: "/" })}
          aria-label="Back to home"
          className="grid size-10 place-items-center rounded-full bg-black/40 text-viewfinder-foreground backdrop-blur active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </button>
        <p className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold backdrop-blur">
          Line up the words
        </p>
        <button
          type="button"
          onClick={picker.open}
          aria-label="Upload a photo from your gallery"
          className="grid size-10 place-items-center rounded-full bg-black/40 text-viewfinder-foreground backdrop-blur active:scale-95"
        >
          <ImageUp className="size-5" />
        </button>
      </header>

      <div className="relative z-10 mt-auto pb-6 safe-bottom">
        {blocked ? (
          <div className="mx-4 rounded-2xl bg-black/55 p-4 text-center backdrop-blur">
            <p className="text-sm font-semibold">The camera could not open</p>
            <p className="mt-1 text-xs text-viewfinder-foreground/80">
              Allow camera access in your browser, or pick a photo you already took.
            </p>
            <button
              type="button"
              onClick={picker.open}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground active:scale-95"
            >
              <ImageUp className="size-4" /> Choose from gallery
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="rounded-full bg-black/40 px-3 py-1 text-[11px] text-viewfinder-foreground/85 backdrop-blur">
              {ready ? "Steady, then tap the circle" : "Starting the camera…"}
            </p>
            <button
              type="button"
              onClick={() => void shoot()}
              disabled={!ready}
              aria-label="Take photo"
              className="grid size-18 place-items-center rounded-full border-4 border-viewfinder-foreground/85 bg-white/15 backdrop-blur transition active:scale-95 disabled:opacity-50"
            >
              <span className="grid size-14 place-items-center rounded-full bg-white text-maroon">
                <Camera className="size-6" />
              </span>
            </button>
          </div>
        )}
      </div>

      {flash && <div aria-hidden className="pointer-events-none absolute inset-0 z-20 bg-white animate-shutter-flash" />}
    </main>
  );
}
