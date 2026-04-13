import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "./api";

export type Role = "admin" | "dispatcher" | "mechanic" | "hr" | "accountant";

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: Role;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => null,
  logout: () => {},
});

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

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
