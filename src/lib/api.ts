const BASE = "https://functions.poehali.dev/eddcaeff-a568-4560-b649-6d3a1ba1a4db";
const DOCS_BASE = "https://functions.poehali.dev/f5dab932-b9b8-411b-8dae-1739a99ce665";

async function req(method: string, resource: string, body?: object, params?: Record<string, string>) {
  const url = new URL(BASE);
  url.searchParams.set("resource", resource);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function docsReq(method: string, resource: string, body?: object, params?: Record<string, string>) {
  const url = new URL(DOCS_BASE);
  url.searchParams.set("resource", resource);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export const api = {
  // Routes
  getRoutes: () => req("GET", "routes"),
  createRoute: (data: { number: string; name: string }) => req("POST", "routes", data),
  updateRoute: (id: number, data: { number: string; name: string }) => req("PUT", "routes", data, { id: String(id) }),
  deleteRoute: (id: number) => req("DELETE", "routes", undefined, { id: String(id) }),

  // Buses
  getBuses: () => req("GET", "buses"),
  createBus: (data: { board_number: string; model: string }) => req("POST", "buses", data),
  updateBus: (id: number, data: { board_number: string; model: string }) => req("PUT", "buses", data, { id: String(id) }),
  deleteBus: (id: number) => req("DELETE", "buses", undefined, { id: String(id) }),

  // Drivers
  getDrivers: () => req("GET", "drivers"),
  createDriver: (data: { full_name: string }) => req("POST", "drivers", data),
  updateDriver: (id: number, data: { full_name: string }) => req("PUT", "drivers", data, { id: String(id) }),
  deleteDriver: (id: number) => req("DELETE", "drivers", undefined, { id: String(id) }),

  // Conductors
  getConductors: () => req("GET", "conductors"),
  createConductor: (data: { full_name: string }) => req("POST", "conductors", data),
  updateConductor: (id: number, data: { full_name: string }) => req("PUT", "conductors", data, { id: String(id) }),
  deleteConductor: (id: number) => req("DELETE", "conductors", undefined, { id: String(id) }),

  // Schedule
  getSchedule: (date: string) => req("GET", "schedule", undefined, { date }),
  createScheduleEntry: (data: object) => req("POST", "schedule", data),
  updateScheduleEntry: (data: object) => req("PUT", "schedule", data),
  deleteScheduleEntry: (id: number) => req("DELETE", "schedule", undefined, { id: String(id) }),

  // Summary
  getSummary: (year: number, month: number) => req("GET", "summary", undefined, { year: String(year), month: String(month) }),

  // Route graphs
  getRouteGraphs: (routeId: number, workDate: string) =>
    req("GET", "graphs", undefined, { route_id: String(routeId), work_date: workDate }),
  saveRouteGraph: (data: object) => req("POST", "graphs", data),
  updateRouteGraph: (id: number, data: object) => req("PUT", "graphs", data, { id: String(id) }),
  deleteRouteGraph: (id: number) => req("DELETE", "graphs", undefined, { id: String(id) }),

  // Bus documents
  getBusDocs: (busId: number) => docsReq("GET", "docs", undefined, { bus_id: String(busId) }),
  getAlerts: (days?: number) => docsReq("GET", "alerts", undefined, { days: String(days ?? 30) }),
  createBusDoc: (data: object) => docsReq("POST", "docs", data),
  updateBusDoc: (id: number, data: object) => docsReq("PUT", "docs", data, { id: String(id) }),
  deleteBusDoc: (id: number) => docsReq("DELETE", "docs", undefined, { id: String(id) }),
};