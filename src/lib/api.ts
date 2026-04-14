const BASE = "https://functions.poehali.dev/eddcaeff-a568-4560-b649-6d3a1ba1a4db";
const DOCS_BASE = "https://functions.poehali.dev/f5dab932-b9b8-411b-8dae-1739a99ce665";
const AUTH_BASE = "https://functions.poehali.dev/ffa989a9-7b30-4c2a-814b-0c251aa830a6";

function getToken() {
  return localStorage.getItem("auth_token") || "";
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, timeoutMs = 8000): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      } else {
        throw e;
      }
    }
  }
  throw new Error("fetch failed after retries");
}

async function req(method: string, resource: string, body?: object, params?: Record<string, string>) {
  const url = new URL(BASE);
  url.searchParams.set("resource", resource);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetchWithRetry(url.toString(), {
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

  const res = await fetchWithRetry(url.toString(), {
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

  const res = await fetchWithRetry(url.toString(), {
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

  // Organizations
  getOrganizations: () => req("GET", "organizations"),

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

  // Crew salary records (ведомость)
  getCrewSalary: (year: number, month: number) => req("GET", "crew_salary", undefined, { year: String(year), month: String(month) }),
  saveCrewSalary: (data: object) => req("PUT", "crew_salary", data),

  // Company cards
  getCompanies: () => docsReq("GET", "companies"),
  getCompany: (id: number) => docsReq("GET", "companies", undefined, { id: String(id) }),
  createCompany: (data: object) => docsReq("POST", "companies", data),
  updateCompany: (id: number, data: object) => docsReq("PUT", "companies", data, { id: String(id) }),
  deleteCompany: (id: number) => docsReq("DELETE", "companies", undefined, { id: String(id) }),

  // Company documents
  getCompanyDocs: (companyId: number) => docsReq("GET", "company_docs", undefined, { company_id: String(companyId) }),
  createCompanyDoc: (data: object) => docsReq("POST", "company_docs", data),
  updateCompanyDoc: (id: number, data: object) => docsReq("PUT", "company_docs", data, { id: String(id) }),
  deleteCompanyDoc: (id: number) => docsReq("DELETE", "company_docs", undefined, { id: String(id) }),

  // Bus documents
  getBusDocs: (busId: number) => docsReq("GET", "docs", undefined, { bus_id: String(busId) }),
  getAlerts: (days?: number) => docsReq("GET", "alerts", undefined, { days: String(days ?? 30) }),
  createBusDoc: (data: object) => docsReq("POST", "docs", data),
  updateBusDoc: (id: number, data: object) => docsReq("PUT", "docs", data, { id: String(id) }),
  deleteBusDoc: (id: number) => docsReq("DELETE", "docs", undefined, { id: String(id) }),

  // Mechanics
  getMechanics: (organization?: string) => req("GET", "mechanics", undefined, organization ? { organization } : {}),
  createMechanic: (data: { full_name: string; organization?: string }) => req("POST", "mechanics", data),
  updateMechanic: (id: number, data: object) => req("PUT", "mechanics", data, { id: String(id) }),
  deleteMechanic: (id: number) => req("DELETE", "mechanics", undefined, { id: String(id) }),

  // Medical journal
  getMedicalJournal: (date: string, organization?: string) =>
    req("GET", "medical_journal", undefined, { date, ...(organization ? { organization } : {}) }),
  createMedicalRecord: (data: object) => req("POST", "medical_journal", data),
  updateMedicalRecord: (id: number, data: object) => req("PUT", "medical_journal", data, { id: String(id) }),
  deleteMedicalRecord: (id: number) => req("DELETE", "medical_journal", undefined, { id: String(id) }),
  initMedicalJournal: (work_date: string, organization?: string) =>
    req("POST", "medical_journal_init", { work_date, ...(organization ? { organization } : {}) }),

  // Vehicle release journal
  getVehicleRelease: (date: string, organization?: string) =>
    req("GET", "vehicle_release", undefined, { date, ...(organization ? { organization } : {}) }),
  createVehicleRelease: (data: object) => req("POST", "vehicle_release", data),
  updateVehicleRelease: (id: number, data: object) => req("PUT", "vehicle_release", data, { id: String(id) }),
  deleteVehicleRelease: (id: number) => req("DELETE", "vehicle_release", undefined, { id: String(id) }),
  initVehicleRelease: (work_date: string, organization?: string) =>
    req("POST", "vehicle_release_init", { work_date, ...(organization ? { organization } : {}) }),

  // Cash operations
  getCash: (params?: Record<string, string>) => req("GET", "cash", undefined, params),
  createCash: (data: object) => req("POST", "cash", data),
  updateCash: (id: number, data: object) => req("PUT", "cash", data, { id: String(id) }),
  deleteCash: (id: number) => req("DELETE", "cash", undefined, { id: String(id) }),

  // Staff (HR)
  getStaff: (params?: Record<string,string>) => req("GET", "staff", undefined, params),
  createStaff: (data: object) => req("POST", "staff", data),
  updateStaff: (id: number, data: object) => req("PUT", "staff", data, { id: String(id) }),
  deleteStaff: (id: number) => req("DELETE", "staff", undefined, { id: String(id) }),

  // Repair journal
  getRepairJournal: (params?: Record<string,string>) => req("GET", "repair_journal", undefined, params),
  createRepairJournal: (data: object) => req("POST", "repair_journal", data),
  updateRepairJournal: (id: number, data: object) => req("PUT", "repair_journal", data, { id: String(id) }),
  deleteRepairJournal: (id: number) => req("DELETE", "repair_journal", undefined, { id: String(id) }),

  // Repair works
  createRepairWork: (data: object) => req("POST", "repair_works", data),
  updateRepairWork: (id: number, data: object) => req("PUT", "repair_works", data, { id: String(id) }),
  deleteRepairWork: (id: number) => req("DELETE", "repair_works", undefined, { id: String(id) }),

  // Repair parts
  createRepairPart: (data: object) => req("POST", "repair_parts", data),
  updateRepairPart: (id: number, data: object) => req("PUT", "repair_parts", data, { id: String(id) }),
  deleteRepairPart: (id: number) => req("DELETE", "repair_parts", undefined, { id: String(id) }),

  // Repair work templates
  getRepairWorkTemplates: () => req("GET", "repair_work_templates"),
  createRepairWorkTemplate: (data: object) => req("POST", "repair_work_templates", data),
  deleteRepairWorkTemplate: (id: number) => req("DELETE", "repair_work_templates", undefined, { id: String(id) }),

  // Repair mechanics
  getRepairMechanics: () => req("GET", "repair_mechanics"),
  createRepairMechanic: (data: object) => req("POST", "repair_mechanics", data),
  updateRepairMechanic: (id: number, data: object) => req("PUT", "repair_mechanics", data, { id: String(id) }),
  deleteRepairMechanic: (id: number) => req("DELETE", "repair_mechanics", undefined, { id: String(id) }),

  // Maintenance journal
  getMaintenanceJournal: (params?: Record<string,string>) => req("GET", "maintenance_journal", undefined, params),
  createMaintenanceJournal: (data: object) => req("POST", "maintenance_journal", data),
  updateMaintenanceJournal: (id: number, data: object) => req("PUT", "maintenance_journal", data, { id: String(id) }),
  deleteMaintenanceJournal: (id: number) => req("DELETE", "maintenance_journal", undefined, { id: String(id) }),

  // Cashier reports
  getCashierReport: (date: string, organization?: string) =>
    req("GET", "cashier_report", undefined, { date, ...(organization ? { organization } : {}) }),
  saveCashierReport: (data: object) => req("POST", "cashier_report", data),
  deleteCashierReport: (id: number) => req("DELETE", "cashier_report", undefined, { id: String(id) }),

  // Cash restrictions
  getCashRestrictions: () => req("GET", "cash_restriction"),
  createCashRestriction: (data: object) => req("POST", "cash_restriction", data),
  updateCashRestriction: (id: number, data: object) => req("PUT", "cash_restriction", data, { id: String(id) }),
  deleteCashRestriction: (id: number) => req("DELETE", "cash_restriction", undefined, { id: String(id) }),
};