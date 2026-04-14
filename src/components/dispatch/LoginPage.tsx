import { useState } from "react";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const err = await login(username, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Icon name="Bus" size={24} className="text-neutral-700" />
            <span className="font-bold text-neutral-900 uppercase tracking-wide text-sm">RoutePayroll</span>
          </div>
          <p className="text-neutral-500 text-sm">Войдите в систему</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
          <div>
            <label className="text-xs text-neutral-500 block mb-1">Логин</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              className="border border-neutral-300 rounded px-3 py-2.5 text-sm w-full focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-500 block mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border border-neutral-300 rounded px-3 py-2.5 text-sm w-full focus:outline-none focus:border-neutral-600"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded flex items-center gap-2">
              <Icon name="AlertCircle" size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username}
            className="w-full bg-neutral-900 text-white py-2.5 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer font-medium"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}