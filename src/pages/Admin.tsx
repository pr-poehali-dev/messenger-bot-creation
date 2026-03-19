import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const ADMIN_PASSWORD = "strazh-admin-2024"; // TODO: вынести в бэкенд после деплоя функций

interface Plan {
  plan:      string;
  label:     string;
  price_rub: number;
  days:      number;
  badge:     string | null;
}

const DEFAULT_PLANS: Plan[] = [
  { plan: "month",   label: "1 месяц",  price_rub: 59,  days: 30,  badge: null      },
  { plan: "quarter", label: "3 месяца", price_rub: 149, days: 90,  badge: "Выгодно" },
  { plan: "year",    label: "Год",      price_rub: 590, days: 365, badge: "Лучший"  },
];

export default function Admin() {
  const navigate     = useNavigate();
  const [authed,     setAuthed]     = useState(false);
  const [password,   setPassword]   = useState("");
  const [pwError,    setPwError]    = useState("");
  const [plans,      setPlans]      = useState<Plan[]>(DEFAULT_PLANS);
  const [editing,    setEditing]    = useState<string | null>(null);
  const [editPrice,  setEditPrice]  = useState("");
  const [editBadge,  setEditBadge]  = useState("");
  const [saved,      setSaved]      = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<"pricing" | "stats">("pricing");

  useEffect(() => {
    if (sessionStorage.getItem("strazh_admin") === "1") setAuthed(true);
    const stored = localStorage.getItem("strazh_plans");
    if (stored) setPlans(JSON.parse(stored));
  }, []);

  const login = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("strazh_admin", "1");
      setAuthed(true);
    } else {
      setPwError("Неверный пароль");
    }
  };

  const startEdit = (plan: Plan) => {
    setEditing(plan.plan);
    setEditPrice(String(plan.price_rub));
    setEditBadge(plan.badge || "");
  };

  const saveEdit = (planKey: string) => {
    const newPlans = plans.map(p =>
      p.plan === planKey
        ? { ...p, price_rub: parseInt(editPrice) || p.price_rub, badge: editBadge || null }
        : p
    );
    setPlans(newPlans);
    localStorage.setItem("strazh_plans", JSON.stringify(newPlans));
    setEditing(null);
    setSaved(planKey);
    setTimeout(() => setSaved(null), 2000);
  };

  const mockStats = {
    total:   142,
    trial:   38,
    active:  91,
    expired: 13,
    mrr:     (91 * 59).toLocaleString("ru-RU"),
  };

  // ── AUTH ──────────────────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-2xl">⚔️</span>
          <div>
            <div className="font-black">Страж · Админ</div>
            <div className="text-xs text-muted-foreground">Только для владельца</div>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Пароль</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="••••••••" className="field-input" />
          </div>
          {pwError && <p className="text-sm text-red-400">{pwError}</p>}
          <button onClick={login}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] font-bold transition-colors">
            Войти
          </button>
        </div>
        <button onClick={() => navigate("/")} className="mt-4 text-xs text-muted-foreground hover:text-foreground w-full text-center">
          ← На главную
        </button>
      </div>
    </div>
  );

  // ── ADMIN PANEL ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚔️</span>
            <span className="font-black">Страж</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold ml-1">Админ</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-xs text-muted-foreground hover:text-foreground">
              Кабинет
            </button>
            <button onClick={() => { sessionStorage.removeItem("strazh_admin"); setAuthed(false); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Icon name="LogOut" size={12} />
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: "pricing" as const, label: "Тарифы" },
            { key: "stats"   as const, label: "Статистика" },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === t.key
                ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* PRICING TAB */}
        {activeTab === "pricing" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Изменения применяются мгновенно для всех новых пользователей.</p>
            {plans.map(p => (
              <div key={p.plan} className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-bold">{p.label}</span>
                    {p.badge && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-xs">{p.badge}</span>
                    )}
                  </div>
                  {saved === p.plan
                    ? <span className="text-xs text-emerald-400 font-semibold">✓ Сохранено</span>
                    : <button onClick={() => startEdit(p.plan)} className="text-xs text-cyan-400 hover:text-cyan-300">
                        Изменить
                      </button>
                  }
                </div>

                {editing === p.plan ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Цена (₽)</label>
                      <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                        className="field-input mono" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Бейдж (необязательно)</label>
                      <input type="text" value={editBadge} onChange={e => setEditBadge(e.target.value)}
                        placeholder="Выгодно, Хит, Лучший..." className="field-input" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(null)}
                        className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
                        Отмена
                      </button>
                      <button onClick={() => saveEdit(p.plan)}
                        className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] text-sm font-bold transition-colors">
                        Сохранить
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="text-2xl font-black text-foreground">{p.price_rub} ₽</span>
                    <span>·</span>
                    <span>{p.days} дней</span>
                  </div>
                )}
              </div>
            ))}

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400">
                После подключения бэкенда цены будут сохраняться в базе данных и автоматически применяться на лендинге и при оплате.
              </p>
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Всего пользователей", val: mockStats.total, icon: "Users",    color: "text-foreground" },
                { label: "Активных подписок",   val: mockStats.active,  icon: "Check",    color: "text-emerald-400" },
                { label: "На триале",           val: mockStats.trial,   icon: "Clock",    color: "text-cyan-400"    },
                { label: "Истекших",            val: mockStats.expired, icon: "XCircle",  color: "text-red-400"     },
              ].map((s, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name={s.icon} size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <div className={`text-3xl font-black ${s.color}`}>{s.val}</div>
                </div>
              ))}
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="text-xs text-muted-foreground mb-1">Ежемесячная выручка (MRR)</div>
              <div className="text-4xl font-black text-cyan-400">{mockStats.mrr} ₽</div>
              <p className="text-xs text-muted-foreground mt-2">Расчёт: {mockStats.active} активных × 59 ₽</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground">
                Реальная статистика появится после подключения бэкенда и первых платёжных транзакций.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
