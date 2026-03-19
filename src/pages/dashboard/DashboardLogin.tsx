import Icon from "@/components/ui/icon";
import { LOGO } from "./DashboardTypes";

interface Props {
  maxId: string;
  setMaxId: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  loading: boolean;
  error: string;
  onLogin: () => void;
  onBack: () => void;
}

export default function DashboardLogin({
  maxId, setMaxId, username, setUsername, name, setName,
  loading, error, onLogin, onBack,
}: Props) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
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
            <input value={maxId} onChange={e => setMaxId(e.target.value)} onKeyDown={e => e.key === "Enter" && onLogin()}
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

          <button onClick={onLogin} disabled={loading}
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
}
