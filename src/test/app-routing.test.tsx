import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
function makeRouter() {
  return createRouter({ routeTree, context: { queryClient: new QueryClient() } });
}

// Every screen the home page, the bottom bar and the scan flow link to.
const SCREENS = [
  "/",
  "/about",
  "/scan",
  "/scan/crop",
  "/scan/abc-123",
  "/history",
  "/saved",
  "/settings",
];

describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const matches = makeRouter().matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches a real page for every screen the app links to", () => {
    const router = makeRouter();

    for (const path of SCREENS) {
      const last = router.matchRoutes(path).at(-1);
      expect(last?.routeId, `${path} fell back to not found`).toBeDefined();
      expect(last?.routeId, `${path} fell back to not found`).not.toBe(rootRouteId);
    }
  });

  it("keeps the scan id on the result screen", () => {
    const last = makeRouter().matchRoutes("/scan/abc-123").at(-1);

    expect(last?.routeId).toBe("/scan/$id");
    expect(last?.params).toEqual({ id: "abc-123" });
  });
});
