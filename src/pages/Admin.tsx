import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

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
  const [activeTab,  setActiveTab]  = useState<"pricing" | "stats" | "trial" | "moderation">("pricing");
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

            {plansLoad && <div className="py-6 text-center text-muted-foreground text-sm animate-pulse">Загружаю тарифы...</div>}
            {!plansLoad && plans.length === 0 && (
              <div className="p-4 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground">Тарифы не загружены</div>
            )}
          </div>
        )}

        {/* TRIAL TAB */}
        {activeTab === "trial" && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold mb-1">Длительность пробного периода</div>
                  <div className="text-xs text-muted-foreground max-w-xs">
                    Применяется только к новым пользователям. Существующие подписки не изменятся.
                  </div>
                </div>
                {trialSaved && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Icon name="Check" size={12} /> Сохранено
                  </span>
                )}
              </div>

              {trialLoad ? (
                <div className="py-4 text-center text-muted-foreground text-sm animate-pulse">Загружаю...</div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="text-5xl font-black text-cyan-400 tabular-nums">
                      {trialDays ?? "—"}
                    </div>
                    <div className="text-muted-foreground text-sm">дней</div>
                  </div>

                  {!trialEditing ? (
                    <button
                      onClick={() => { setTrialInput(String(trialDays ?? 7)); setTrialEditing(true); setTrialError(""); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-colors"
                    >
                      <Icon name="Pencil" size={14} />
                      Изменить длительность
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1.5">
                          Новое количество дней (1–365)
                        </label>
                        <input
                          type="number"
                          value={trialInput}
                          onChange={e => setTrialInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && saveTrialDays()}
                          min={1} max={365}
                          className="field-input mono"
                          autoFocus
                        />
                      </div>
                      {trialError && (
                        <p className="text-sm text-red-400">{trialError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setTrialEditing(false); setTrialError(""); }}
                          className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={saveTrialDays}
                          disabled={trialSaving}
                          className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-[hsl(220_16%_8%)] text-sm font-bold transition-colors"
                        >
                          {trialSaving ? "Сохраняю..." : "Сохранить"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Пояснение */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <Icon name="Info" size={13} />
                Как работает пробный период
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 pl-1">
                <li>• Привязан к уникальному ID пользователя в мессенджере Max</li>
                <li>• Новый аккаунт с тем же именем не обнуляет счётчик</li>
                <li>• Доступ к платным функциям автоматически блокируется после истечения</li>
                <li>• Пользователь получает уведомление за 3 дня и за 1 день до конца</li>
                <li>• Для тестирования рекомендуем 31 день, для продакшна — 7–14 дней</li>
              </ul>
            </div>
          </div>
        )}

        {/* MODERATION TAB */}
        {activeTab === "moderation" && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              {[
                { key: "words"  as const, label: "Запрещённые слова" },
                { key: "log"    as const, label: "История" },
                { key: "filter" as const, label: "Настройки фильтра" },
              ].map(t => (
                <button key={t.key} onClick={() => setModTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${modTab === t.key
                    ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                    : "bg-secondary border border-border text-muted-foreground hover:text-foreground"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* BANNED WORDS */}
            {modTab === "words" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Слова добавляются в глобальный фильтр. Бот удаляет сообщения, содержащие эти слова, во всех чатах где включена модерация.
                </p>

                {/* Add word */}
                <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <div className="text-sm font-semibold">Добавить слово</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newWord}
                      onChange={e => setNewWord(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addBannedWord()}
                      placeholder="Введите слово или фразу..."
                      className="field-input flex-1"
                    />
                    <select
                      value={newWordCat}
                      onChange={e => setNewWordCat(e.target.value)}
                      className="field-input w-32"
                    >
                      <option value="spam">Спам</option>
                      <option value="insult">Оскорбление</option>
                      <option value="link">Ссылка</option>
                    </select>
                    <button
                      onClick={addBannedWord}
                      disabled={wordSaving || !newWord.trim()}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-[hsl(220_16%_8%)] text-sm font-bold transition-colors"
                    >
                      <Icon name="Plus" size={16} />
                    </button>
                  </div>
                </div>

                {/* Words list */}
                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">Список ({bannedWords.length})</div>
                    <button onClick={loadBannedWords} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <Icon name="RefreshCw" size={11} /> Обновить
                    </button>
                  </div>
                  {bannedLoad ? (
                    <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">Загружаю...</div>
                  ) : bannedWords.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">Список пуст</div>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {bannedWords.map(w => (
                        <div key={w.word} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">{w.word}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              w.category === "spam" ? "bg-yellow-500/10 text-yellow-400" :
                              w.category === "insult" ? "bg-red-500/10 text-red-400" :
                              "bg-blue-500/10 text-blue-400"
                            }`}>{w.category}</span>
                          </div>
                          <button
                            onClick={() => removeBannedWord(w.word)}
                            className="text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <Icon name="X" size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODERATION LOG */}
            {modTab === "log" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">За последние:</span>
                  {[6, 24, 72].map(h => (
                    <button key={h} onClick={() => setModLogHours(h)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${modLogHours === h
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                        : "bg-secondary border border-border text-muted-foreground"}`}>
                      {h === 6 ? "6 ч" : h === 24 ? "24 ч" : "3 дня"}
                    </button>
                  ))}
                  <button onClick={loadModLog} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Icon name="RefreshCw" size={11} /> Обновить
                  </button>
                </div>

                {modLogLoad ? (
                  <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Загружаю историю...</div>
                ) : modLog.length === 0 ? (
                  <div className="p-8 rounded-xl bg-card border border-border text-center text-sm text-muted-foreground">
                    Нарушений не зафиксировано
                  </div>
                ) : (
                  <div className="space-y-2">
                    {modLog.map(entry => (
                      <div key={entry.id} className="p-4 rounded-xl bg-card border border-border space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{entry.user_name || "Аноним"}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              entry.reason === "spam" ? "bg-yellow-500/10 text-yellow-400" :
                              entry.reason === "insult" ? "bg-red-500/10 text-red-400" :
                              entry.reason === "link" ? "bg-blue-500/10 text-blue-400" :
                              "bg-orange-500/10 text-orange-400"
                            }`}>{entry.reason}</span>
                            <span className="text-xs text-muted-foreground">{entry.chat_type}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-1.5 rounded line-clamp-2">
                          «{entry.message_text}»
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FILTER SETTINGS */}
            {modTab === "filter" && (
              <div className="space-y-3">
                {filterLoad ? (
                  <div className="py-6 text-center text-sm text-muted-foreground animate-pulse">Загружаю...</div>
                ) : filterSettings && (
                  <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">Параметры фильтрации</div>
                      <div className="flex items-center gap-2">
                        {filterSaved && <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1"><Icon name="Check" size={12} /> Сохранено</span>}
                        {!filterEditing ? (
                          <button
                            onClick={() => { setFilterInput({ ...filterSettings }); setFilterEditing(true); }}
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <Icon name="Pencil" size={12} /> Изменить
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => setFilterEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">Отмена</button>
                            <button onClick={saveFilterSettings} className="text-xs text-cyan-400 font-semibold hover:text-cyan-300">Сохранить</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {[
                      { key: "flood_limit" as const, label: "Лимит сообщений (флуд)", hint: "сообщений за период" },
                      { key: "flood_window_sec" as const, label: "Окно антифлуда", hint: "секунд" },
                      { key: "max_warnings" as const, label: "Максимум предупреждений", hint: "до блокировки" },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <div className="text-sm">{f.label}</div>
                          <div className="text-xs text-muted-foreground">{f.hint}</div>
                        </div>
                        {filterEditing ? (
                          <input
                            type="number"
                            value={filterInput[f.key] ?? filterSettings[f.key]}
                            onChange={e => setFilterInput(prev => ({ ...prev, [f.key]: e.target.value }))}
                            className="field-input w-24 text-right mono"
                          />
                        ) : (
                          <span className="font-mono text-lg font-bold text-cyan-400">{filterSettings[f.key]}</span>
                        )}
                      </div>
                    ))}

                    <div className="py-2 border-t border-border">
                      <div className="text-sm mb-2">Запрещённые домены</div>
                      {filterEditing ? (
                        <textarea
                          value={filterInput.forbidden_domains ?? filterSettings.forbidden_domains}
                          onChange={e => setFilterInput(prev => ({ ...prev, forbidden_domains: e.target.value }))}
                          placeholder='["bit.ly","tinyurl.com"]'
                          className="field-input w-full text-xs mono h-20 resize-none"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {JSON.parse(filterSettings.forbidden_domains || "[]").map((d: string) => (
                            <span key={d} className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-mono">{d}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            {statsLoad ? (
              <div className="py-10 text-center text-muted-foreground text-sm animate-pulse">Загружаю статистику...</div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Всего пользователей", val: stats.total,   icon: "Users",   color: "text-foreground"  },
                    { label: "Активных подписок",   val: stats.active,  icon: "Check",   color: "text-emerald-400" },
                    { label: "На триале",           val: stats.trial,   icon: "Clock",   color: "text-cyan-400"    },
                    { label: "Истекших",            val: stats.expired, icon: "XCircle", color: "text-red-400"     },
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
                  <div className="text-xs text-muted-foreground mb-1">Выручка за 30 дней</div>
                  <div className="text-4xl font-black text-cyan-400">{stats.mrr.toLocaleString("ru-RU")} ₽</div>
                </div>
                <button onClick={loadStats} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                  <Icon name="RefreshCw" size={11} /> Обновить
                </button>
              </>
            ) : (
              <div className="py-10 text-center text-muted-foreground text-sm">Не удалось загрузить статистику</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}