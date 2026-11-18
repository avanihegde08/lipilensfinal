import { cn } from "@/lib/utils";

/** Mysore-style decorative strip used to frame art and headers. */
export function Ornament({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-3 w-full border-ornament", className)} />;
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid size-10 place-items-center rounded-2xl bg-hero font-kannada text-xl font-bold text-maroon shadow-soft",
        className,
      )}
    >
      <span lang="kn" className="leading-none">ಲಿ</span>
    </div>
  );
}
