import { Link } from "@tanstack/react-router";
import { Check, ImageOff, Star } from "lucide-react";

import { CATEGORY_LABELS, type Scan } from "@/lib/lipi/types";
import { cn } from "@/lib/utils";

export function scanPreview(scan: Scan) {
  const kn = scan.result.blocks.find((b) => b.language === "kn") ?? scan.result.blocks[0];
  return { kannada: kn?.as_written ?? "", english: kn?.translation || kn?.transliteration || "" };
}

export function ScanThumb({ scan, className }: { scan: Scan; className?: string }) {
  return scan.thumb ? (
    <img src={scan.thumb} alt="" className={cn("rounded-xl object-cover", className)} loading="lazy" />
  ) : (
    <div className={cn("grid place-items-center rounded-xl bg-accent text-maroon", className)}>
      <ImageOff className="size-5" />
    </div>
  );
}

export function ScanListItem({
  scan,
  selecting,
  selected,
  onToggleSelect,
  onLongPress,
}: {
  scan: Scan;
  selecting?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}) {
  const { kannada, english } = scanPreview(scan);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const body = (
    <>
      <ScanThumb scan={scan} className="size-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <p lang="kn" className="truncate font-kannada text-base font-semibold text-foreground">
          {kannada || "—"}
        </p>
        <p className="truncate text-sm text-muted-foreground">{english}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {CATEGORY_LABELS[scan.result.category]} ·{" "}
          {new Date(scan.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      {selecting ? (
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full border-2",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
          )}
        >
          {selected && <Check className="size-4" />}
        </span>
      ) : (
        scan.favorite && <Star className="size-5 shrink-0 fill-secondary text-marigold" aria-label="Saved" />
      )}
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-2xl bg-card p-2.5 text-left shadow-soft transition active:scale-[0.99]";
  if (selecting) {
    return (
      <button type="button" className={cn(cls, selected && "ring-2 ring-primary")} onClick={onToggleSelect}>
        {body}
      </button>
    );
  }
  return (
    <Link
      to="/scan/$id"
      params={{ id: scan.id }}
      className={cls}
      onPointerDown={() => {
        if (onLongPress) timer = setTimeout(onLongPress, 550);
      }}
      onPointerUp={() => clearTimeout(timer)}
      onPointerLeave={() => clearTimeout(timer)}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault();
          onLongPress();
        }
      }}
    >
      {body}
    </Link>
  );
}
