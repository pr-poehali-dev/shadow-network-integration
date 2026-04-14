import { api } from "./api";

const TTL_CATALOG = 10 * 60 * 1000; // 10 минут для редко меняемых каталогов
const TTL_SHORT   =  5 * 60 * 1000; // 5 минут для настроек

interface CacheEntry<T> {
  data: T;
  ts: number;
  ttl: number;
}

const store: Record<string, CacheEntry<unknown>> = {};
// In-flight дедупликация: пока запрос летит — повторные вызовы ждут его, а не стартуют новый
const inflight: Record<string, Promise<unknown>> = {};

function get<T>(key: string): T | null {
  const e = store[key];
  if (!e) return null;
  if (Date.now() - e.ts > e.ttl) { delete store[key]; return null; }
  return e.data as T;
}

function set<T>(key: string, data: T, ttl: number) {
  store[key] = { data, ts: Date.now(), ttl };
}

export function invalidate(key: string) {
  delete store[key];
  delete inflight[key];
}

export function invalidateAll() {
  Object.keys(store).forEach(k => delete store[k]);
  Object.keys(inflight).forEach(k => delete inflight[k]);
}

async function cached<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
  const hit = get<T>(key);
  if (hit !== null) return hit;

  // Если запрос уже летит — подождать его
  if (inflight[key]) return inflight[key] as Promise<T>;

  const promise = fetcher().then(data => {
    set(key, data, ttl);
    delete inflight[key];
    return data;
  }).catch(err => {
    delete inflight[key];
    throw err;
  });
  inflight[key] = promise;
  return promise;
}

export const catalogCache = {
  getRoutes:        () => cached("routes",        api.getRoutes,        TTL_CATALOG),
  getBuses:         () => cached("buses",         api.getBuses,         TTL_CATALOG),
  getDrivers:       () => cached("drivers",       api.getDrivers,       TTL_CATALOG),
  getConductors:    () => cached("conductors",    api.getConductors,    TTL_CATALOG),
  getTerminals:     () => cached("terminals",     api.getTerminals,     TTL_CATALOG),
  getSettings:      () => cached("settings",      api.getSettings,      TTL_SHORT),
  getOrganizations: () => cached("organizations", api.getOrganizations, TTL_CATALOG),

  invalidateRoutes:        () => invalidate("routes"),
  invalidateBuses:         () => invalidate("buses"),
  invalidateDrivers:       () => invalidate("drivers"),
  invalidateConductors:    () => invalidate("conductors"),
  invalidateTerminals:     () => invalidate("terminals"),
  invalidateSettings:      () => invalidate("settings"),
  invalidateOrganizations: () => invalidate("organizations"),
};
