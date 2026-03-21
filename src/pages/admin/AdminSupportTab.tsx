import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface SupportRequest {
  id:                 number;
  user_id:            number;
  username:           string;
  request_type:       string;
  description:        string;
  status:             string;
  assigned_moderator: number | null;
  created_at:         string;
  resolved_at:        string | null;
}

interface Props {
  adminUser: { user_id: number; session_token: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
  technical: "Техническая проблема",
  feature:   "Вопрос по функционалу",
  complaint: "Жалоба на контент",
  other:     "Другое",
};

const STATUS_STYLES: Record<string, string> = {
  new:         "bg-cyan-500/10 text-cyan-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  resolved:    "bg-emerald-500/10 text-emerald-400",
};

export default function AdminSupportTab({ adminUser }: Props) {
  const [requests,    setRequests]    = useState<SupportRequest[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | "new" | "in_progress" | "resolved">("");
  const [replyId,     setReplyId]     = useState<number | null>(null);
  const [replyText,   setReplyText]   = useState("");
  const [replySending, setReplySending] = useState(false);
  const [actionDone,  setActionDone]  = useState<number | null>(null);

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    if (!adminUser) return;
    setLoading(true);
    try {
      const sf = statusFilter ? `&status=${statusFilter}` : "";
      const res = await fetch(
        `/api/bot-admin/support?user_id=${adminUser.user_id}&session_token=${adminUser.session_token}${sf}`
      );
      if (res.ok) { const d = await res.json(); setRequests(d.requests || []); }
    } finally { setLoading(false); }
  };

  const doAction = async (action: string, reqId: number, extra: Record<string, string> = {}) => {
    if (!adminUser) return;
    const res = await fetch("/api/bot-admin/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id:       adminUser.user_id,
        session_token: adminUser.session_token,
        action,
        request_id:    reqId,
        ...extra,
      }),
    });
    if (res.ok) {
      setActionDone(reqId);
      setTimeout(() => setActionDone(null), 2000);
      await load();
    }
  };

  const sendReply = async (reqId: number) => {
    if (!replyText.trim()) return;
    setReplySending(true);
    try {
      await doAction("reply", reqId, { reply_text: replyText });
      setReplyId(null);
      setReplyText("");
    } finally { setReplySending(false); }
  };

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Статус:</span>
        {([
          { key: "" as const,             label: "Все открытые" },
          { key: "new" as const,          label: "Новые" },
          { key: "in_progress" as const,  label: "В работе" },
          { key: "resolved" as const,     label: "Закрытые" },
        ] as { key: "" | "new" | "in_progress" | "resolved"; label: string }[]).map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${statusFilter === f.key
              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
              : "bg-secondary border border-border text-muted-foreground hover:text-foreground"}`}>
            {f.label}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <Icon name="RefreshCw" size={11} /> Обновить
        </button>
      </div>

      {/* Список */}
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Загружаю запросы...</div>
      ) : requests.length === 0 ? (
        <div className="p-8 rounded-xl bg-card border border-border text-center text-sm text-muted-foreground">
          {statusFilter === "resolved" ? "Закрытых запросов нет" : "Открытых запросов нет — всё спокойно ✅"}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
              {/* Заголовок */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground font-mono">#{r.id}</span>
                    <span className="text-sm font-semibold">@{r.username || r.user_id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_STYLES[r.status] || "bg-secondary text-muted-foreground"}`}>
                      {r.status === "new" ? "Новый" : r.status === "in_progress" ? "В работе" : "Закрыт"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {TYPE_LABELS[r.request_type] || r.request_type} ·{" "}
                    {new Date(r.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                {actionDone === r.id && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Icon name="Check" size={12} /> Готово
                  </span>
                )}
              </div>

              {/* Описание */}
              <div className="text-sm bg-secondary/50 px-3 py-2 rounded-lg text-muted-foreground">
                {r.description}
              </div>

              {/* Действия */}
              {r.status !== "resolved" && (
                <div className="flex gap-2 flex-wrap">
                  {r.status === "new" && (
                    <button
                      onClick={() => doAction("assign", r.id)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 transition-colors flex items-center gap-1"
                    >
                      <Icon name="UserCheck" size={12} /> Взять в работу
                    </button>
                  )}
                  <button
                    onClick={() => { setReplyId(r.id === replyId ? null : r.id); setReplyText(""); }}
                    className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Icon name="MessageSquare" size={12} /> Ответить
                  </button>
                  <button
                    onClick={() => doAction("close", r.id)}
                    className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Icon name="CheckCircle" size={12} /> Закрыть
                  </button>
                </div>
              )}

              {/* Форма ответа */}
              {replyId === r.id && (
                <div className="space-y-2 pt-1">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Введите ответ пользователю..."
                    rows={3}
                    className="field-input w-full text-sm resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setReplyId(null); setReplyText(""); }}
                      className="flex-1 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => sendReply(r.id)}
                      disabled={replySending || !replyText.trim()}
                      className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-[hsl(220_16%_8%)] text-xs font-bold transition-colors"
                    >
                      {replySending ? "Отправляю..." : "Отправить ответ"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Всего в очереди: {requests.length}. При ответе пользователь получит уведомление в боте.
      </p>
    </div>
  );
}
