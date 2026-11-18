import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckSquare, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/lipi/EmptyState";
import { ScanListItem } from "@/components/lipi/ScanListItem";
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
import { deleteScans, scansQuery } from "@/lib/lipi/storage";

export const Route = createFileRoute("/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Scan history — Lipi Lens" },
      {
        name: "description",
        content: "Every Kannada sign you have read, saved on this device only.",
      },
      { property: "og:title", content: "Scan history — Lipi Lens" },
      {
        property: "og:description",
        content: "Every Kannada sign you have read, saved on this device only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(scansQuery());
  },
  component: History,
});

function History() {
  const { data: scans } = useSuspenseQuery(scansQuery());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  const removeSelected = async () => {
    await deleteScans(selected);
    await queryClient.invalidateQueries({ queryKey: ["scans"] });
    toast.success(selected.length === 1 ? "Scan deleted" : `${selected.length} scans deleted`);
    stopSelecting();
    setConfirming(false);
  };

  if (scans.length === 0) {
    return (
      <main className="min-h-dvh">
        <header className="px-5 pt-4 safe-top">
          <h1 className="text-2xl font-extrabold text-maroon">History</h1>
        </header>
        <EmptyState
          title="Nothing scanned yet"
          body="Photos you read become a list here, so you can find the words again."
          action={
            <button
              type="button"
              onClick={() => void navigate({ to: "/scan" })}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-fab"
            >
              Take a photo
            </button>
          }
        />
      </main>
    );
  }

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-card/95 px-4 pt-3 pb-2 backdrop-blur safe-top">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-maroon">History</h1>
          <p className="text-[11px] text-muted-foreground">
            {scans.length} {scans.length === 1 ? "scan" : "scans"} on this device
          </p>
        </div>
        {selecting ? (
          <>
            <button
              type="button"
              onClick={() => setSelected(scans.map((s) => s.id))}
              className="rounded-full bg-accent px-3 py-2 text-xs font-semibold text-maroon active:scale-95"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={selected.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" /> Delete {selected.length || ""}
            </button>
            <button
              type="button"
              onClick={stopSelecting}
              aria-label="Stop selecting"
              className="grid size-9 place-items-center rounded-full bg-accent text-maroon active:scale-95"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setSelecting(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-maroon active:scale-95"
          >
            <CheckSquare className="size-3.5" /> Select
          </button>
        )}
      </header>

      <div className="grid gap-2.5 px-4 pt-3">
        {scans.map((scan) => (
          <ScanListItem
            key={scan.id}
            scan={scan}
            selecting={selecting}
            selected={selected.includes(scan.id)}
            onToggleSelect={() => toggle(scan.id)}
            {...(selecting ? {} : { onLongPress: () => setSelecting(true) })}
          />
        ))}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.length} {selected.length === 1 ? "scan" : "scans"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The photos and text are removed from this device. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them</AlertDialogCancel>
            <AlertDialogAction onClick={() => void removeSelected()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
