import { RefData } from "./DashboardTypes";

interface Props {
  refData: RefData | null;
  refCopied: boolean;
  refCode: string;
  setRefCode: (v: string) => void;
  refApplying: boolean;
  refMsg: string;
  onCopyLink: (link: string) => void;
  onApply: () => void;
}

export default function DashboardReferral({
  refData, refCopied, refCode, setRefCode, refApplying, refMsg, onCopyLink, onApply,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl bg-card border border-border">
        <h3 className="font-bold mb-1">Пригласи друга — получите по +7 дней</h3>
        <p className="text-sm text-muted-foreground mb-4">Поделись ссылкой. Когда друг зарегистрируется и введёт твой код — вы оба получите 7 бонусных дней.</p>

        {refData ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-secondary text-center">
                <div className="text-2xl font-black text-cyan-400">{refData.invited_count}</div>
                <div className="text-xs text-muted-foreground">приглашено</div>
              </div>
              <div className="p-3 rounded-xl bg-secondary text-center">
                <div className="text-2xl font-black text-emerald-400">+{refData.total_bonus_days}</div>
                <div className="text-xs text-muted-foreground">бонусных дней</div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Твой код</div>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-lg bg-secondary font-mono font-bold tracking-widest text-cyan-400 text-sm">
                  {refData.ref_code}
                </div>
                <button onClick={() => onCopyLink(refData.ref_link)}
                  className="px-3 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] text-xs font-bold transition-colors">
                  {refCopied ? "✓" : "Копировать ссылку"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-muted-foreground text-sm">Загружаю...</div>
        )}
      </div>

      <div className="p-5 rounded-2xl bg-card border border-border">
        <h3 className="font-bold mb-1">Есть код друга?</h3>
        <p className="text-sm text-muted-foreground mb-3">Введи реферальный код и получи +7 дней</p>
        <div className="flex gap-2">
          <input value={refCode} onChange={e => setRefCode(e.target.value.toUpperCase())}
            placeholder="ABCDEF1234" className="field-input flex-1 mono uppercase" maxLength={10} />
          <button onClick={onApply} disabled={refApplying || !refCode}
            className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] text-sm font-bold transition-colors disabled:opacity-50">
            {refApplying ? "..." : "Применить"}
          </button>
        </div>
        {refMsg && <p className="text-sm mt-2">{refMsg}</p>}
      </div>
    </div>
  );
}
