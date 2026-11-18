import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bus,
  Camera,
  ChevronRight,
  Clapperboard,
  ImageUp,
  Info,
  Milestone,
  ShieldCheck,
  Store,
  Sun,
  Hand,
  Maximize,
} from "lucide-react";

import { LogoMark, Ornament } from "@/components/lipi/Ornament";
import { ScanThumb, scanPreview } from "@/components/lipi/ScanListItem";
import { useImagePicker } from "@/components/lipi/useImagePicker";
import { Button } from "@/components/ui/button";
import illustration from "@/assets/kannada-illustration.webp.asset.json";
import { scansQuery } from "@/lib/lipi/storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lipi Lens — Read Kannada signs instantly" },
      {
        name: "description",
        content: "Snap or upload a photo of a Kannada sign to get the text, English transliteration, translation and read-aloud.",
      },
      { property: "og:title", content: "Lipi Lens — Read Kannada signs instantly" },
      {
        property: "og:description",
        content: "Snap or upload a photo of a Kannada sign to get the text, English transliteration, translation and read-aloud.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const KINDS = [
  { icon: Store, label: "Shop signs", kn: "ಅಂಗಡಿ" },
  { icon: Bus, label: "Bus boards", kn: "ಬಸ್" },
  { icon: Milestone, label: "Milestones", kn: "ಮೈಲಿಗಲ್ಲು" },
  { icon: Clapperboard, label: "Billboards", kn: "ಫಲಕ" },
  { icon: Info, label: "Posters", kn: "ಭಿತ್ತಿಪತ್ರ" },
];

const TIPS = [
  { icon: Hand, title: "Hold steady", body: "Rest your elbows and tap the shutter gently." },
  { icon: Sun, title: "Good light", body: "Avoid glare and deep shadows on the sign." },
  { icon: Maximize, title: "Fill the frame", body: "Get close so the letters look big and sharp." },
];

function Home() {
  const picker = useImagePicker();
  const navigate = useNavigate();
  const { data: scans } = useQuery(scansQuery());
  const recent = scans?.slice(0, 5) ?? [];

  return (
    <main>
      {picker.input}
      <header className="flex items-center justify-between px-5 pb-3 safe-top">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <p lang="kn" className="font-kannada text-sm font-semibold text-primary">ನಮಸ್ಕಾರ</p>
            <h1 className="text-2xl font-extrabold leading-none text-maroon">Lipi Lens</h1>
          </div>
        </div>
        <Link to="/about" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">
          How it works
        </Link>
      </header>

      <section className="px-5">
        <div className="overflow-hidden rounded-3xl bg-card shadow-lift">
          <Ornament />
          <div className="bg-card p-3 pb-0">
            <img
              src={illustration.url}
              alt="Hand-drawn illustration: bold Kannada lettering in yellow and red, two elderly women, trees and a city skyline"
              width={1010}
              height={708}
              fetchPriority="high"
              decoding="async"
              className="h-auto w-full rounded-2xl object-contain"
            />
            <p
              lang="kn"
              className="px-2 py-4 text-center font-display text-xl font-semibold leading-relaxed text-maroon sm:text-2xl"
            >
              <span className="inline-block">ಹಸಿರೇ ಉಸಿರು..</span>{" "}
              <span className="inline-block">ತಂತ್ರಜ್ಞಾನವೇ ಉಸಿರು..</span>
            </p>
          </div>
          <div className="bg-hero p-5">
            <h2 className="text-2xl font-extrabold leading-tight text-maroon">Read Kannada. Instantly.</h2>
            <p className="mt-1 text-sm text-maroon/85">
              Photograph any sign to see the Kannada text, how to say it, and what it means.
            </p>
            <div className="mt-4 grid gap-2.5">
              <Button variant="hero" size="xl" onClick={() => void navigate({ to: "/scan" })}>
                <Camera /> Take photo
              </Button>
              <Button variant="onScan" size="xl" onClick={picker.open}>
                <ImageUp /> Upload from gallery
              </Button>
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-card/70 p-2.5 text-xs leading-snug text-maroon/90">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Don't upload photos with personal details like ID cards, bank papers or addresses. Photos
                are read on this device and scans stay here; you can delete them in History.
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="px-5 text-lg font-bold text-maroon">What can I scan?</h2>
        <div className="mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {KINDS.map(({ icon: Icon, label, kn }) => (
            <div key={label} className="flex shrink-0 items-center gap-2.5 rounded-2xl bg-card px-3.5 py-2.5 shadow-soft">
              <span className="grid size-9 place-items-center rounded-xl bg-secondary text-maroon">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span lang="kn" className="block font-kannada text-xs text-muted-foreground">{kn}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7 px-5">
        <h2 className="text-lg font-bold text-maroon">Quick tips</h2>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {TIPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-accent p-3">
              <Icon className="size-5 text-primary" />
              <p className="mt-2 text-sm font-semibold leading-tight">{title}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-lg font-bold text-maroon">Recent scans</h2>
          {recent.length > 0 && (
            <Link to="/history" className="flex items-center text-sm font-semibold text-primary">
              See all <ChevronRight className="size-4" />
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="mx-5 mt-3 rounded-2xl border border-dashed border-input p-4 text-sm text-muted-foreground">
            Your scans will appear here. They are saved on this device only.
          </p>
        ) : (
          <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
            {recent.map((scan) => {
              const { kannada, english } = scanPreview(scan);
              return (
                <Link
                  key={scan.id}
                  to="/scan/$id"
                  params={{ id: scan.id }}
                  className="w-40 shrink-0 rounded-2xl bg-card p-2 shadow-soft"
                >
                  <ScanThumb scan={scan} className="aspect-[4/3] w-full" />
                  <p lang="kn" className="mt-1.5 truncate font-kannada text-sm font-semibold">{kannada}</p>
                  <p className="truncate text-xs text-muted-foreground">{english}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
