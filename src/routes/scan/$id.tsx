import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Languages,
  Lightbulb,
  Loader2,
  MapPin,
  Pencil,
  Route as RouteIcon,
  Ruler,
  Star,
  Trash2,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/lipi/EmptyState";
import { Button } from "@/components/ui/button";
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
import { useSpeech, type SpeechItem } from "@/lib/lipi/speech";
import { useSettings } from "@/lib/lipi/settings";
import { deleteScans, scanQuery, updateScan } from "@/lib/lipi/storage";
import { CATEGORY_LABELS, type BlockLanguage, type TextBlock } from "@/lib/lipi/types";
import { transliterateKannada } from "@/lib/lipi/transliterate";
import { normalizeKannadaText } from "@/lib/lipi/text";
import { retranslate } from "@/lib/lipi.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scan/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your scan — Lipi Lens" },
      {
        name: "description",
        content: "The Kannada text from your photo, how to say it, what it means, and a read-aloud.",
      },
      { property: "og:title", content: "Your scan — Lipi Lens" },
      {
        property: "og:description",
        content: "The Kannada text from your photo, how to say it and what it means.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(scanQuery(params.id));
  },
  component: ScanDetail,
});

const LANG_ATTR: Record<BlockLanguage, string> = {
  kn: "kn",
  en: "en",
  hi: "hi",
  ta: "ta",
  te: "te",
  ml: "ml",
  other: "und",
};

/** The text shown and read aloud: the user's own correction wins over the AI's suggestion. */
function shownText(block: { as_written: string; suggested_kannada: string | null; user_edited?: boolean }) {
  return block.user_edited ? block.as_written : (block.suggested_kannada ?? block.as_written);
}

const LEGIBILITY_NOTE: Record<string, string> = {
  partly_unclear: "Some letters were hard to see.",
  unclear: "The letters were hard to see — please double-check.",
};

function ScanDetail() {
  const params = Route.useParams();
  const { data: scan } = useSuspenseQuery(scanQuery(params.id));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const settings = useSettings();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const speech = useSpeech(settings.speechRate);

  const items = useMemo<SpeechItem[]>(() => {
    if (!scan) return [];
    return scan.result.blocks.flatMap((block, i) => {
      const spoken: SpeechItem[] = [
        { key: `kn-${i}`, text: shownText(block), lang: "kn" },
      ];
      if (settings.showTransliteration && block.transliteration.trim()) {
        spoken.push({ key: `tl-${i}`, text: block.transliteration, lang: "en" });
      }
      return spoken;
    });
  }, [scan, settings.showTransliteration]);

  if (!scan) {
    return (
      <main className="min-h-dvh">
        <EmptyState
          title="This scan is gone"
          body="It was deleted, or it was saved on another device. Take a new photo and it will be here."
          action={
            <Link
              to="/scan"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-fab"
            >
              Take a photo
            </Link>
          }
        />
      </main>
    );
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["scans"] });
  };

  const toggleFavorite = async () => {
    await updateScan(scan.id, { favorite: !scan.favorite });
    await refresh();
    toast.success(scan.favorite ? "Removed from Saved" : "Saved to your list");
  };

  const remove = async () => {
    await deleteScans([scan.id]);
    await refresh();
    void navigate({ to: "/history" });
  };

  const startEdit = (index: number) => {
    const block = scan.result.blocks[index];
    setDraft(block ? shownText(block) : "");
    setEditing(index);
  };

  const [translating, setTranslating] = useState<number | null>(null);

  /** Asks the AI for an English meaning. Only ever runs on an explicit tap (uses AI credits). */
  const translateText = async (text: string) => {
    let response: Awaited<ReturnType<typeof retranslate>>;
    try {
      response = await retranslate({ data: { text } });
    } catch {
      toast.error("Couldn't reach the translation service. Check your internet connection and try again.");
      return null;
    }
    if (!response.ok) {
      toast.error(
        response.code === "credits"
          ? "AI credits have run out, so translation is paused. The Kannada text, pronunciation and read-aloud still work."
          : response.message,
      );
      return null;
    }
    return response.result;
  };

  const saveBlock = async (index: number, patch: (block: TextBlock) => TextBlock) => {
    const blocks = scan.result.blocks.map((block, i) => (i === index ? patch(block) : block));
    await updateScan(scan.id, { result: { ...scan.result, blocks } });
    await refresh();
  };

  const translateBlock = async (index: number) => {
    const block = scan.result.blocks[index];
    if (!block || translating !== null) return;
    setTranslating(index);
    try {
      const result = await translateText(shownText(block));
      if (!result) return;
      await saveBlock(index, (b) => ({
        ...b,
        translation: result.translation,
        suggested_kannada: b.user_edited ? b.suggested_kannada : result.suggested_kannada,
        corrections: result.corrections,
      }));
    } finally {
      setTranslating(null);
    }
  };

  /** Saves the corrected text. Free on its own; with `translate` it also asks the AI (uses credits). */
  const applyEdit = async (index: number, translate: boolean) => {
    const block = scan.result.blocks[index];
    if (!block || savingEdit) return;
    const text = normalizeKannadaText(draft);
    if (!text) {
      toast.error("Type the Kannada text first.");
      return;
    }
    const unchanged = text === shownText(block);
    if (unchanged && !translate) {
      setEditing(null);
      return;
    }
    setSavingEdit(true);
    try {
      const language = /[\u0C80-\u0CFF]/.test(text) ? ("kn" as const) : block.language;
      const ai = translate ? await translateText(text) : null;
      if (translate && !ai) return;
      await saveBlock(index, (b) => ({
        ...b,
        // Keep the very first OCR reading so it can be compared later.
        original_text: b.original_text ?? b.as_written,
        as_written: text,
        language,
        user_edited: true,
        suggested_kannada: ai ? ai.suggested_kannada : null,
        corrections: ai ? ai.corrections : [],
        transliteration: ai?.transliteration || (language === "kn" ? transliterateKannada(text) : text),
        // The old meaning described the old text, so it is cleared unless re-translated.
        translation: ai ? ai.translation : language === "en" ? text : unchanged ? b.translation : "",
      }));
      setEditing(null);
      toast.success(ai ? "Corrected text translated" : "Corrected text saved");
    } finally {
      setSavingEdit(false);
    }
  };

  const saveNote = async (value: string) => {
    if (value === scan.note) return;
    await updateScan(scan.id, { note: value });
    await refresh();
  };

  const { structured, context_note, image_issue, kannada_text_found } = scan.result;
  const hasStructured =
    structured.places.length > 0 || structured.distances.length > 0 || structured.route_numbers.length > 0;

  return (
    <main className="min-h-dvh pb-28">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-card/95 px-3 pt-3 pb-2 backdrop-blur safe-top">
        <Link
          to="/history"
          aria-label="Back to history"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-maroon active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-maroon">{CATEGORY_LABELS[scan.result.category]}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarClock className="size-3" />
            {new Date(scan.createdAt).toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void toggleFavorite()}
          aria-pressed={scan.favorite}
          aria-label={scan.favorite ? "Remove from Saved" : "Save this scan"}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full active:scale-95",
            scan.favorite ? "bg-secondary text-maroon" : "bg-accent text-muted-foreground",
          )}
        >
          <Star className={cn("size-5", scan.favorite && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label="Delete this scan"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-muted-foreground active:scale-95"
        >
          <Trash2 className="size-5" />
        </button>
      </header>

      {scan.image && (
        <div className="px-4 pt-4">
          <div className="grid h-64 place-items-center overflow-hidden rounded-3xl bg-card p-2 shadow-soft">
            <img
              src={scan.image}
              alt="The sign you photographed"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      )}

      <p className="mx-4 mt-3 text-[11px] text-muted-foreground">
        {scan.result.engine === "scene"
          ? "Read by the Lipi Lens street-sign reader."
          : scan.result.fallback_reason
            ? `Read on this device: ${scan.result.fallback_reason} If letters look wrong, try again later or crop closer.`
            : scan.result.engine === "device"
              ? "Read on this device."
              : null}
      </p>

      {!kannada_text_found && (
        <div className="mx-4 mt-4 rounded-2xl bg-accent p-4">
          <p className="text-sm font-semibold text-maroon">No Kannada found in this photo</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The lines below are what the letters looked like. Try a closer, sharper photo of the sign.
          </p>
        </div>
      )}

      {image_issue !== "none" && (
        <div className="mx-4 mt-3 rounded-2xl border border-input bg-card p-3.5">
          <p className="text-xs font-semibold text-maroon">
            {image_issue === "blurry"
              ? "The photo was blurry"
              : image_issue === "low_light"
                ? "There was not enough light"
                : image_issue === "too_small"
                  ? "The letters were too small"
                  : image_issue === "no_text"
                    ? "No letters could be seen"
                    : "The letters could not be read"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hold your phone steady, get closer, and shoot again for a better read.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between px-5">
        <h2 className="text-lg font-bold text-maroon">What it says</h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => (speech.sequence ? speech.stop() : speech.readAll(items))}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-fab active:scale-95"
          >
            {speech.sequence && !speech.activeKey ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Volume2 className="size-4" />
            )}
            {speech.sequence ? "Stop" : "Hear it all"}
          </button>
        )}
      </div>
      {scan.result.blocks.length > 0 && (
        <p className="mt-1 px-5 text-xs text-muted-foreground">
          Read on this device for free. The reader can misread letters on signs, so check the text and tap{" "}
          <span className="font-semibold">Edit text</span> to correct it. English meanings are optional and use AI
          credits.
        </p>
      )}

      <div className="mt-2 grid gap-3 px-4">
        {scan.result.blocks.map((block, i) => {
          const spoken = shownText(block);
          return (
            <article key={i} className="rounded-2xl bg-card p-4 shadow-soft animate-rise">
              <div className="flex items-start justify-between gap-3">
                <p
                  lang={LANG_ATTR[block.language]}
                  className="font-kannada text-kn-scaled font-semibold text-maroon"
                >
                  {spoken}
                </p>
                <button
                  type="button"
                  onClick={() => speech.toggle({ key: `kn-${i}`, text: spoken, lang: "kn" })}
                  aria-label={
                    speech.activeKey === `kn-${i}` || speech.loadingKey === `kn-${i}` ? "Stop reading" : "Hear this line"
                  }
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full active:scale-95",
                    speech.activeKey === `kn-${i}`
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-maroon",
                  )}
                >
                  {speech.loadingKey === `kn-${i}` ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Volume2 className="size-4" />
                  )}
                </button>
              </div>

              {settings.showTransliteration && block.transliteration.trim() && (
                <div className="mt-1.5 flex items-start justify-between gap-3">
                  <p className="text-en-scaled font-medium text-translit">{block.transliteration}</p>
                  <button
                    type="button"
                    onClick={() => speech.toggle({ key: `tl-${i}`, text: block.transliteration, lang: "en" })}
                    aria-label={
                      speech.activeKey === `tl-${i}` || speech.loadingKey === `tl-${i}`
                        ? "Stop reading"
                        : "Hear how to say it"
                    }
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full active:scale-95",
                      speech.activeKey === `tl-${i}`
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-maroon",
                    )}
                  >
                    {speech.loadingKey === `tl-${i}` ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="size-3.5" />
                    )}
                  </button>
                </div>
              )}

              {block.translation.trim() ? (
                <p className="mt-2 text-sm text-muted-foreground">{block.translation}</p>
              ) : (
                block.language !== "en" && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void translateBlock(i)}
                      disabled={translating !== null}
                    >
                      {translating === i ? <Loader2 className="animate-spin" /> : <Languages />}
                      {translating === i ? "Translating…" : "Translate to English"}
                    </Button>
                    <span className="text-[11px] text-muted-foreground">Uses AI credits · needs internet</span>
                  </div>
                )
              )}

              {block.corrections.length > 0 && (
                <div className="mt-3 rounded-xl bg-layer-kannada p-2.5">
                  <p className="text-xs font-semibold text-maroon">We think the sign means</p>
                  <ul className="mt-1 grid gap-1">
                    {block.corrections.map((c, j) => (
                      <li key={j} className="text-xs text-muted-foreground">
                        <span className="font-kannada line-through opacity-70">{c.from}</span>
                        {" → "}
                        <span className="font-kannada font-semibold text-maroon">{c.to}</span>
                        <span className="block text-[11px]">{c.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {block.uncertain_parts && (
                <p className="mt-2 text-xs italic text-muted-foreground">
                  Hard to make out: {block.uncertain_parts}
                </p>
              )}

              {block.legibility !== "clear" && (
                <p className="mt-2 text-xs text-marigold">{LEGIBILITY_NOTE[block.legibility]}</p>
              )}

              {block.user_edited && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  <p className="font-semibold">You corrected this text</p>
                  {block.original_text && block.original_text !== block.as_written && (
                    <p>
                      First read as:{" "}
                      <span lang="kn" className="font-kannada text-xs">
                        {block.original_text}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {editing === i ? (
                <div className="mt-3 grid gap-2">
                  <label htmlFor={`edit-${i}`} className="text-xs font-semibold text-maroon">
                    Correct any wrong or missing letters
                  </label>
                  <textarea
                    id={`edit-${i}`}
                    lang="kn"
                    dir="auto"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    autoFocus
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-input bg-background p-2.5 font-kannada text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void applyEdit(i, false)} disabled={savingEdit || !draft.trim()}>
                      {savingEdit ? <Loader2 className="animate-spin" /> : <Check />} Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void applyEdit(i, true)}
                      disabled={savingEdit || !draft.trim()}
                      title="Uses AI credits"
                    >
                      <Languages /> Confirm &amp; translate
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={savingEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(i)}
                  aria-label={`Edit the text of line ${i + 1}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  <Pencil className="size-3.5" /> Edit text
                </button>
              )}
            </article>
          );
        })}
      </div>

      {hasStructured && (
        <section className="mt-5 px-4">
          <h2 className="px-1 text-sm font-bold text-maroon">On the sign</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {structured.places.map((p) => (
              <span
                key={`p-${p}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-soft"
              >
                <MapPin className="size-3.5 text-primary" /> {p}
              </span>
            ))}
            {structured.distances.map((d) => (
              <span
                key={`d-${d}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-soft"
              >
                <Ruler className="size-3.5 text-primary" /> {d}
              </span>
            ))}
            {structured.route_numbers.map((r) => (
              <span
                key={`r-${r}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-soft"
              >
                <RouteIcon className="size-3.5 text-primary" /> {r}
              </span>
            ))}
          </div>
        </section>
      )}

      {context_note && (
        <section className="mx-4 mt-5 rounded-2xl bg-accent p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-maroon">
            <Lightbulb className="size-4 text-primary" /> Good to know
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{context_note}</p>
        </section>
      )}

      <section className="mt-5 px-4">
        <label className="grid gap-1.5">
          <span className="px-1 text-sm font-bold text-maroon">Your note</span>
          <textarea
            defaultValue={scan.note}
            onBlur={(e) => void saveNote(e.target.value)}
            rows={2}
            placeholder="Where you saw it, who to tell…"
            className="w-full rounded-2xl border border-input bg-card p-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </section>

      <div className="mt-6 grid gap-2.5 px-4">
        <Button variant="hero" size="xl" onClick={() => void navigate({ to: "/scan" })}>
          Scan another sign
        </Button>
        <Link
          to="/history"
          className="inline-flex items-center justify-center rounded-2xl border border-input bg-card px-4 py-3 text-sm font-semibold text-foreground"
        >
          See all my scans
        </Link>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scan?</AlertDialogTitle>
            <AlertDialogDescription>
              The photo and the text are removed from this device. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
