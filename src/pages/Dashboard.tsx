import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

type SubStatus = "trial" | "active" | "expired" | "none";

interface UserData {
  max_user_id: number;
  max_username: string;
  max_name: string;
  is_admin: boolean;
  subscription: { status: SubStatus; expires: string | null };
}

const PLANS = [
  { plan: "month",   label: "1 месяц",  price: 59,  badge: null,      per: "59 ₽/мес" },
  { plan: "quarter", label: "3 месяца", price: 149, badge: "Выгодно", per: "≈ 50 ₽/мес" },
  { plan: "year",    label: "Год",      price: 590, badge: "Лучший",  per: "≈ 49 ₽/мес" },
];

function daysLeft(isoDate: string | null): number {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [step,     setStep]     = useState<"login" | "main">("login");
  const [maxId,    setMaxId]    = useState("");
  const [username, setUsername] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [user,     setUser]     = useState<UserData | null>(null);

  // Восстановить сессию из localStorage
  useEffect(() => {
    const saved = localStorage.getItem("strazh_user");
    if (saved) { setUser(JSON.parse(saved)); setStep("main"); }
  }, []);

  const login = async () => {
    if (!maxId.trim()) { setError("Введи свой ID в Макс"); return; }
    setLoading(true); setError("");
    try {
      // Имитация до подключения бэкенда
      const mockUser: UserData = {
        max_user_id:  parseInt(maxId),
        max_username: username || "user",
        max_name:     name || "Пользователь",
        is_admin:     false,
        subscription: {
          status:  "trial",
          expires: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
      };
      localStorage.setItem("strazh_user", JSON.stringify(mockUser));
      setUser(mockUser);
      setStep("main");
    } catch {
      setError("Ошибка подключения. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("strazh_user");
    setUser(null); setStep("login"); setMaxId(""); setUsername(""); setName("");
  };

  // ── LOGIN ──────────────────────────────────────────────
  if (step === "login") return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
          <Icon name="ArrowLeft" size={14} />
          На главную
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-xl">⚔️</div>
          <div>
            <div className="font-black text-lg">Страж</div>
            <div className="text-xs text-muted-foreground">Личный кабинет</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <h2 className="font-bold text-lg">Войти / Зарегистрироваться</h2>
          <p className="text-sm text-muted-foreground">Введи свой числовой ID из мессенджера Макс</p>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">ID в Макс *</label>
            <input value={maxId} onChange={e => setMaxId(e.target.value)} onKeyDown={e => e.key === "Enter" && login()}
              placeholder="123456789" className="field-input mono" type="number" />
            <p className="text-xs text-muted-foreground mt-1">Как узнать ID: напиши боту @getidsbot в Макс</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Имя</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Иван Иванов" className="field-input" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Ник (необязательно)</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="@username" className="field-input" />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button onClick={login} disabled={loading}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] font-bold transition-colors disabled:opacity-50">
            {loading ? "Входим..." : "Войти"}
          </button>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400 leading-relaxed">
              ⚠️ Твой ID в Макс — это неизменяемый числовой идентификатор. Он не меняется при смене ника,
              поэтому мы используем именно его для привязки подписки.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── MAIN DASHBOARD ─────────────────────────────────────
  if (!user) return null;
  const sub    = user.subscription;
  const days   = daysLeft(sub.expires);
  const isOk   = sub.status === "trial" || sub.status === "active";
  const isPaid = sub.status === "active";

  const statusColor = sub.status === "active" ? "text-emerald-400" : sub.status === "trial" ? "text-cyan-400" : "text-red-400";
  const statusLabel = sub.status === "active" ? "Активна" : sub.status === "trial" ? "Пробный период" : "Истекла";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
            <span className="text-xl">⚔️</span>
            <span className="font-black">Страж</span>
          </button>
          <div className="flex items-center gap-3">
            {user.is_admin && (
              <button onClick={() => navigate("/admin")}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                Админ
              </button>
            )}
            <button onClick={logout} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <Icon name="LogOut" size={13} />
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        {/* User card */}
        <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-lg font-black text-cyan-400 shrink-0">
            {(user.max_name || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{user.max_name}</div>
            <div className="text-xs text-muted-foreground mono">ID: {user.max_user_id}</div>
          </div>
          <div className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            sub.status === "active" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
            sub.status === "trial"  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" :
            "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {statusLabel}
          </div>
        </div>

        {/* Subscription status */}
        <div className={`p-5 rounded-2xl border ${
          sub.status === "expired"
            ? "bg-red-500/5 border-red-500/20"
            : "bg-card border-border"
        }`}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="font-bold mb-1">Подписка</div>
              <div className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</div>
            </div>
            {isOk && (
              <div className="text-right">
                <div className="text-2xl font-black text-foreground">{days}</div>
                <div className="text-xs text-muted-foreground">{days === 1 ? "день" : days < 5 ? "дня" : "дней"}</div>
              </div>
            )}
          </div>

          {isOk && sub.expires && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>До {formatDate(sub.expires)}</span>
                <span>{days} дн.</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${Math.min(100, (days / (isPaid ? 30 : 7)) * 100)}%` }} />
              </div>
            </div>
          )}

          {sub.status === "expired" && (
            <p className="text-sm text-muted-foreground mb-4">Подписка истекла. Продли чтобы восстановить работу бота.</p>
          )}

          {days <= 3 && isOk && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
              <p className="text-xs text-amber-400">⚠️ Осталось мало времени — продли подписку чтобы бот не остановился</p>
            </div>
          )}
        </div>

        {/* Plans */}
        {(sub.status === "expired" || sub.status === "trial" || !isPaid) && (
          <div>
            <h3 className="font-bold mb-3">Выбери тариф</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {PLANS.map((p) => (
                <button key={p.plan}
                  onClick={() => navigate(`/pay?plan=${p.plan}&amount=${p.price}`)}
                  className="relative p-4 rounded-xl border border-border bg-card hover:border-cyan-500/40 transition-colors text-left group">
                  {p.badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-cyan-500 text-[hsl(220_16%_8%)] text-[10px] font-bold whitespace-nowrap">
                      {p.badge}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mb-1">{p.label}</div>
                  <div className="text-xl font-black group-hover:text-cyan-400 transition-colors">{p.price} ₽</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{p.per}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">Оплата через ЮMoney · Безопасно · Моментально</p>
          </div>
        )}

        {/* Quick links */}
        <div className="p-5 rounded-2xl bg-card border border-border">
          <h3 className="font-bold mb-3">Управление ботом</h3>
          <div className="space-y-1">
            {[
              { icon: "Bot",         label: "Подключить бота к группе", path: "/" },
              { icon: "Shield",      label: "Антиспам и модерация",      path: "/" },
              { icon: "Star",        label: "Репутация участников",      path: "/" },
              { icon: "FileText",    label: "Правила группы",            path: "/" },
            ].map((item, i) => (
              <button key={i} onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left">
                <Icon name={item.icon} size={15} className="text-muted-foreground shrink-0" />
                <span className="text-sm">{item.label}</span>
                <Icon name="ChevronRight" size={13} className="text-muted-foreground ml-auto" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
