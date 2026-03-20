import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";

const PLAN_LABELS: Record<string, string> = {
  month:   "1 месяц",
  quarter: "3 месяца",
  year:    "Год",
};

const YOOMONEY_WALLET = "4100119496701354";

type Stage = "confirm" | "waiting" | "success" | "error";

export default function Pay() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();

  const plan    = params.get("plan")    || "month";
  const label   = PLAN_LABELS[plan]    || plan;

  const user    = (() => { try { return JSON.parse(localStorage.getItem("strazh_user") || "{}"); } catch { return {}; } })();
  const userId  = user?.max_user_id;

  const [stage,    setStage]   = useState<Stage>("confirm");
  const [copied,   setCopied]  = useState(false);
  const [seconds,  setSeconds] = useState(0);
  const [amount,   setAmount]  = useState(params.get("amount") || "59");
  const [orderId,  setOrderId] = useState(params.get("order_id") || "");
  const [ymUrl,    setYmUrl]   = useState("");
  const [initDone, setInitDone] = useState(false);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // При загрузке — создать платёж через API
  useEffect(() => {
    const init = async () => {
      if (orderId) {
        // Пришли с уже созданным order_id — просто восстанавливаем YM-ссылку
        const comment = `Страж: подписка ${label}, ID ${userId}`;
        setYmUrl(`https://yoomoney.ru/quickpay/confirm.xml?receiver=${YOOMONEY_WALLET}&quickpay-form=button&targets=${encodeURIComponent(comment)}&paymentType=AC&sum=${amount}&label=${encodeURIComponent(orderId)}`);
        setInitDone(true);
        return;
      }
      if (!userId || !plan) { setStage("error"); return; }
      try {
        const res = await fetch("/api/strazh-payments/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, plan }),
        });
        if (!res.ok) { setStage("error"); return; }
        const data = await res.json();
        setOrderId(data.order_id);
        setAmount(String(data.amount_rub));
        const comment = `Страж: подписка ${label}, ID ${userId}`;
        setYmUrl(`https://yoomoney.ru/quickpay/confirm.xml?receiver=${YOOMONEY_WALLET}&quickpay-form=button&targets=${encodeURIComponent(comment)}&paymentType=AC&sum=${data.amount_rub}&label=${encodeURIComponent(data.order_id)}`);
        setInitDone(true);
      } catch { setStage("error"); }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openPayment = () => {
    window.open(ymUrl, "_blank");
    setStage("waiting");
    setSeconds(0);
  };

  // Таймер ожидания
  useEffect(() => {
    if (stage !== "waiting") return;
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage]);

  // Автопроверка статуса каждые 5 секунд
  useEffect(() => {
    if (stage !== "waiting") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const check = async () => {
      if (!orderId) return;
      try {
        const res = await fetch("/api/strazh-payments/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "active") {
          const updated = { ...user, subscription: { status: "active", expires: data.expires } };
          localStorage.setItem("strazh_user", JSON.stringify(updated));
          setStage("success");
        }
      } catch { /* ждём следующей попытки */ }
    };

    pollRef.current = setInterval(check, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [stage, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── CONFIRM ──────────────────────────────────────────
  if (stage === "confirm") return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
          <Icon name="ArrowLeft" size={14} /> Назад
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-xl">⚔️</div>
          <div>
            <div className="font-black text-lg">Оплата</div>
            <div className="text-xs text-muted-foreground">через ЮMoney</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border mb-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Тариф</span>
            <span className="font-semibold">{label}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Сумма</span>
            <span className="text-2xl font-black text-cyan-400">{amount} ₽</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Назначение</span>
            <span className="text-xs text-muted-foreground text-right max-w-[180px] truncate">Страж: подписка {label}, ID {userId}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Номер заказа</span>
            {initDone ? (
              <button onClick={() => copy(orderId)} className="mono text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                {orderId.slice(0, 18)}
                <Icon name={copied ? "Check" : "Copy"} size={11} />
              </button>
            ) : (
              <span className="text-xs text-muted-foreground animate-pulse">Создаём заказ...</span>
            )}
          </div>
        </div>

        <button onClick={openPayment} disabled={!initDone}
          className="block w-full py-4 rounded-xl bg-[#8B3FFD] hover:bg-[#7A35E0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-center transition-colors mb-3">
          {initDone ? "Оплатить через ЮMoney" : "Подготовка платежа..."}
        </button>

        <button onClick={() => navigate("/dashboard")}
          className="w-full py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
          Отмена
        </button>

        <div className="mt-5 space-y-2">
          {[
            { icon: "Lock",      text: "Платёж защищён шифрованием ЮMoney" },
            { icon: "Zap",       text: "Подписка активируется автоматически после оплаты" },
            { icon: "RefreshCw", text: "Не устраивает — напиши в поддержку, вернём деньги" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <Icon name={item.icon} size={12} className="text-cyan-400 shrink-0" />
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── WAITING ───────────────────────────────────────────
  if (stage === "waiting") return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
        <h2 className="text-xl font-black mb-2">Ожидаем оплату</h2>
        <p className="text-muted-foreground text-sm mb-1">Оплати в открывшейся вкладке ЮMoney</p>
        <p className="text-muted-foreground text-sm mb-6">Подписка активируется автоматически</p>

        <div className="mono text-3xl font-black text-cyan-400 mb-6">{fmt(seconds)}</div>

        <div className="p-4 rounded-xl bg-card border border-border mb-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Тариф</span>
            <span className="font-semibold">{label}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Сумма</span>
            <span className="font-black text-cyan-400">{amount} ₽</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Заказ</span>
            <span className="mono text-xs">{orderId.slice(0, 18)}</span>
          </div>
        </div>

        <button onClick={openPayment}
          className="w-full py-3 rounded-xl bg-[#8B3FFD]/20 border border-[#8B3FFD]/30 text-[#A855F7] text-sm font-semibold hover:bg-[#8B3FFD]/30 transition-colors mb-3">
          Открыть ЮMoney снова
        </button>
        <button onClick={() => navigate("/dashboard")}
          className="w-full py-2.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
          Отмена
        </button>

        <p className="text-xs text-muted-foreground mt-4">
          Проверяем статус каждые 5 секунд автоматически
        </p>
      </div>
    </div>
  );

  // ── SUCCESS ───────────────────────────────────────────
  if (stage === "success") return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <Icon name="Check" size={36} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black mb-2">Оплата прошла!</h2>
        <p className="text-muted-foreground mb-2">Тариф <span className="font-semibold text-foreground">{label}</span> активирован</p>
        <p className="text-muted-foreground text-sm mb-8">Страж снова на посту и охраняет твою группу</p>
        <button onClick={() => navigate("/dashboard")}
          className="w-full py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] font-black transition-colors">
          В личный кабинет
        </button>
      </div>
    </div>
  );

  // ── ERROR ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Icon name="X" size={28} className="text-red-400" />
        </div>
        <h2 className="text-xl font-black mb-2">Что-то пошло не так</h2>
        <p className="text-muted-foreground text-sm mb-6">Если деньги списались — напиши в поддержку, разберёмся</p>
        <button onClick={() => navigate("/dashboard")}
          className="w-full py-3 rounded-xl bg-card border border-border text-sm font-semibold hover:bg-secondary transition-colors">
          В личный кабинет
        </button>
      </div>
    </div>
  );
}