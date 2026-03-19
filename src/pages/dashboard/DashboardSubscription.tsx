import { useNavigate } from "react-router-dom";
import { SubStatus, PLANS, daysLeft, formatDate } from "./DashboardTypes";

interface Props {
  status: SubStatus;
  expires: string | null;
}

export default function DashboardSubscription({ status, expires }: Props) {
  const navigate = useNavigate();
  const days   = daysLeft(expires);
  const isOk   = status === "trial" || status === "active";
  const isPaid = status === "active";
  const statusLabel = status === "active" ? "Активна" : status === "trial" ? "Пробный период" : "Истекла";

  return (
    <div className="space-y-4">
      <div className={`p-5 rounded-2xl border ${status === "expired" ? "bg-red-500/5 border-red-500/20" : "bg-card border-border"}`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-semibold text-muted-foreground mb-0.5">Подписка</div>
            <div className={`text-xl font-black ${
              status === "active" ? "text-emerald-400" :
              status === "trial"  ? "text-cyan-400" : "text-red-400"
            }`}>{statusLabel}</div>
          </div>
          {isOk && (
            <div className="text-right shrink-0">
              <div className="text-3xl font-black tabular-nums">{days}</div>
              <div className="text-xs text-muted-foreground">{days === 1 ? "день" : days < 5 ? "дня" : "дней"}</div>
            </div>
          )}
        </div>

        {isOk && expires && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>До {formatDate(expires)}</span>
              <span>{days} дн.</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-cyan-500 transition-all"
                style={{ width: `${Math.min(100, (days / (isPaid ? 30 : 7)) * 100)}%` }} />
            </div>
          </div>
        )}

        {status === "expired" && (
          <p className="text-sm text-muted-foreground mb-4">Подписка истекла. Продли чтобы восстановить защиту.</p>
        )}
        {days <= 3 && isOk && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400">⚠️ Осталось мало времени — продли подписку чтобы бот не остановился</p>
          </div>
        )}
      </div>

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
  );
}
