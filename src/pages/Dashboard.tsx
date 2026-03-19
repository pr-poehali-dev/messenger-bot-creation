import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

type SubStatus = "trial" | "active" | "expired" | "none";
type Tab = "subscription" | "referral" | "violations" | "lists";

interface UserData {
  max_user_id: number;
  max_username: string;
  max_name: string;
  is_admin: boolean;
  session_token?: string;
  subscription: { status: SubStatus; expires: string | null };
}

interface RefData {
  ref_code: string;
  ref_link: string;
  invited_count: number;
  total_bonus_days: number;
}

interface Violation {
  type: string;
  count: number;
}

interface ViolationsData {
  total: number;
  by_type: Violation[];
  top_violators: { user_id: number; name: string; count: number }[];
  by_day: { date: string; count: number }[];
}

interface ListEntry {
  user_id: number;
  name: string;
  added_at: string;
}

const PLANS = [
  { plan: "month",   label: "1 месяц",   price: 59,  badge: null,    per: "59 ₽/мес" },
  { plan: "quarter", label: "3 месяца",  price: 149, badge: "Выгодно", per: "≈ 50 ₽/мес" },
  { plan: "year",    label: "Год",       price: 390, badge: "-34%",  per: "≈ 33 ₽/мес" },
  { plan: "agency",  label: "Агентство", price: 990, badge: "5 групп", per: "≈ 198 ₽/группу" },
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

const LOGO = "https://cdn.poehali.dev/projects/a42d062d-9fbc-499f-a244-58736cf70e7a/files/dd4734fe-a2fe-44d2-97cf-3df5440f4a2c.jpg";

export default function Dashboard() {
  const navigate = useNavigate();
  const [step,     setStep]     = useState<"login" | "main">("login");
  const [maxId,    setMaxId]    = useState("");
  const [username, setUsername] = useState("");
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [user,     setUser]     = useState<UserData | null>(null);
  const [tab,      setTab]      = useState<Tab>("subscription");

  // Реферальная программа
  const [refData,      setRefData]      = useState<RefData | null>(null);
  const [refCopied,    setRefCopied]    = useState(false);
  const [refCode,      setRefCode]      = useState("");
  const [refApplying,  setRefApplying]  = useState(false);
  const [refMsg,       setRefMsg]       = useState("");

  // Статистика нарушений
  const [violations,    setViolations]    = useState<ViolationsData | null>(null);
  const [violDays,      setViolDays]      = useState(7);
  const [violLoading,   setViolLoading]   = useState(false);

  // White/blacklist
  const [whitelist,    setWhitelist]    = useState<ListEntry[]>([]);
  const [blacklist,    setBlacklist]    = useState<ListEntry[]>([]);
  const [listLoading,  setListLoading]  = useState(false);
  const [newUserId,    setNewUserId]    = useState("");
  const [newUserName,  setNewUserName]  = useState("");
  const [listType,     setListType]     = useState<"whitelist" | "blacklist">("whitelist");
  const [groupId,      setGroupId]      = useState("");
  const [botToken,     setBotToken]     = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("strazh_user");
    if (saved) {
      const u = JSON.parse(saved);
      setUser(u);
      setStep("main");
    }
    const savedGroup = localStorage.getItem("strazh_group_id");
    const savedToken = localStorage.getItem("strazh_bot_token");
    if (savedGroup) setGroupId(savedGroup);
    if (savedToken) setBotToken(savedToken);
  }, []);

  const login = async () => {
    if (!maxId.trim()) { setError("Введи свой ID в Макс"); return; }
    setLoading(true); setError("");
    try {
      const mockUser: UserData = {
        max_user_id:  parseInt(maxId),
        max_username: username || "user",
        max_name:     name || "Пользователь",
        is_admin:     false,
        session_token: "mock_token",
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

  const loadRefData = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/strazh-referral?user_id=${user.max_user_id}`);
      if (res.ok) setRefData(await res.json());
    } catch (_e) { /* silent */ }
  };

  const applyRefCode = async () => {
    if (!refCode.trim() || !user) return;
    setRefApplying(true); setRefMsg("");
    try {
      const res = await fetch("/api/strazh-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref_code: refCode.trim(), new_user_id: user.max_user_id }),
      });
      const data = await res.json();
      setRefMsg(res.ok ? `✅ ${data.message}` : `❌ ${data.error}`);
    } catch {
      setRefMsg("❌ Ошибка сети");
    } finally {
      setRefApplying(false);
    }
  };

  const copyRefLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2000);
  };

  const loadViolations = async (days = violDays) => {
    if (!groupId) return;
    setViolLoading(true);
    try {
      const res = await fetch(`/api/strazh-moderation/violations?group_id=${groupId}&days=${days}`);
      if (res.ok) setViolations(await res.json());
    } catch (_e) { /* silent */ } finally {
      setViolLoading(false);
    }
  };

  const loadLists = async () => {
    if (!groupId) return;
    setListLoading(true);
    try {
      const res = await fetch(`/api/strazh-moderation/lists?group_id=${groupId}`);
      if (res.ok) {
        const d = await res.json();
        setWhitelist(d.whitelist || []);
        setBlacklist(d.blacklist || []);
      }
    } catch (_e) { /* silent */ } finally {
      setListLoading(false);
    }
  };

  const addToList = async () => {
    if (!newUserId || !groupId || !botToken) return;
    await fetch("/api/strazh-moderation/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group_id: groupId, token: botToken,
        target_user_id: parseInt(newUserId), target_name: newUserName,
        list_type: listType,
      }),
    });
    setNewUserId(""); setNewUserName("");
    loadLists();
  };

  const removeFromList = async (targetId: number) => {
    if (!groupId || !botToken) return;
    await fetch("/api/strazh-moderation/lists", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId, token: botToken, target_user_id: targetId }),
    });
    loadLists();
  };

  useEffect(() => {
    if (tab === "referral" && !refData) loadRefData();
    if (tab === "violations") loadViolations();
    if (tab === "lists") loadLists();
  }, [tab]);

  // ── LOGIN ──────────────────────────────────────────────
  if (step === "login") return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
          <Icon name="ArrowLeft" size={14} />
          На главную
        </button>
        <div className="flex items-center gap-3 mb-8">
          <img src={LOGO} alt="Страж" className="w-10 h-10 rounded-xl object-cover" />
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
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Иван Иванов" className="field-input" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Ник (необязательно)</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="@username" className="field-input" />
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
  const statusLabel = sub.status === "active" ? "Активна" : sub.status === "trial" ? "Пробный период" : "Истекла";

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "subscription", label: "Подписка",  icon: "CreditCard" },
    { key: "referral",     label: "Рефералы",  icon: "Gift" },
    { key: "violations",   label: "Нарушения", icon: "ShieldAlert" },
    { key: "lists",        label: "Списки",    icon: "Users" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
            <img src={LOGO} alt="Страж" className="w-8 h-8 rounded-lg object-cover" />
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

      <main className="max-w-2xl mx-auto px-6 py-6 space-y-5">
        {/* User card */}
        <div className="p-4 rounded-2xl bg-card border border-border flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-lg font-black text-cyan-400 shrink-0">
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

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-card border border-border">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.key ? "bg-cyan-500 text-[hsl(220_16%_8%)]" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon name={t.icon} size={13} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── TAB: SUBSCRIPTION ── */}
        {tab === "subscription" && (
          <div className="space-y-4">
            <div className={`p-5 rounded-2xl border ${sub.status === "expired" ? "bg-red-500/5 border-red-500/20" : "bg-card border-border"}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-0.5">Подписка</div>
                  <div className={`text-xl font-black ${
                    sub.status === "active" ? "text-emerald-400" :
                    sub.status === "trial"  ? "text-cyan-400" : "text-red-400"
                  }`}>{statusLabel}</div>
                </div>
                {isOk && (
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-black tabular-nums">{days}</div>
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
                <p className="text-sm text-muted-foreground mb-4">Подписка истекла. Продли чтобы восстановить защиту.</p>
              )}
              {days <= 3 && isOk && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400">⚠️ Осталось мало времени — продли подписку чтобы бот не остановился</p>
                </div>
              )}
            </div>

            {/* Plans */}
            <div>
              <h3 className="font-bold mb-3">{isPaid ? "Продлить подписку" : "Выбери тариф"}</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
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
          </div>
        )}

        {/* ── TAB: REFERRAL ── */}
        {tab === "referral" && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-bold mb-1">Пригласи друга — получите по +7 дней</h3>
              <p className="text-sm text-muted-foreground mb-4">Поделись ссылкой. Когда друг зарегистрируется и введёт твой код — вы оба получите 7 бонусных дней.</p>

              {refData ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-secondary text-center">
                      <div className="text-2xl font-black text-cyan-400">{refData.invited_count}</div>
                      <div className="text-xs text-muted-foreground">приглашено</div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary text-center">
                      <div className="text-2xl font-black text-emerald-400">+{refData.total_bonus_days}</div>
                      <div className="text-xs text-muted-foreground">бонусных дней</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Твой код</div>
                    <div className="flex gap-2">
                      <div className="flex-1 px-3 py-2.5 rounded-lg bg-secondary font-mono font-bold tracking-widest text-cyan-400 text-sm">
                        {refData.ref_code}
                      </div>
                      <button onClick={() => copyRefLink(refData.ref_link)}
                        className="px-3 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] text-xs font-bold transition-colors">
                        {refCopied ? "✓" : "Копировать ссылку"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-muted-foreground text-sm">Загружаю...</div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-bold mb-1">Есть код друга?</h3>
              <p className="text-sm text-muted-foreground mb-3">Введи реферальный код и получи +7 дней</p>
              <div className="flex gap-2">
                <input value={refCode} onChange={e => setRefCode(e.target.value.toUpperCase())}
                  placeholder="ABCDEF1234" className="field-input flex-1 mono uppercase" maxLength={10} />
                <button onClick={applyRefCode} disabled={refApplying || !refCode}
                  className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] text-sm font-bold transition-colors disabled:opacity-50">
                  {refApplying ? "..." : "Применить"}
                </button>
              </div>
              {refMsg && <p className="text-sm mt-2">{refMsg}</p>}
            </div>
          </div>
        )}

        {/* ── TAB: VIOLATIONS ── */}
        {tab === "violations" && (
          <div className="space-y-4">
            {!groupId ? (
              <div className="p-5 rounded-2xl bg-card border border-border text-center">
                <Icon name="ShieldAlert" size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Сначала подключи бота к группе на главной странице</p>
                <button onClick={() => navigate("/")} className="mt-3 px-4 py-2 rounded-lg bg-cyan-500 text-[hsl(220_16%_8%)] text-sm font-bold">
                  Подключить бота
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Статистика нарушений</h3>
                  <div className="flex gap-1">
                    {[7, 14, 30].map(d => (
                      <button key={d} onClick={() => { setViolDays(d); loadViolations(d); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${violDays === d ? "bg-cyan-500 text-[hsl(220_16%_8%)]" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
                        {d}д
                      </button>
                    ))}
                  </div>
                </div>

                {violLoading ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">Загружаю...</div>
                ) : violations ? (
                  <>
                    <div className="p-4 rounded-2xl bg-card border border-border text-center">
                      <div className="text-4xl font-black text-cyan-400">{violations.total}</div>
                      <div className="text-sm text-muted-foreground">нарушений за {violDays} дней</div>
                    </div>

                    {violations.by_type.length > 0 && (
                      <div className="p-4 rounded-2xl bg-card border border-border">
                        <h4 className="text-sm font-semibold mb-3">По типам</h4>
                        <div className="space-y-2">
                          {violations.by_type.map(v => (
                            <div key={v.type} className="flex items-center gap-3">
                              <div className="text-xs text-muted-foreground flex-1 truncate">{v.type}</div>
                              <div className="text-xs font-bold tabular-nums">{v.count}</div>
                              <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className="h-full rounded-full bg-cyan-500"
                                  style={{ width: `${(v.count / violations.total) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {violations.top_violators.length > 0 && (
                      <div className="p-4 rounded-2xl bg-card border border-border">
                        <h4 className="text-sm font-semibold mb-3">Топ нарушителей</h4>
                        <div className="space-y-2">
                          {violations.top_violators.map((v, i) => (
                            <div key={v.user_id} className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                              <div className="flex-1 text-sm truncate">{v.name || `ID ${v.user_id}`}</div>
                              <div className="text-xs font-bold text-red-400">{v.count}×</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {violations.total === 0 && (
                      <div className="py-8 text-center text-muted-foreground text-sm">
                        <Icon name="CheckCircle" size={32} className="text-emerald-400 mx-auto mb-2" />
                        Нарушений не зафиксировано 
                      </div>
                    )}
                  </>
                ) : null}
              </>
            )}
          </div>
        )}

        {/* ── TAB: LISTS ── */}
        {tab === "lists" && (
          <div className="space-y-4">
            {!groupId ? (
              <div className="p-5 rounded-2xl bg-card border border-border text-center">
                <Icon name="Users" size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Сначала подключи бота к группе на главной странице</p>
                <button onClick={() => navigate("/")} className="mt-3 px-4 py-2 rounded-lg bg-cyan-500 text-[hsl(220_16%_8%)] text-sm font-bold">
                  Подключить бота
                </button>
              </div>
            ) : (
              <>
                {/* Add to list */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <h3 className="font-bold">Добавить пользователя</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setListType("whitelist")}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${listType === "whitelist" ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}>
                      ✅ Whitelist
                    </button>
                    <button onClick={() => setListType("blacklist")}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${listType === "blacklist" ? "bg-red-500 text-white" : "bg-secondary text-muted-foreground"}`}>
                      🚫 Blacklist
                    </button>
                  </div>
                  <input value={newUserId} onChange={e => setNewUserId(e.target.value)}
                    placeholder="ID пользователя в Макс" className="field-input mono" type="number" />
                  <input value={newUserName} onChange={e => setNewUserName(e.target.value)}
                    placeholder="Имя (необязательно)" className="field-input" />
                  <button onClick={addToList} disabled={!newUserId}
                    className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] text-sm font-bold transition-colors disabled:opacity-50">
                    Добавить
                  </button>
                </div>

                {/* Whitelist */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                    <Icon name="CheckCircle" size={14} /> Whitelist — доверенные ({whitelist.length})
                  </h4>
                  {listLoading ? <div className="text-xs text-muted-foreground">Загружаю...</div> :
                   whitelist.length === 0 ? <div className="text-xs text-muted-foreground">Список пуст</div> :
                   <div className="space-y-1">
                     {whitelist.map(u => (
                       <div key={u.user_id} className="flex items-center gap-2 py-1.5">
                         <div className="flex-1 text-sm">{u.name || `ID ${u.user_id}`}</div>
                         <div className="text-xs text-muted-foreground mono">{u.user_id}</div>
                         <button onClick={() => removeFromList(u.user_id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                           <Icon name="X" size={12} />
                         </button>
                       </div>
                     ))}
                   </div>
                  }
                </div>

                {/* Blacklist */}
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                    <Icon name="Ban" size={14} /> Blacklist — заблокированные ({blacklist.length})
                  </h4>
                  {listLoading ? <div className="text-xs text-muted-foreground">Загружаю...</div> :
                   blacklist.length === 0 ? <div className="text-xs text-muted-foreground">Список пуст</div> :
                   <div className="space-y-1">
                     {blacklist.map(u => (
                       <div key={u.user_id} className="flex items-center gap-2 py-1.5">
                         <div className="flex-1 text-sm">{u.name || `ID ${u.user_id}`}</div>
                         <div className="text-xs text-muted-foreground mono">{u.user_id}</div>
                         <button onClick={() => removeFromList(u.user_id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                           <Icon name="X" size={12} />
                         </button>
                       </div>
                     ))}
                   </div>
                  }
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}