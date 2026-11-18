// On-device scan history (IndexedDB). Client-only: call from browser code.
import { createStore, del, delMany, entries, get, set, clear } from "idb-keyval";
import { queryOptions } from "@tanstack/react-query";

import type { Scan } from "./types";

let store: ReturnType<typeof createStore> | null = null;
const db = () => (store ??= createStore("lipi-lens", "scans"));

export async function listScans(): Promise<Scan[]> {
  const all = await entries<string, Scan>(db());
  return all.map(([, v]) => v).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getScan(id: string): Promise<Scan | null> {
  return (await get<Scan>(id, db())) ?? null;
}

export async function saveScan(scan: Scan) {
  await set(scan.id, scan, db());
}

export async function updateScan(id: string, patch: Partial<Scan>) {
  const current = await getScan(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await set(id, next, db());
  return next;
}

export async function deleteScans(ids: string[]) {
  if (ids.length === 1 && ids[0]) await del(ids[0], db());
  else await delMany(ids, db());
}

export async function clearScans() {
  await clear(db());
}

export const scansQuery = () =>
  queryOptions({ queryKey: ["scans"], queryFn: listScans, staleTime: 0 });

export const scanQuery = (id: string) =>
  queryOptions({ queryKey: ["scans", id], queryFn: () => getScan(id), staleTime: 0 });

export function newScanId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
