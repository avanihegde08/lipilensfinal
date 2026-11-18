import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Info, Loader2, Square, Trash2, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { LogoMark } from "@/components/lipi/Ornament";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DEFAULT_SETTINGS, updateSettings, useSettings, type TextSize } from "@/lib/lipi/settings";
import { findVoice, useSpeech, useVoicesReady } from "@/lib/lipi/speech";
import { clearScans, scansQuery } from "@/lib/lipi/storage";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Lipi Lens" },
      {
        name: "description",
        content: "Change text size, read-aloud speed and whether Lipi Lens keeps your photos.",
      },
      { property: "og:title", content: "Settings — Lipi Lens" },
      {
        property: "og:description",
        content: "Text size, read-aloud speed and photo saving in Lipi Lens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

/** Tells people which voice will read each language on this device. */
function VoiceStatus() {
  useVoicesReady();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const kn = findVoice("kn");
  const en = findVoice("en");
  return (
    <ul className="grid gap-0.5 text-xs text-muted-foreground">
      <li>
        Kannada:{" "}
        {kn ? `this device's voice (${kn.name})` : "no Kannada voice on this device, so Kannada can't be read aloud"}
      </li>
      <li>English: {en ? `this device's voice (${en.name})` : "no English voice on this device"}</li>
    </ul>
  );
}

const SIZES: { value: TextSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Huge" },
];

function Settings() {
  const settings = useSettings();
  const queryClient = useQueryClient();
  const { data: scans } = useQuery(scansQuery());
  const [confirmClear, setConfirmClear] = useState(false);
  const speech = useSpeech(settings.speechRate);

  const clearAll = async () => {
    await clearScans();
    await queryClient.invalidateQueries({ queryKey: ["scans"] });
    setConfirmClear(false);
    toast.success("All scans deleted from this device");
  };

  return (
    <main className="min-h-dvh">
      <header className="flex items-center gap-3 px-5 pt-4 pb-2 safe-top">
        <LogoMark />
        <h1 className="text-2xl font-extrabold text-maroon">Settings</h1>
      </header>

      <section className="mt-4 px-4">
        <h2 className="px-1 text-sm font-bold text-maroon">Text size</h2>
        <div className="mt-2 rounded-2xl bg-card p-3 shadow-soft">
          <div className="grid grid-cols-4 gap-1.5">
            {SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                onClick={() => updateSettings({ textSize: size.value })}
                aria-pressed={settings.textSize === size.value}
                className={
                  settings.textSize === size.value
                    ? "rounded-xl bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground"
                    : "rounded-xl bg-accent px-2 py-2 text-xs font-semibold text-maroon"
                }
              >
                {size.label}
              </button>
            ))}
          </div>
          <p lang="kn" className="mt-3 rounded-xl bg-layer-kannada p-3 text-center font-kannada text-kn-scaled font-semibold text-maroon">
            ಬಸ್ ನಿಲ್ದಾಣ
          </p>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Bus stand — how the read-out will look
          </p>
        </div>
      </section>

      <section className="mt-5 px-4">
        <h2 className="px-1 text-sm font-bold text-maroon">Reading aloud</h2>
        <div className="mt-2 grid gap-3 rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Show how to say it</p>
              <p className="text-xs text-muted-foreground">
                The Roman-letter spelling under each line
              </p>
            </div>
            <Switch
              checked={settings.showTransliteration}
              onCheckedChange={(checked) => updateSettings({ showTransliteration: checked })}
              aria-label="Show the pronunciation line"
            />
          </div>

          <label className="grid gap-1.5 border-t border-border pt-3">
            <span className="flex items-center justify-between text-sm font-semibold">
              Speed
              <span className="text-xs font-normal text-muted-foreground">
                {settings.speechRate.toFixed(2)}×
              </span>
            </span>
            <Slider
              min={0.7}
              max={1.6}
              step={0.05}
              value={[settings.speechRate]}
              onValueChange={(v) => updateSettings({ speechRate: v[0] ?? 1 })}
            />
            <button
              type="button"
              onClick={() =>
                speech.toggle({ key: "sample", text: "ನಮಸ್ಕಾರ, ಹೇಗ್ ಇದ್ದಿರಿ?", lang: "kn" })
              }
              className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-maroon active:scale-95"
            >
              {speech.loadingKey === "sample" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : speech.activeKey === "sample" ? (
                <Square className="size-3.5" />
              ) : (
                <Volume2 className="size-3.5" />
              )}
              {speech.activeKey === "sample" || speech.loadingKey === "sample" ? "Stop" : "Try the voice"}
            </button>
            <VoiceStatus />
          </label>
        </div>
      </section>

      <section className="mt-5 px-4">
        <h2 className="px-1 text-sm font-bold text-maroon">Photos</h2>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-soft">
          <div>
            <p className="text-sm font-semibold">Keep the photos</p>
            <p className="text-xs text-muted-foreground">
              Off means only the text is stored — the picture is thrown away after reading.
            </p>
          </div>
          <Switch
            checked={settings.saveImages}
            onCheckedChange={(checked) => updateSettings({ saveImages: checked })}
            aria-label="Keep the photos"
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-soft">
          <div>
            <p className="text-sm font-semibold">Street-sign reader</p>
            <p className="text-xs text-muted-foreground">
              Sends the framed photo to the free Lipi Lens reader, which reads street signs much better. It is
              not stored there. Off means photos are read only on this device.
            </p>
          </div>
          <Switch
            checked={settings.onlineReader}
            onCheckedChange={(checked) => updateSettings({ onlineReader: checked })}
            aria-label="Street-sign reader"
          />
        </div>
      </section>

      <section className="mt-5 px-4">
        <h2 className="px-1 text-sm font-bold text-maroon">Your data</h2>
        <div className="mt-2 grid gap-2.5 rounded-2xl bg-card p-4 shadow-soft">
          <p className="text-sm text-muted-foreground">
            {scans?.length ?? 0} {scans?.length === 1 ? "scan" : "scans"} saved on this device. Nothing is
            uploaded to an account.
          </p>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={!scans?.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="size-4" /> Delete every scan
          </button>
          <button
            type="button"
            onClick={() => {
              updateSettings(DEFAULT_SETTINGS);
              toast.success("Settings back to default");
            }}
            className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            Reset these settings
          </button>
        </div>
      </section>

      <section className="mt-5 px-4 pb-4">
        <Link
          to="/about"
          className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-soft"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-maroon">
            <Info className="size-4 text-primary" /> How Lipi Lens works
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </section>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete every scan?</AlertDialogTitle>
            <AlertDialogDescription>
              All {scans?.length ?? 0} scans and their photos are removed from this device. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them</AlertDialogCancel>
            <AlertDialogAction onClick={() => void clearAll()}>Delete all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
