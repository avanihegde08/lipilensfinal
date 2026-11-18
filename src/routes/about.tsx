import { Link, createFileRoute } from "@tanstack/react-router";
import { Camera, ImageUp, ShieldCheck, Sparkles, Volume2 } from "lucide-react";

import { LogoMark, Ornament } from "@/components/lipi/Ornament";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How Lipi Lens works — read Kannada signs" },
      {
        name: "description",
        content:
          "Lipi Lens reads Kannada script on shop signs, bus boards and milestones, then shows the text, how to say it and what it means.",
      },
      { property: "og:title", content: "How Lipi Lens works" },
      {
        property: "og:description",
        content:
          "Photograph a Kannada sign and get the script, a plain-English way to say it, the meaning and a read-aloud.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

const STEPS = [
  {
    n: "1",
    title: "Point and shoot",
    body: "Open the camera from the big Scan button, or pick a photo you already took. Slide the box over the words you want read.",
  },
  {
    n: "2",
    title: "Lipi reads the letters",
    body: "The app looks at the photo and writes out the Kannada exactly as printed — including spelling mistakes, because real signs keep their own spelling.",
  },
  {
    n: "3",
    title: "Say it and mean it",
    body: "Under the script you get a plain-English way to say it and a speaker button to hear it. Tap Translate for the English meaning (this one uses AI credits and internet).",
  },
];

const GOOD_AT = [
  "Shop boards and hand-painted name plates",
  "Bus destination boards and route numbers",
  "Milestones with place names and distances",
  "Posters, notice boards and shop menus",
];

const NOT_SO_GOOD = [
  "Tiny print, or letters far away and blurry",
  "Strong glare, deep shadow or a tilted photo",
  "Cursive handwriting and decorative lettering",
  "Text in a language other than Kannada or English",
];

function About() {
  return (
    <main>
      <header className="flex items-center justify-between px-5 pb-3 safe-top">
        <div className="flex items-center gap-3">
          <LogoMark />
          <h1 className="text-2xl font-extrabold leading-none text-maroon">How it works</h1>
        </div>
        <Link to="/" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">
          Close
        </Link>
      </header>

      <section className="px-5">
        <div className="overflow-hidden rounded-3xl bg-card shadow-lift">
          <Ornament />
          <div className="bg-hero p-5">
            <p lang="kn" className="font-kannada text-lg font-semibold text-maroon">
              ಓದು, ಅರ್ಥ ಮಾಡಿಕೊಳ್ಳಿ
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-maroon">Read it. Say it. Know it.</h2>
            <p className="mt-1 text-sm text-maroon/85">
              Lipi Lens turns a photo of a Kannada sign into three things: the script itself, a way to
              pronounce it, and what it actually means.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-7 px-5">
        <h2 className="text-lg font-bold text-maroon">Three steps</h2>
        <ol className="mt-3 grid gap-2.5">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-3 rounded-2xl bg-card p-3.5 shadow-soft">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary font-display text-base font-bold text-maroon">
                {s.n}
              </span>
              <span>
                <span className="block text-sm font-semibold">{s.title}</span>
                <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-7 grid gap-3 px-5">
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <h2 className="flex items-center gap-2 text-base font-bold text-maroon">
            <Sparkles className="size-4 text-primary" /> Best results
          </h2>
          <ul className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
            {GOOD_AT.map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-accent p-4">
          <h2 className="text-base font-bold text-maroon">Where it struggles</h2>
          <ul className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
            {NOT_SO_GOOD.map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            When letters are hard to see, Lipi marks them as unclear. You can correct any line with Edit text.
          </p>
        </div>
      </section>

      <section className="mt-7 grid gap-2.5 px-5">
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <h2 className="flex items-center gap-2 text-base font-bold text-maroon">
            <Volume2 className="size-4 text-primary" /> Hear the words
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the speaker on any line to hear it, using your phone's own voices for free. If your
            phone has no Kannada voice (iPhones don't have one), Lipi tells you, and you can still
            hear the pronunciation line read in English.
          </p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <h2 className="flex items-center gap-2 text-base font-bold text-maroon">
            <ShieldCheck className="size-4 text-primary" /> Your photos and privacy
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Photos are read on this device and are not uploaded. Only text you choose to translate is
            sent online. Your scans are saved on this device only, with no account, and you can delete
            them anytime in History or Settings.
            Turn photo saving off in Settings and only the text is kept. Please avoid photos with
            personal details.
          </p>
        </div>
      </section>

      <section className="mt-7 px-5 pb-4">
        <div className="grid gap-2.5">
          <Link
            to="/scan"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-base font-semibold text-primary-foreground shadow-fab active:scale-[0.99]"
          >
            <Camera className="size-5" /> Try it now
          </Link>
          <Link
            to="/settings"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-input bg-card px-4 py-3 text-sm font-semibold text-foreground"
          >
            <ImageUp className="size-4" /> Settings
          </Link>
        </div>
      </section>
    </main>
  );
}
