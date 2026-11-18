import type { ReactNode } from "react";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <img src="/art/empty-state.jpg" alt="" width={816} height={816} loading="lazy" className="size-40 rounded-full object-cover shadow-soft" />
      <h2 className="mt-4 text-xl font-bold text-maroon">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
