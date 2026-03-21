import { useState } from "react";
import Icon from "@/components/ui/icon";

interface Moderator {
  user_id:     number;
  username:    string;
  assigned_by: number;
  assigned_at: string;
}

interface Props {
  adminUser: { user_id: number; session_token: string } | null;
}

export default function AdminModeratorsTab({ adminUser }: Props) {
  const [mods,       setMods]       = useState<Moderator[]>([]);
  const [loaded,     setLoaded]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [newUid,     setNewUid]     = useState("");
  const [newUname,   setNewUname]   = useState("");
  const [adding,     setAdding]     = useState(false);
  const [addError,   setAddError]   = useState("");
  const [saved,      setSaved]      = useState("");

  const load = async () => {
    if (!adminUser) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/bot-admin/moderators?user_id=${adminUser.user_id}&session_token=${adminUser.session_token}`
      );
      if (res.ok) { const d = await res.json(); setMods(d.moderators || []); setLoaded(true); }
    } finally { setLoading(false); }
  };

  const addMod = async () => {
    if (!adminUser || !newUid.trim()) return;
    const uid = parseInt(newUid);
    if (isNaN(uid)) { setAddError("ID должен быть числом"); return; }
    setAdding(true); setAddError("");
    try {
      const res = await fetch("/api/bot-admin/moderators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:           adminUser.user_id,
          session_token:     adminUser.session_token,
          action:            "add",
          target_user_id:    uid,
          target_username:   newUname.trim(),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setAddError(d.error || "Ошибка"); return; }
      setNewUid(""); setNewUname("");
      setSaved("add");
      setTimeout(() => setSaved(""), 2000);
      await load();
    } finally { setAdding(false); }
  };

  const removeMod = async (target_uid: number) => {
    if (!adminUser) return;
    await fetch("/api/bot-admin/moderators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id:        adminUser.user_id,
        session_token:  adminUser.session_token,
        action:         "remove",
        target_user_id: target_uid,
      }),
    });
    setMods(prev => prev.filter(m => m.user_id !== target_uid));
  };

  if (!loaded) return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Модераторы получают доступ к очереди запросов помощи и могут отвечать пользователям.
      </p>
      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-semibold hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
      >
        <Icon name="Users" size={14} />
        {loading ? "Загружаю..." : "Загрузить список модераторов"}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Модераторы получают доступ к очереди запросов помощи и командам /support_queue, /assign_request, /reply_to_user в боте.
      </p>

      {/* Добавить модератора */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="text-sm font-semibold">Назначить модератора</div>
        <div className="flex gap-2">
          <input
            type="number"
            value={newUid}
            onChange={e => setNewUid(e.target.value)}
            placeholder="User ID (число)"
            className="field-input w-40 mono"
          />
          <input
            type="text"
            value={newUname}
            onChange={e => setNewUname(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addMod()}
            placeholder="@username (необязательно)"
            className="field-input flex-1"
          />
          <button
            onClick={addMod}
            disabled={adding || !newUid.trim()}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-[hsl(220_16%_8%)] text-sm font-bold transition-colors flex items-center gap-1.5"
          >
            {saved === "add"
              ? <><Icon name="Check" size={14} /> Добавлен</>
              : <><Icon name="UserPlus" size={14} /> Добавить</>
            }
          </button>
        </div>
        {addError && <p className="text-sm text-red-400">{addError}</p>}
        <p className="text-xs text-muted-foreground">
          Бот отправит пользователю уведомление о назначении через Max.
        </p>
      </div>

      {/* Список модераторов */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Список ({mods.length})</div>
          <button onClick={load} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Icon name="RefreshCw" size={11} /> Обновить
          </button>
        </div>
        {loading ? (
          <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">Загружаю...</div>
        ) : mods.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">Модераторов нет</div>
        ) : (
          <div className="space-y-1.5">
            {mods.map(m => (
              <div key={m.user_id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Icon name="Shield" size={14} className="text-cyan-400" />
                  <span className="text-sm font-mono">{m.user_id}</span>
                  {m.username && <span className="text-sm text-muted-foreground">@{m.username}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.assigned_at).toLocaleDateString("ru-RU")}
                  </span>
                  <button
                    onClick={() => removeMod(m.user_id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                    title="Снять модератора"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Права модератора */}
      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
          <Icon name="Info" size={13} />
          Права модератора
        </div>
        <ul className="text-xs text-muted-foreground space-y-1 pl-1">
          <li>• Просмотр и обработка очереди запросов помощи</li>
          <li>• Ответы пользователям через бота</li>
          <li>• Закрытие решённых обращений</li>
          <li>• Назначать других модераторов может только владелец</li>
        </ul>
      </div>
    </div>
  );
}
