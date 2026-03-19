import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { ViolationsData, ListEntry } from "./DashboardTypes";

interface Props {
  activeTab: "violations" | "lists";
  groupId: string;
  // violations
  violations: ViolationsData | null;
  violDays: number;
  violLoading: boolean;
  onSetViolDays: (d: number) => void;
  // lists
  whitelist: ListEntry[];
  blacklist: ListEntry[];
  listLoading: boolean;
  newUserId: string;
  setNewUserId: (v: string) => void;
  newUserName: string;
  setNewUserName: (v: string) => void;
  listType: "whitelist" | "blacklist";
  setListType: (v: "whitelist" | "blacklist") => void;
  onAddToList: () => void;
  onRemoveFromList: (id: number) => void;
}

export default function DashboardModeration({
  activeTab, groupId,
  violations, violDays, violLoading, onSetViolDays,
  whitelist, blacklist, listLoading,
  newUserId, setNewUserId, newUserName, setNewUserName,
  listType, setListType, onAddToList, onRemoveFromList,
}: Props) {
  const navigate = useNavigate();

  const noGroupPlaceholder = (icon: string, label: string) => (
    <div className="p-5 rounded-2xl bg-card border border-border text-center">
      <Icon name={icon} size={32} className="text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <button onClick={() => navigate("/")} className="mt-3 px-4 py-2 rounded-lg bg-cyan-500 text-[hsl(220_16%_8%)] text-sm font-bold">
        Подключить бота
      </button>
    </div>
  );

  if (activeTab === "violations") {
    if (!groupId) return noGroupPlaceholder("ShieldAlert", "Сначала подключи бота к группе на главной странице");

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Статистика нарушений</h3>
          <div className="flex gap-1">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => onSetViolDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  violDays === d ? "bg-cyan-500 text-[hsl(220_16%_8%)]" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}>
                {d}д
              </button>
            ))}
          </div>
        </div>

        {violLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Загружаю...</div>
        ) : violations ? (
          <>
            <div className="p-4 rounded-2xl bg-card border border-border text-center">
              <div className="text-4xl font-black text-cyan-400">{violations.total}</div>
              <div className="text-sm text-muted-foreground">нарушений за {violDays} дней</div>
            </div>

            {violations.by_type.length > 0 && (
              <div className="p-4 rounded-2xl bg-card border border-border">
                <h4 className="text-sm font-semibold mb-3">По типам</h4>
                <div className="space-y-2">
                  {violations.by_type.map(v => (
                    <div key={v.type} className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground flex-1 truncate">{v.type}</div>
                      <div className="text-xs font-bold tabular-nums">{v.count}</div>
                      <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${(v.count / violations.total) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {violations.top_violators.length > 0 && (
              <div className="p-4 rounded-2xl bg-card border border-border">
                <h4 className="text-sm font-semibold mb-3">Топ нарушителей</h4>
                <div className="space-y-2">
                  {violations.top_violators.map((v, i) => (
                    <div key={v.user_id} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                      <div className="flex-1 text-sm truncate">{v.name || `ID ${v.user_id}`}</div>
                      <div className="text-xs font-bold text-red-400">{v.count}×</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {violations.total === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <Icon name="CheckCircle" size={32} className="text-emerald-400 mx-auto mb-2" />
                Нарушений не зафиксировано
              </div>
            )}
          </>
        ) : null}
      </div>
    );
  }

  // activeTab === "lists"
  if (!groupId) return noGroupPlaceholder("Users", "Сначала подключи бота к группе на главной странице");

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
        <h3 className="font-bold">Добавить пользователя</h3>
        <div className="flex gap-2">
          <button onClick={() => setListType("whitelist")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${listType === "whitelist" ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}>
            ✅ Whitelist
          </button>
          <button onClick={() => setListType("blacklist")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${listType === "blacklist" ? "bg-red-500 text-white" : "bg-secondary text-muted-foreground"}`}>
            🚫 Blacklist
          </button>
        </div>
        <input value={newUserId} onChange={e => setNewUserId(e.target.value)}
          placeholder="ID пользователя в Макс" className="field-input mono" type="number" />
        <input value={newUserName} onChange={e => setNewUserName(e.target.value)}
          placeholder="Имя (необязательно)" className="field-input" />
        <button onClick={onAddToList} disabled={!newUserId}
          className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] text-sm font-bold transition-colors disabled:opacity-50">
          Добавить
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-card border border-border">
        <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
          <Icon name="CheckCircle" size={14} /> Whitelist — доверенные ({whitelist.length})
        </h4>
        {listLoading ? <div className="text-xs text-muted-foreground">Загружаю...</div> :
         whitelist.length === 0 ? <div className="text-xs text-muted-foreground">Список пуст</div> :
         <div className="space-y-1">
           {whitelist.map(u => (
             <div key={u.user_id} className="flex items-center gap-2 py-1.5">
               <div className="flex-1 text-sm">{u.name || `ID ${u.user_id}`}</div>
               <div className="text-xs text-muted-foreground mono">{u.user_id}</div>
               <button onClick={() => onRemoveFromList(u.user_id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                 <Icon name="X" size={12} />
               </button>
             </div>
           ))}
         </div>
        }
      </div>

      <div className="p-4 rounded-2xl bg-card border border-border">
        <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
          <Icon name="Ban" size={14} /> Blacklist — заблокированные ({blacklist.length})
        </h4>
        {listLoading ? <div className="text-xs text-muted-foreground">Загружаю...</div> :
         blacklist.length === 0 ? <div className="text-xs text-muted-foreground">Список пуст</div> :
         <div className="space-y-1">
           {blacklist.map(u => (
             <div key={u.user_id} className="flex items-center gap-2 py-1.5">
               <div className="flex-1 text-sm">{u.name || `ID ${u.user_id}`}</div>
               <div className="text-xs text-muted-foreground mono">{u.user_id}</div>
               <button onClick={() => onRemoveFromList(u.user_id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                 <Icon name="X" size={12} />
               </button>
             </div>
           ))}
         </div>
        }
      </div>
    </div>
  );
}
