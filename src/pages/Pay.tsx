import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "@/components/ui/icon";

const PLAN_LABELS: Record<string, string> = {
  month:   "1 месяц",
  quarter: "3 месяца",
  year:    "Год",
};

// ЮMoney quickpay форма — стандартный способ приёма платежей без регистрации юрлица
// После регистрации в ЮMoney замените YOOMONEY_WALLET на ваш номер кошелька
const YOOMONEY_WALLET = "4100119496701354";

export default function Pay() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const plan       = params.get("plan")   || "month";
  const amount     = params.get("amount") || "59";
  const orderId    = params.get("order_id") || `STRAZH-${Date.now()}`;
  const label      = PLAN_LABELS[plan] || plan;

  const [copied, setCopied] = useState(false);
  const user = (() => { try { return JSON.parse(localStorage.getItem("strazh_user") || "{}"); } catch { return {}; } })();
  const userId = user?.max_user_id || "unknown";

  const comment = `Страж: подписка ${label}, ID ${userId}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Формируем ссылку ЮMoney quickpay
  const ymUrl = `https://yoomoney.ru/quickpay/confirm.xml?receiver=${YOOMONEY_WALLET}&quickpay-form=button&targets=${encodeURIComponent(comment)}&paymentType=AC&sum=${amount}&label=${encodeURIComponent(orderId)}`;

  const isConfigured = YOOMONEY_WALLET !== "ВАШ_НОМЕР_КОШЕЛЬКА";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
          <Icon name="ArrowLeft" size={14} />
          Назад
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-xl">⚔️</div>
          <div>
            <div className="font-black text-lg">Оплата</div>
            <div className="text-xs text-muted-foreground">через ЮMoney</div>
          </div>
        </div>

        {/* Сводка */}
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
            <span className="text-xs text-muted-foreground text-right max-w-[180px] truncate">{comment}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Номер заказа</span>
            <button onClick={() => copy(orderId)} className="mono text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              {orderId.slice(0, 16)}...
              <Icon name={copied ? "Check" : "Copy"} size={11} />
            </button>
          </div>
        </div>

        {/* Кнопка оплаты */}
        {isConfigured ? (
          <a href={ymUrl} target="_blank" rel="noreferrer"
            className="block w-full py-4 rounded-xl bg-[#8B3FFD] hover:bg-[#7A35E0] text-white font-bold text-center transition-colors mb-3">
            Оплатить через ЮMoney
          </a>
        ) : (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3">
            <p className="text-sm text-amber-400 font-semibold mb-1">ЮMoney ещё не подключён</p>
            <p className="text-xs text-amber-400/80">
              Зарегистрируй кошелёк на yoomoney.ru и укажи номер в настройках. Займёт 5 минут.
            </p>
          </div>
        )}

        <button onClick={() => navigate("/dashboard")}
          className="w-full py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
          Отмена
        </button>

        <div className="mt-5 space-y-2">
          {[
            { icon: "Lock",    text: "Платёж защищён шифрованием ЮMoney" },
            { icon: "Zap",     text: "Подписка активируется моментально после оплаты" },
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
}