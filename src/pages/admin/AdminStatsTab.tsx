import Icon from "@/components/ui/icon";

interface Stats {
  total: number; trial: number; active: number; expired: number; mrr: number;
}

interface Props {
  stats:      Stats | null;
  statsLoad:  boolean;
  loadStats:  () => void;
}

export default function AdminStatsTab({ stats, statsLoad, loadStats }: Props) {
  return (
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
  );
}
