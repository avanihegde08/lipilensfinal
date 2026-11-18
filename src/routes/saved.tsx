import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { EmptyState } from "@/components/lipi/EmptyState";
import { ScanListItem } from "@/components/lipi/ScanListItem";
import { scansQuery } from "@/lib/lipi/storage";

export const Route = createFileRoute("/saved")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Saved signs — Lipi Lens" },
      {
        name: "description",
        content: "The Kannada signs you starred, kept on this device so you can read them again.",
      },
      { property: "og:title", content: "Saved signs — Lipi Lens" },
      {
        property: "og:description",
        content: "The Kannada signs you starred, kept on this device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(scansQuery());
  },
  component: Saved,
});

function Saved() {
  const { data: scans } = useSuspenseQuery(scansQuery());
  const navigate = useNavigate();
  const saved = scans.filter((scan) => scan.favorite);

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-card/95 px-4 pt-3 pb-2 backdrop-blur safe-top">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-maroon">Saved</h1>
          <p className="text-[11px] text-muted-foreground">
            {saved.length} {saved.length === 1 ? "sign" : "signs"} you starred
          </p>
        </div>
        <span className="grid size-9 place-items-center rounded-full bg-secondary text-maroon">
          <Star className="size-4 fill-current" />
        </span>
      </header>

      {saved.length === 0 ? (
        <EmptyState
          title="No saved signs yet"
          body="Tap the star on any scan and it will wait for you here."
          action={
            <button
              type="button"
              onClick={() => void navigate({ to: "/history" })}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-fab"
            >
              Open my history
            </button>
          }
        />
      ) : (
        <div className="grid gap-2.5 px-4 pt-3">
          {saved.map((scan) => (
            <ScanListItem key={scan.id} scan={scan} />
          ))}
        </div>
      )}
    </main>
  );
}
