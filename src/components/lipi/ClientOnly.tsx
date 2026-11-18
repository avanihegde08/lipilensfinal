import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders children only after the page has hydrated in the browser.
 * Use it around anything that needs camera, canvas or other browser-only APIs.
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? children : null;
}
