import Icon from "@/components/ui/icon";

interface BannedWord {
  word:       string;
  category:   string;
  created_at: string;
}

interface ModerationLogEntry {
  id:           number;
  chat_id:      number;
  chat_type:    string;
  user_name:    string;
  message_text: string;
  reason:       string;
  action_taken: string;
  created_at:   string;
}

interface FilterSettings {
  flood_limit:       string;
  flood_window_sec:  string;
  forbidden_domains: string;
  ban_on_violation:  string;
  max_warnings:      string;
}

interface Props {
  modTab:            "words" | "log" | "filter";
  setModTab:         (v: "words" | "log" | "filter") => void;
  bannedWords:       BannedWord[];
  bannedLoad:        boolean;
  newWord:           string;
  newWordCat:        string;
  wordSaving:        boolean;
  setNewWord:        (v: string) => void;
  setNewWordCat:     (v: string) => void;
  addBannedWord:     () => void;
  removeBannedWord:  (word: string) => void;
  loadBannedWords:   () => void;
  modLog:            ModerationLogEntry[];
  modLogLoad:        boolean;
  modLogHours:       number;
  setModLogHours:    (v: number) => void;
  loadModLog:        () => void;
  filterSettings:    FilterSettings | null;
  filterLoad:        boolean;
  filterEditing:     boolean;
  filterInput:       Partial<FilterSettings>;
  filterSaved:       boolean;
  setFilterEditing:  (v: boolean) => void;
  setFilterInput:    (v: Partial<FilterSettings>) => void;
  saveFilterSettings:() => void;
}

export default function AdminModerationTab({
  modTab, setModTab,
  bannedWords, bannedLoad, newWord, newWordCat, wordSaving,
  setNewWord, setNewWordCat, addBannedWord, removeBannedWord, loadBannedWords,
  modLog, modLogLoad, modLogHours, setModLogHours, loadModLog,
  filterSettings, filterLoad, filterEditing, filterInput, filterSaved,
  setFilterEditing, setFilterInput, saveFilterSettings,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[
          { key: "words"  as const, label: "Запрещённые слова" },
          { key: "log"    as const, label: "История" },
          { key: "filter" as const, label: "Настройки фильтра" },
        ].map(t => (
          <button key={t.key} onClick={() => setModTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${modTab === t.key
              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
              : "bg-secondary border border-border text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* BANNED WORDS */}
      {modTab === "words" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Слова добавляются в глобальный фильтр. Бот удаляет сообщения, содержащие эти слова, во всех чатах где включена модерация.
          </p>

          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <div className="text-sm font-semibold">Добавить слово</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newWord}
                onChange={e => setNewWord(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addBannedWord()}
                placeholder="Введите слово или фразу..."
                className="field-input flex-1"
              />
              <select
                value={newWordCat}
                onChange={e => setNewWordCat(e.target.value)}
                className="field-input w-32"
              >
                <option value="spam">Спам</option>
                <option value="insult">Оскорбление</option>
                <option value="link">Ссылка</option>
              </select>
              <button
                onClick={addBannedWord}
                disabled={wordSaving || !newWord.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-[hsl(220_16%_8%)] text-sm font-bold transition-colors"
              >
                <Icon name="Plus" size={16} />
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Список ({bannedWords.length})</div>
              <button onClick={loadBannedWords} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Icon name="RefreshCw" size={11} /> Обновить
              </button>
            </div>
            {bannedLoad ? (
              <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">Загружаю...</div>
            ) : bannedWords.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">Список пуст</div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {bannedWords.map(w => (
                  <div key={w.word} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{w.word}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        w.category === "spam" ? "bg-yellow-500/10 text-yellow-400" :
                        w.category === "insult" ? "bg-red-500/10 text-red-400" :
                        "bg-blue-500/10 text-blue-400"
                      }`}>{w.category}</span>
                    </div>
                    <button
                      onClick={() => removeBannedWord(w.word)}
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Icon name="X" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODERATION LOG */}
      {modTab === "log" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">За последние:</span>
            {[6, 24, 72].map(h => (
              <button key={h} onClick={() => setModLogHours(h)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${modLogHours === h
                  ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
                  : "bg-secondary border border-border text-muted-foreground"}`}>
                {h === 6 ? "6 ч" : h === 24 ? "24 ч" : "3 дня"}
              </button>
            ))}
            <button onClick={loadModLog} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Icon name="RefreshCw" size={11} /> Обновить
            </button>
          </div>

          {modLogLoad ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Загружаю историю...</div>
          ) : modLog.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-border text-center text-sm text-muted-foreground">
              Нарушений не зафиксировано
            </div>
          ) : (
            <div className="space-y-2">
              {modLog.map(entry => (
                <div key={entry.id} className="p-4 rounded-xl bg-card border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{entry.user_name || "Аноним"}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        entry.reason === "spam" ? "bg-yellow-500/10 text-yellow-400" :
                        entry.reason === "insult" ? "bg-red-500/10 text-red-400" :
                        entry.reason === "link" ? "bg-blue-500/10 text-blue-400" :
                        "bg-orange-500/10 text-orange-400"
                      }`}>{entry.reason}</span>
                      <span className="text-xs text-muted-foreground">{entry.chat_type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-1.5 rounded line-clamp-2">
                    «{entry.message_text}»
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FILTER SETTINGS */}
      {modTab === "filter" && (
        <div className="space-y-3">
          {filterLoad ? (
            <div className="py-6 text-center text-sm text-muted-foreground animate-pulse">Загружаю...</div>
          ) : filterSettings && (
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">Параметры фильтрации</div>
                <div className="flex items-center gap-2">
                  {filterSaved && <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1"><Icon name="Check" size={12} /> Сохранено</span>}
                  {!filterEditing ? (
                    <button
                      onClick={() => { setFilterInput({ ...filterSettings }); setFilterEditing(true); }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Icon name="Pencil" size={12} /> Изменить
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setFilterEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">Отмена</button>
                      <button onClick={saveFilterSettings} className="text-xs text-cyan-400 font-semibold hover:text-cyan-300">Сохранить</button>
                    </div>
                  )}
                </div>
              </div>

              {[
                { key: "flood_limit"      as const, label: "Лимит сообщений (флуд)", hint: "сообщений за период" },
                { key: "flood_window_sec" as const, label: "Окно антифлуда",         hint: "секунд"             },
                { key: "max_warnings"     as const, label: "Максимум предупреждений", hint: "до блокировки"      },
              ].map(f => (
                <div key={f.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm">{f.label}</div>
                    <div className="text-xs text-muted-foreground">{f.hint}</div>
                  </div>
                  {filterEditing ? (
                    <input
                      type="number"
                      value={filterInput[f.key] ?? filterSettings[f.key]}
                      onChange={e => setFilterInput({ ...filterInput, [f.key]: e.target.value })}
                      className="field-input w-24 text-right mono"
                    />
                  ) : (
                    <span className="font-mono text-lg font-bold text-cyan-400">{filterSettings[f.key]}</span>
                  )}
                </div>
              ))}

              <div className="py-2 border-t border-border">
                <div className="text-sm mb-2">Запрещённые домены</div>
                {filterEditing ? (
                  <textarea
                    value={filterInput.forbidden_domains ?? filterSettings.forbidden_domains}
                    onChange={e => setFilterInput({ ...filterInput, forbidden_domains: e.target.value })}
                    placeholder='["bit.ly","tinyurl.com"]'
                    className="field-input w-full text-xs mono h-20 resize-none"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {JSON.parse(filterSettings.forbidden_domains || "[]").map((d: string) => (
                      <span key={d} className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-mono">{d}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
