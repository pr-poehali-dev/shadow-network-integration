const BASE = "https://functions.poehali.dev/eddcaeff-a568-4560-b649-6d3a1ba1a4db";
const DOCS_BASE = "https://functions.poehali.dev/f5dab932-b9b8-411b-8dae-1739a99ce665";
const AUTH_BASE = "https://functions.poehali.dev/ffa989a9-7b30-4c2a-814b-0c251aa830a6";

function getToken() {
  return localStorage.getItem("auth_token") || "";
}

async function req(method: string, resource: string, body?: object, params?: Record<string, string>) {
  const url = new URL(BASE);
  url.searchParams.set("resource", resource);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
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
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function authReq(method: string, resource: string, body?: object, params?: Record<string, string>) {
  const url = new URL(AUTH_BASE);
  url.searchParams.set("resource", resource);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) => authReq("POST", "login", { username, password }),
  logout: () => authReq("POST", "logout"),
  getMe: () => authReq("GET", "me"),
  getUsers: () => authReq("GET", "users"),
  createUser: (data: { username: string; password: string; full_name: string; role: string }) => authReq("POST", "users", data),
  updateUser: (id: number, data: object) => authReq("PUT", "users", data, { id: String(id) }),

  // Settings
  getSettings: () => req("GET", "settings"),
  updateSetting: (key: string, value: string) => req("PUT", "settings", { key, value }),

  // Terminals
  getTerminals: () => req("GET", "terminals"),
  createTerminal: (data: { number: string; name: string; organization: string }) => req("POST", "terminals", data),
  updateTerminal: (id: number, data: { number: string; name: string; organization: string }) => req("PUT", "terminals", data, { id: String(id) }),
  deleteTerminal: (id: number) => req("DELETE", "terminals", undefined, { id: String(id) }),

  // Routes
  getRoutes: () => req("GET", "routes"),
  createRoute: (data: { number: string; name: string; organization?: string; max_graphs?: number }) => req("POST", "routes", data),
  updateRoute: (id: number, data: { number: string; name: string; organization?: string; max_graphs?: number }) => req("PUT", "routes", data, { id: String(id) }),
  deleteRoute: (id: number) => req("DELETE", "routes", undefined, { id: String(id) }),
  getLineReport: (workDate: string) => req("GET", "linereport", undefined, { work_date: workDate }),

  // Buses
  getBuses: () => req("GET", "buses"),
  createBus: (data: { board_number: string; model: string }) => req("POST", "buses", data),
  updateBus: (id: number, data: { board_number: string; model: string }) => req("PUT", "buses", data, { id: String(id) }),
  deleteBus: (id: number) => req("DELETE", "buses", undefined, { id: String(id) }),

  // Drivers
  getDrivers: () => req("GET", "drivers"),
  createDriver: (data: object) => req("POST", "drivers", data),
  updateDriver: (id: number, data: object) => req("PUT", "drivers", data, { id: String(id) }),
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

  // ITR
  getItrEmployees: () => req("GET", "itr_employees"),
  createItrEmployee: (data: object) => req("POST", "itr_employees", data),
  updateItrEmployee: (id: number, data: object) => req("PUT", "itr_employees", data, { id: String(id) }),
  deleteItrEmployee: (id: number) => req("DELETE", "itr_employees", undefined, { id: String(id) }),
  getItrSalary: (year: number, month: number) => req("GET", "itr_salary", undefined, { year: String(year), month: String(month) }),
  saveItrSalary: (data: object) => req("PUT", "itr_salary", data),

  // Driver salary
  getDriverSalary: (year: number, month: number) => req("GET", "driver_salary", undefined, { year: String(year), month: String(month) }),

  // Bus documents
  getBusDocs: (busId: number) => docsReq("GET", "docs", undefined, { bus_id: String(busId) }),
  getAlerts: (days?: number) => docsReq("GET", "alerts", undefined, { days: String(days ?? 30) }),
  createBusDoc: (data: object) => docsReq("POST", "docs", data),
  updateBusDoc: (id: number, data: object) => docsReq("PUT", "docs", data, { id: String(id) }),
  deleteBusDoc: (id: number) => docsReq("DELETE", "docs", undefined, { id: String(id) }),
};