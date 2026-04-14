import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "./api";

export type Role = "admin" | "dispatcher" | "mechanic" | "hr" | "accountant";

export type TabId = "schedule" | "summary" | "busdocs" | "routes" | "buses" | "drivers" | "conductors" | "terminals" | "settings" | "users" | "salary" | "mechanics" | "journal_medical" | "journal_release" | "company_card" | "cash";

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  permissions?: string | null;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  hasAccess: (tab: TabId) => boolean;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => null,
  logout: () => {},
  hasAccess: () => false,
});

const DEFAULT_ROLE_TABS: Record<Role, TabId[]> = {
  admin: ["schedule", "summary", "busdocs", "routes", "buses", "drivers", "conductors", "terminals", "salary", "mechanics", "journal_medical", "journal_release", "company_card", "cash", "settings", "users"],
  dispatcher: ["schedule", "summary", "busdocs", "journal_medical", "journal_release"],
  mechanic: ["busdocs", "buses", "mechanics", "journal_release"],
  hr: ["drivers", "conductors"],
  accountant: ["summary", "salary", "cash"],
};

export const ALL_TABS: { id: TabId; label: string }[] = [
  { id: "schedule", label: "Расписание" },
  { id: "summary", label: "Сводка смен" },
  { id: "busdocs", label: "Документы ТС" },
  { id: "routes", label: "Маршруты" },
  { id: "buses", label: "Автобусы" },
  { id: "drivers", label: "Водители" },
  { id: "conductors", label: "Кондукторы" },
  { id: "terminals", label: "Терминалы" },
  { id: "salary", label: "Зарплата" },
  { id: "journal_medical", label: "Журнал медика" },
  { id: "journal_release", label: "Журнал выпуска ТС" },
  { id: "company_card", label: "Карточка предприятия" },
  { id: "cash", label: "Наличные" },
  { id: "settings", label: "Настройки" },
  { id: "users", label: "Пользователи" },
];

export function getUserTabs(user: User): TabId[] {
  if (user.role === "admin") return DEFAULT_ROLE_TABS.admin;
  if (user.permissions) {
    const tabs = user.permissions.split(",").filter(Boolean) as TabId[];
    return tabs.length > 0 ? tabs : DEFAULT_ROLE_TABS[user.role] || [];
  }
  return DEFAULT_ROLE_TABS[user.role] || [];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) { setLoading(false); return; }
    api.getMe().then(res => {
      if (res?.user) setUser(res.user);
      else localStorage.removeItem("auth_token");
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, []);

  const login = async (username: string, _password?: string) => {
    const res = await api.login(username, "");
    if (res?.error) return res.error;
    if (res?.token && res?.user) {
      localStorage.setItem("auth_token", res.token);
      setUser(res.user);
      return null;
    }
    return "Неизвестная ошибка";
  };

  const logout = () => {
    api.logout();
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  const hasAccess = (tab: TabId) => {
    if (!user) return false;
    return getUserTabs(user).includes(tab);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Администратор",
  dispatcher: "Диспетчер",
  mechanic: "Механик",
  hr: "Отдел кадров",
  accountant: "Бухгалтер",
};