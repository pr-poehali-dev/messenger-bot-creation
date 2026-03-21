import Icon from "@/components/ui/icon";

interface Plan {
  plan:      string;
  label:     string;
  price_rub: number;
  days:      number;
  badge:     string | null;
}

interface Props {
  plans:       Plan[];
  plansLoad:   boolean;
  editing:     string | null;
  editPrice:   string;
  editBadge:   string;
  saved:       string | null;
  setEditing:  (v: string | null) => void;
  setEditPrice:(v: string) => void;
  setEditBadge:(v: string) => void;
  startEdit:   (plan: Plan) => void;
  saveEdit:    (planKey: string) => void;
}

export default function AdminPricingTab({
  plans, plansLoad, editing, editPrice, editBadge, saved,
  setEditing, setEditPrice, setEditBadge, startEdit, saveEdit,
}: Props) {
  return (
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
              : <button onClick={() => startEdit(p)} className="text-xs text-cyan-400 hover:text-cyan-300">
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
  );
}
