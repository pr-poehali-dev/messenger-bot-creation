import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import AdminPricingTab    from "@/pages/admin/AdminPricingTab";
import AdminTrialTab      from "@/pages/admin/AdminTrialTab";
import AdminModerationTab from "@/pages/admin/AdminModerationTab";
import AdminStatsTab      from "@/pages/admin/AdminStatsTab";
import AdminModeratorsTab from "@/pages/admin/AdminModeratorsTab";
import AdminSupportTab    from "@/pages/admin/AdminSupportTab";

interface Plan {
  plan:      string;
  label:     string;
  price_rub: number;
  days:      number;
  badge:     string | null;
}

interface Stats {
  total: number; trial: number; active: number; expired: number; mrr: number;
}

interface BannedWord {
  word: string;
  category: string;
  created_at: string;
}

interface ModerationLogEntry {
  id: number;
  chat_id: number;
  chat_type: string;
  user_name: string;
  message_text: string;
  reason: string;
  action_taken: string;
  created_at: string;
}

interface FilterSettings {
  flood_limit: string;
  flood_window_sec: string;
  forbidden_domains: string;
  ban_on_violation: string;
  max_warnings: string;
}

export default function Admin() {
  const navigate     = useNavigate();
  const [authed,     setAuthed]     = useState(false);
  const [adminUser,  setAdminUser]  = useState<{ user_id: number; session_token: string } | null>(null);
  const [maxId,      setMaxId]      = useState("");
  const [pwError,    setPwError]    = useState("");
  const [loginLoad,  setLoginLoad]  = useState(false);
  const [plans,      setPlans]      = useState<Plan[]>([]);
  const [plansLoad,  setPlansLoad]  = useState(false);
  const [editing,    setEditing]    = useState<string | null>(null);
  const [editPrice,  setEditPrice]  = useState("");
  const [editBadge,  setEditBadge]  = useState("");
  const [saved,      setSaved]      = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<"pricing" | "stats" | "trial" | "moderation" | "moderators" | "support">("pricing");
  const [stats,      setStats]      = useState<Stats | null>(null);
  const [statsLoad,  setStatsLoad]  = useState(false);
  // trial
  const [trialDays,      setTrialDays]      = useState<number | null>(null);
  const [trialLoad,      setTrialLoad]      = useState(false);
  const [trialEditing,   setTrialEditing]   = useState(false);
  const [trialInput,     setTrialInput]     = useState("");
  const [trialSaving,    setTrialSaving]    = useState(false);
  const [trialSaved,     setTrialSaved]     = useState(false);
  const [trialError,     setTrialError]     = useState("");
  // moderation
  const [bannedWords,    setBannedWords]    = useState<BannedWord[]>([]);
  const [bannedLoad,     setBannedLoad]     = useState(false);
  const [newWord,        setNewWord]        = useState("");
  const [newWordCat,     setNewWordCat]     = useState("spam");
  const [wordSaving,     setWordSaving]     = useState(false);
  const [modLog,         setModLog]         = useState<ModerationLogEntry[]>([]);
  const [modLogLoad,     setModLogLoad]     = useState(false);
  const [modLogHours,    setModLogHours]    = useState(24);
  const [filterSettings, setFilterSettings] = useState<FilterSettings | null>(null);
  const [filterLoad,     setFilterLoad]     = useState(false);
  const [filterEditing,  setFilterEditing]  = useState(false);
  const [filterInput,    setFilterInput]    = useState<Partial<FilterSettings>>({});
  const [filterSaved,    setFilterSaved]    = useState(false);
  const [modTab,         setModTab]         = useState<"words" | "log" | "filter">("words");

  useEffect(() => {
    const stored = sessionStorage.getItem("strazh_admin_user");
    if (stored) { const u = JSON.parse(stored); setAdminUser(u); setAuthed(true); }
  }, []);

  useEffect(() => {
    if (authed) { loadPlans(); }
  }, [authed]);  

  useEffect(() => {
    if (authed && activeTab === "stats" && !stats) loadStats();
    if (authed && activeTab === "trial" && trialDays === null) loadTrialDays();
    if (authed && activeTab === "moderation") {
      if (!bannedWords.length) loadBannedWords();
      if (!filterSettings) loadFilterSettings();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authed && activeTab === "moderation" && modTab === "log") loadModLog();
  }, [modTab, modLogHours]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPlans = async () => {
    setPlansLoad(true);
    try {
      const res = await fetch("/api/strazh-auth/pricing");
      if (res.ok) { const d = await res.json(); setPlans(d.plans || []); }
    } finally { setPlansLoad(false); }
  };

  const loadStats = async () => {
    if (!adminUser) return;
    setStatsLoad(true);
    try {
      const res = await fetch(`/api/strazh-payments/stats?user_id=${adminUser.user_id}&session_token=${adminUser.session_token}`);
      if (res.ok) { const d = await res.json(); setStats(d.stats || null); }
    } finally { setStatsLoad(false); }
  };

  const loadTrialDays = async () => {
    if (!adminUser) return;
    setTrialLoad(true);
    try {
      const res = await fetch(`/api/bot-admin/trial-settings?user_id=${adminUser.user_id}&session_token=${adminUser.session_token}`);
      if (res.ok) { const d = await res.json(); setTrialDays(d.trial_days); }
    } finally { setTrialLoad(false); }
  };

  const saveTrialDays = async () => {
    if (!adminUser) return;
    const days = parseInt(trialInput);
    if (isNaN(days) || days < 1 || days > 365) {
      setTrialError("Введите число от 1 до 365");
      return;
    }
    setTrialSaving(true); setTrialError("");
    try {
      const res = await fetch("/api/bot-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:        "set_trial_days",
          user_id:       adminUser.user_id,
          session_token: adminUser.session_token,
          days,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setTrialError(d.error || "Ошибка"); return; }
      setTrialDays(days);
      setTrialEditing(false);
      setTrialSaved(true);
      setTimeout(() => setTrialSaved(false), 3000);
    } finally { setTrialSaving(false); }
  };

  const loadBannedWords = async () => {
    if (!adminUser) return;
    setBannedLoad(true);
    try {
      const res = await fetch(`/api/bot-admin/banned-words?user_id=${adminUser.user_id}&session_token=${adminUser.session_token}`);
      if (res.ok) { const d = await res.json(); setBannedWords(d.words || []); }
    } finally { setBannedLoad(false); }
  };

  const addBannedWord = async () => {
    if (!adminUser || !newWord.trim()) return;
    setWordSaving(true);
    try {
      const res = await fetch("/api/bot-admin/banned-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: adminUser.user_id,
          session_token: adminUser.session_token,
          action: "add",
          word: newWord.trim(),
          category: newWordCat,
        }),
      });
      if (res.ok) { setNewWord(""); await loadBannedWords(); }
    } finally { setWordSaving(false); }
  };

  const removeBannedWord = async (word: string) => {
    if (!adminUser) return;
    await fetch("/api/bot-admin/banned-words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: adminUser.user_id,
        session_token: adminUser.session_token,
        action: "remove",
        word,
      }),
    });
    setBannedWords(prev => prev.filter(w => w.word !== word));
  };

  const loadModLog = async () => {
    if (!adminUser) return;
    setModLogLoad(true);
    try {
      const res = await fetch(`/api/bot-admin/moderation-log?user_id=${adminUser.user_id}&session_token=${adminUser.session_token}&hours=${modLogHours}`);
      if (res.ok) { const d = await res.json(); setModLog(d.logs || []); }
    } finally { setModLogLoad(false); }
  };

  const loadFilterSettings = async () => {
    if (!adminUser) return;
    setFilterLoad(true);
    try {
      const res = await fetch(`/api/bot-admin/filter-settings?user_id=${adminUser.user_id}&session_token=${adminUser.session_token}`);
      if (res.ok) { const d = await res.json(); setFilterSettings(d.settings as FilterSettings); }
    } finally { setFilterLoad(false); }
  };

  const saveFilterSettings = async () => {
    if (!adminUser) return;
    const res = await fetch("/api/bot-admin/filter-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: adminUser.user_id,
        session_token: adminUser.session_token,
        settings: filterInput,
      }),
    });
    if (res.ok) {
      setFilterSettings(prev => ({ ...prev, ...filterInput } as FilterSettings));
      setFilterEditing(false);
      setFilterSaved(true);
      setTimeout(() => setFilterSaved(false), 3000);
    }
  };

  const login = async () => {
    if (!maxId.trim()) { setPwError("Введи свой Max ID (должен быть помечен как админ в БД)"); return; }
    const parsed = parseInt(maxId);
    if (isNaN(parsed)) { setPwError("ID должен быть числом"); return; }
    setLoginLoad(true); setPwError("");
    try {
      const res = await fetch("/api/strazh-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_user_id: parsed, max_username: "admin", max_name: "Admin" }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || "Ошибка входа"); return; }
      if (!data.is_admin) { setPwError("Нет прав администратора"); return; }
      const u = { user_id: data.user_id, session_token: data.session_token };
      sessionStorage.setItem("strazh_admin_user", JSON.stringify(u));
      setAdminUser(u); setAuthed(true);
    } catch { setPwError("Ошибка подключения"); }
    finally { setLoginLoad(false); }
  };

  const startEdit = (plan: Plan) => {
    setEditing(plan.plan);
    setEditPrice(String(plan.price_rub));
    setEditBadge(plan.badge || "");
  };

  const saveEdit = async (planKey: string) => {
    if (!adminUser) return;
    const newPlans = plans.map(p =>
      p.plan === planKey
        ? { ...p, price_rub: parseInt(editPrice) || p.price_rub, badge: editBadge || null }
        : p
    );
    setPlans(newPlans);
    setEditing(null);
    setSaved(planKey);
    try {
      await fetch("/api/strazh-auth/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: adminUser.user_id,
          session_token: adminUser.session_token,
          plan: planKey,
          price_rub: parseInt(editPrice),
          badge: editBadge || null,
        }),
      });
    } finally { setTimeout(() => setSaved(null), 2000); }
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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Твой Max ID</label>
            <input type="number" value={maxId} onChange={e => setMaxId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="123456789" className="field-input mono" />
            <p className="text-xs text-muted-foreground mt-1">Аккаунт должен иметь права admin в системе</p>
          </div>
          {pwError && <p className="text-sm text-red-400">{pwError}</p>}
          <button onClick={login} disabled={loginLoad}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-[hsl(220_16%_8%)] font-bold transition-colors">
            {loginLoad ? "Проверяю..." : "Войти"}
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
            <button onClick={() => { sessionStorage.removeItem("strazh_admin_user"); setAuthed(false); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Icon name="LogOut" size={12} />
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "pricing"    as const, label: "Тарифы" },
            { key: "trial"      as const, label: "Триал" },
            { key: "moderation" as const, label: "Модерация" },
            { key: "moderators" as const, label: "Модераторы" },
            { key: "support"    as const, label: "Запросы помощи" },
            { key: "stats"      as const, label: "Статистика" },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === t.key
                ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "pricing" && (
          <AdminPricingTab
            plans={plans}
            plansLoad={plansLoad}
            editing={editing}
            editPrice={editPrice}
            editBadge={editBadge}
            saved={saved}
            setEditing={setEditing}
            setEditPrice={setEditPrice}
            setEditBadge={setEditBadge}
            startEdit={startEdit}
            saveEdit={saveEdit}
          />
        )}

        {activeTab === "trial" && (
          <AdminTrialTab
            trialDays={trialDays}
            trialLoad={trialLoad}
            trialEditing={trialEditing}
            trialInput={trialInput}
            trialSaving={trialSaving}
            trialSaved={trialSaved}
            trialError={trialError}
            setTrialEditing={setTrialEditing}
            setTrialInput={setTrialInput}
            setTrialError={setTrialError}
            saveTrialDays={saveTrialDays}
          />
        )}

        {activeTab === "moderation" && (
          <AdminModerationTab
            modTab={modTab}
            setModTab={setModTab}
            bannedWords={bannedWords}
            bannedLoad={bannedLoad}
            newWord={newWord}
            newWordCat={newWordCat}
            wordSaving={wordSaving}
            setNewWord={setNewWord}
            setNewWordCat={setNewWordCat}
            addBannedWord={addBannedWord}
            removeBannedWord={removeBannedWord}
            loadBannedWords={loadBannedWords}
            modLog={modLog}
            modLogLoad={modLogLoad}
            modLogHours={modLogHours}
            setModLogHours={setModLogHours}
            loadModLog={loadModLog}
            filterSettings={filterSettings}
            filterLoad={filterLoad}
            filterEditing={filterEditing}
            filterInput={filterInput}
            filterSaved={filterSaved}
            setFilterEditing={setFilterEditing}
            setFilterInput={setFilterInput}
            saveFilterSettings={saveFilterSettings}
          />
        )}

        {activeTab === "moderators" && (
          <AdminModeratorsTab adminUser={adminUser} />
        )}

        {activeTab === "support" && (
          <AdminSupportTab adminUser={adminUser} />
        )}

        {activeTab === "stats" && (
          <AdminStatsTab
            stats={stats}
            statsLoad={statsLoad}
            loadStats={loadStats}
          />
        )}
      </main>
    </div>
  );
}