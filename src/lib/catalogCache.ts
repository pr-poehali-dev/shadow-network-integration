import { api } from "./api";

const TTL = 5 * 60 * 1000; // 5 минут

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const store: Record<string, CacheEntry<unknown>> = {};

function get<T>(key: string): T | null {
  const e = store[key];
  if (!e) return null;
  if (Date.now() - e.ts > TTL) { delete store[key]; return null; }
  return e.data as T;
}

function set<T>(key: string, data: T) {
  store[key] = { data, ts: Date.now() };
}

export function invalidate(key: string) {
  delete store[key];
}

export function invalidateAll() {
  Object.keys(store).forEach(k => delete store[k]);
}

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = get<T>(key);
  if (hit !== null) return hit;
  const data = await fetcher();
  set(key, data);
  return data;
}

export const catalogCache = {
  getRoutes: () => cached("routes", api.getRoutes),
  getBuses: () => cached("buses", api.getBuses),
  getDrivers: () => cached("drivers", api.getDrivers),
  getConductors: () => cached("conductors", api.getConductors),
  getTerminals: () => cached("terminals", api.getTerminals),
  getSettings: () => cached("settings", api.getSettings),

  invalidateRoutes: () => invalidate("routes"),
  invalidateBuses: () => invalidate("buses"),
  invalidateDrivers: () => invalidate("drivers"),
  invalidateConductors: () => invalidate("conductors"),
  invalidateTerminals: () => invalidate("terminals"),
  invalidateSettings: () => invalidate("settings"),
};
