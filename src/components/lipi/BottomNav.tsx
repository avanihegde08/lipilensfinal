import { Link } from "@tanstack/react-router";
import { Clock, House, ScanLine, Settings, Star } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: House },
  { to: "/history", label: "History", icon: Clock },
  { to: "/saved", label: "Saved", icon: Star },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Tab({ to, label, icon: Icon }: (typeof tabs)[number]) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="group flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary"
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("size-5", isActive && "stroke-[2.5]")} />
          {label}
        </>
      )}
    </Link>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t bg-card/95 px-2 pt-1 backdrop-blur safe-bottom"
    >
      <div className="flex items-end">
        <Tab {...tabs[0]} />
        <Tab {...tabs[1]} />
        <div className="flex flex-1 justify-center">
          <Link
            to="/scan"
            aria-label="Scan Kannada text"
            className="-mt-7 grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-fab ring-4 ring-secondary transition-transform active:scale-95"
          >
            <ScanLine className="size-7" />
          </Link>
        </div>
        <Tab {...tabs[2]} />
        <Tab {...tabs[3]} />
      </div>
    </nav>
  );
}
