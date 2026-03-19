import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { UserData, RefData, ViolationsData, ListEntry, Tab, LOGO } from "./dashboard/DashboardTypes";
import DashboardLogin from "./dashboard/DashboardLogin";
import DashboardSubscription from "./dashboard/DashboardSubscription";
import DashboardReferral from "./dashboard/DashboardReferral";
import DashboardModeration from "./dashboard/DashboardModeration";

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
  const [refData,     setRefData]     = useState<RefData | null>(null);
  const [refCopied,   setRefCopied]   = useState(false);
  const [refCode,     setRefCode]     = useState("");
  const [refApplying, setRefApplying] = useState(false);
  const [refMsg,      setRefMsg]      = useState("");

  // Статистика нарушений
  const [violations,  setViolations]  = useState<ViolationsData | null>(null);
  const [violDays,    setViolDays]    = useState(7);
  const [violLoading, setViolLoading] = useState(false);

  // White/blacklist
  const [whitelist,   setWhitelist]   = useState<ListEntry[]>([]);
  const [blacklist,   setBlacklist]   = useState<ListEntry[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [newUserId,   setNewUserId]   = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [listType,    setListType]    = useState<"whitelist" | "blacklist">("whitelist");
  const [groupId,     setGroupId]     = useState("");
  const [botToken,    setBotToken]    = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("strazh_user");
    if (saved) { const u = JSON.parse(saved); setUser(u); setStep("main"); }
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
        max_user_id:   parseInt(maxId),
        max_username:  username || "user",
        max_name:      name || "Пользователь",
        is_admin:      false,
        session_token: "mock_token",
        subscription:  { status: "trial", expires: new Date(Date.now() + 7 * 86400000).toISOString() },
      };
      localStorage.setItem("strazh_user", JSON.stringify(mockUser));
      setUser(mockUser); setStep("main");
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
      body: JSON.stringify({ group_id: groupId, token: botToken, target_user_id: parseInt(newUserId), target_name: newUserName, list_type: listType }),
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
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── LOGIN ──────────────────────────────────────────────
  if (step === "login") return (
    <DashboardLogin
      maxId={maxId} setMaxId={setMaxId}
      username={username} setUsername={setUsername}
      name={name} setName={setName}
      loading={loading} error={error}
      onLogin={login}
      onBack={() => navigate("/")}
    />
  );

  // ── MAIN DASHBOARD ─────────────────────────────────────
  if (!user) return null;
  const sub = user.subscription;
  const statusLabel = sub.status === "active" ? "Активна" : sub.status === "trial" ? "Пробный период" : "Истекла";

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "subscription", label: "Подписка",  icon: "CreditCard" },
    { key: "referral",     label: "Рефералы",  icon: "Gift" },
    { key: "violations",   label: "Нарушения", icon: "ShieldAlert" },
    { key: "lists",        label: "Списки",    icon: "Users" },
  ];

  return (
    <div className="min-h-screen bg-background">
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

        {tab === "subscription" && (
          <DashboardSubscription status={sub.status} expires={sub.expires} />
        )}

        {tab === "referral" && (
          <DashboardReferral
            refData={refData}
            refCopied={refCopied}
            refCode={refCode} setRefCode={setRefCode}
            refApplying={refApplying}
            refMsg={refMsg}
            onCopyLink={copyRefLink}
            onApply={applyRefCode}
          />
        )}

        {(tab === "violations" || tab === "lists") && (
          <DashboardModeration
            activeTab={tab}
            groupId={groupId}
            violations={violations}
            violDays={violDays}
            violLoading={violLoading}
            onSetViolDays={(d) => { setViolDays(d); loadViolations(d); }}
            whitelist={whitelist}
            blacklist={blacklist}
            listLoading={listLoading}
            newUserId={newUserId} setNewUserId={setNewUserId}
            newUserName={newUserName} setNewUserName={setNewUserName}
            listType={listType} setListType={setListType}
            onAddToList={addToList}
            onRemoveFromList={removeFromList}
          />
        )}
      </main>
    </div>
  );
}
