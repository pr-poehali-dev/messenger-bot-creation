import Icon from "@/components/ui/icon";

interface Props {
  trialDays:     number | null;
  trialLoad:     boolean;
  trialEditing:  boolean;
  trialInput:    string;
  trialSaving:   boolean;
  trialSaved:    boolean;
  trialError:    string;
  setTrialEditing:(v: boolean) => void;
  setTrialInput: (v: string) => void;
  setTrialError: (v: string) => void;
  saveTrialDays: () => void;
}

export default function AdminTrialTab({
  trialDays, trialLoad, trialEditing, trialInput, trialSaving, trialSaved, trialError,
  setTrialEditing, setTrialInput, setTrialError, saveTrialDays,
}: Props) {
  return (
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
  );
}
