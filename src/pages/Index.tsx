/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Icon from "@/components/ui/icon";

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
type Page = "dashboard" | "welcome" | "antispam" | "commands" | "reputation" | "warns" | "connect";

type ToggleItem = { id: string; label: string; sub: string; on: boolean };
type Command = { cmd: string; desc: string; access: "all" | "admin" | "mod"; enabled: boolean };

/* ══════════════════════════════════════════
   DATA
══════════════════════════════════════════ */
const INITIAL_ANTISPAM: ToggleItem[] = [
  { id: "flood",   label: "Антифлуд",            sub: "Блок >3 одинаковых сообщений подряд",   on: true  },
  { id: "links",   label: "Запрет ссылок",        sub: "Удалять сторонние URL, кроме whitelist", on: true  },
  { id: "caps",    label: "Фильтр капса",          sub: "Удалять сообщения с >70% заглавных",    on: false },
  { id: "arabic",  label: "Фильтр иероглифов",    sub: "Скрывать нечитаемые символы",           on: false },
  { id: "sticker", label: "Стикеры новичкам",     sub: "Запрет медиа первые 24 ч",              on: true  },
  { id: "bot",     label: "Защита от ботов",      sub: "Блок если нет аватарки и биографии",    on: true  },
];

const INITIAL_COMMANDS: Command[] = [
  { cmd: "/ban",    desc: "Заблокировать участника",              access: "admin", enabled: true  },
  { cmd: "/kick",   desc: "Исключить без бана",                   access: "admin", enabled: true  },
  { cmd: "/mute",   desc: "Замутить (укажи время)",               access: "mod",   enabled: true  },
  { cmd: "/warn",   desc: "Выдать предупреждение",                access: "mod",   enabled: true  },
  { cmd: "/unwarn", desc: "Снять предупреждение",                 access: "mod",   enabled: true  },
  { cmd: "/del",    desc: "Удалить сообщение",                    access: "mod",   enabled: true  },
  { cmd: "/ro",     desc: "Режим только чтение для пользователя", access: "mod",   enabled: false },
  { cmd: "/report", desc: "Пожаловаться модератору",              access: "all",   enabled: true  },
  { cmd: "/rep",    desc: "Посмотреть репутацию",                 access: "all",   enabled: true  },
  { cmd: "/rules",  desc: "Показать правила группы",              access: "all",   enabled: true  },
  { cmd: "/help",   desc: "Список команд",                        access: "all",   enabled: true  },
  { cmd: "/pin",    desc: "Закрепить сообщение",                  access: "admin", enabled: false },
];

const WARN_ACTIONS = [
  { warns: 1, action: "Предупреждение в чате" },
  { warns: 2, action: "Мут на 15 минут"       },
  { warns: 3, action: "Мут на 1 час"          },
  { warns: 5, action: "Кик из группы"         },
];

/* ══════════════════════════════════════════
   SMALL UI
══════════════════════════════════════════ */
function Toggle2({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative rounded-full shrink-0 transition-colors duration-200 ${on ? "bg-cyan-500" : "bg-[hsl(220_12%_22%)]"}`}
      style={{ width: 38, height: 21 }}>
      <span className="absolute top-[3px] w-[15px] h-[15px] rounded-full bg-white transition-all duration-200"
        style={{ left: on ? "20px" : "3px" }} />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{children}</h3>;
}

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`} style={style}>{children}</div>
  );
}

function AccessBadge({ access }: { access: "all" | "admin" | "mod" }) {
  const map = {
    all:   { label: "все",       cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
    mod:   { label: "модератор", cls: "bg-amber-500/10  text-amber-400  border-amber-500/20" },
    admin: { label: "админ",     cls: "bg-cyan-500/10   text-cyan-400   border-cyan-500/20"  },
  };
  const { label, cls } = map[access];
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border mono ${cls}`}>{label}</span>;
}

/* ══════════════════════════════════════════
   PAGE: DASHBOARD
══════════════════════════════════════════ */
function DashboardPage() {
  const stats = [
    { icon: "Users",         label: "Участников",       val: "124", sub: "+3 сегодня",    color: "text-cyan-400"    },
    { icon: "MessageSquare", label: "Сообщений / день", val: "482", sub: "норма",          color: "text-emerald-400" },
    { icon: "ShieldAlert",   label: "Нарушений",        val: "7",   sub: "3 автоблок.",   color: "text-amber-400"   },
    { icon: "AlertTriangle", label: "Активных варнов",  val: "4",   sub: "у 3 участников", color: "text-red-400"    },
  ];
  const events = [
    { time: "12:41", icon: "AlertTriangle", color: "text-amber-400",  text: "Предупреждение → Игорь Волков (спам)"         },
    { time: "12:38", icon: "Trash2",        color: "text-red-400",    text: "Удалено сообщение → Денис Орлов"               },
    { time: "12:20", icon: "VolumeX",       color: "text-orange-400", text: "Мут 10 мин → Игорь Волков (3-е нарушение)"     },
    { time: "11:55", icon: "UserCheck",     color: "text-emerald-400",text: "Новый участник → Кирилл Зайцев"                },
    { time: "11:12", icon: "TrendingUp",    color: "text-cyan-400",   text: "Смена роли → Мария Крылова: Старожил"          },
  ];

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot inline-block" />
          <span className="text-xs text-emerald-400 font-semibold mono">Бот активен</span>
        </div>
        <h2 className="text-xl font-bold">Группа «Команда ГлавСтрой»</h2>
        <p className="text-sm text-muted-foreground">Мессенджер Макс · 124 участника</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s, i) => (
          <Card key={i} style={{ animationDelay: `${i * 50}ms` }} className="animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-2xl font-bold mono ${s.color}`}>{s.val}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
              </div>
              <div className="p-2 rounded-lg bg-[hsl(220_12%_16%)]">
                <Icon name={s.icon as any} size={16} className={s.color} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="animate-fade-in" style={{ animationDelay: "220ms" }}>
        <SectionTitle>Последние события</SectionTitle>
        <div className="space-y-3">
          {events.map((e, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Icon name={e.icon as any} size={13} className={e.color} />
              <span className="text-sm flex-1 truncate">{e.text}</span>
              <span className="mono text-xs text-muted-foreground shrink-0">{e.time}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="animate-fade-in" style={{ animationDelay: "280ms" }}>
        <SectionTitle>Статус функций</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Антиспам",    on: true  },
            { label: "Приветствие", on: true  },
            { label: "Репутация",   on: true  },
            { label: "Автоварны",   on: true  },
            { label: "Капча",       on: true  },
            { label: "Капс-фильтр", on: false },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.on ? "bg-emerald-400" : "bg-slate-600"}`} />
              <span className={f.on ? "" : "text-muted-foreground"}>{f.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE: WELCOME
══════════════════════════════════════════ */
function WelcomePage() {
  const [captcha, setCaptcha] = useState(true);
  const [sendRules, setSendRules] = useState(true);
  const [autoKick, setAutoKick] = useState(false);
  const [kickMin, setKickMin] = useState("10");
  const [text, setText] = useState(
    "👋 Привет, {имя}! Добро пожаловать в группу.\n\nПожалуйста, прочитай правила и нажми кнопку «Я принял правила»."
  );
  const [byeText, setByeText] = useState("👋 {имя} покинул(а) группу.");

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-1">Приветствие и прощание</h2>
        <p className="text-sm text-muted-foreground">Настройка сообщений при входе / выходе участников</p>
      </div>

      <Card className="animate-fade-in space-y-4">
        <SectionTitle>Приветственное сообщение</SectionTitle>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
          className="w-full rounded-lg bg-[hsl(220_12%_9%)] border border-border text-sm p-3 resize-none focus:outline-none focus:border-cyan-500/60 transition-colors" />
        <p className="text-xs text-muted-foreground">
          Переменные: <span className="mono text-cyan-400">{"{имя}"}</span> · <span className="mono text-cyan-400">{"{username}"}</span> · <span className="mono text-cyan-400">{"{group}"}</span>
        </p>
        <div className="space-y-3 pt-1">
          {[
            { label: "Капча при входе",          sub: "Кнопка «Я принял правила» — без неё мут",     on: captcha,   set: setCaptcha   },
            { label: "Отправить правила в ЛС",   sub: "Бот дублирует правила в личку новичку",       on: sendRules, set: setSendRules },
            { label: "Автокик без подтверждения", sub: "Исключить, если не нажал капчу за N минут", on: autoKick,  set: setAutoKick  },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
              <Toggle2 on={item.on} onChange={() => item.set(!item.on)} />
            </div>
          ))}
          {autoKick && (
            <div className="flex items-center gap-3 pl-1">
              <span className="text-sm text-muted-foreground">Время до кика:</span>
              <input type="number" value={kickMin} onChange={e => setKickMin(e.target.value)} min={1} max={60}
                className="w-16 rounded-md bg-[hsl(220_12%_9%)] border border-border text-sm px-2 py-1.5 mono text-center focus:outline-none focus:border-cyan-500/60" />
              <span className="text-sm text-muted-foreground">мин.</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="animate-fade-in space-y-3">
        <SectionTitle>Сообщение при выходе</SectionTitle>
        <textarea value={byeText} onChange={e => setByeText(e.target.value)} rows={2}
          className="w-full rounded-lg bg-[hsl(220_12%_9%)] border border-border text-sm p-3 resize-none focus:outline-none focus:border-cyan-500/60 transition-colors" />
        <p className="text-xs text-muted-foreground">Оставь пустым — бот не отправит ничего</p>
      </Card>

      <button className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 transition-colors text-sm font-bold text-[hsl(220_16%_8%)]">
        Сохранить настройки
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE: ANTISPAM
══════════════════════════════════════════ */
function AntispamPage() {
  const [items, setItems] = useState(INITIAL_ANTISPAM);
  const [mode, setMode] = useState<"soft" | "balanced" | "strict">("balanced");
  const [words, setWords] = useState(["казино", "крипто", "ставки", "заработок100%"]);
  const [newWord, setNewWord] = useState("");

  const toggle = (id: string) => setItems(f => f.map(x => x.id === id ? { ...x, on: !x.on } : x));
  const addWord = () => { if (newWord.trim()) { setWords(w => [...w, newWord.trim().toLowerCase()]); setNewWord(""); } };
  const removeWord = (w: string) => setWords(ws => ws.filter(x => x !== w));

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-1">Антиспам</h2>
        <p className="text-sm text-muted-foreground">Автоматические фильтры контента</p>
      </div>

      <Card className="animate-fade-in">
        <SectionTitle>Строгость бота</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "soft",     label: "Мягкий",  desc: "Предупреждает", icon: "MessageCircle" },
            { key: "balanced", label: "Норма",   desc: "Удаляет + варн", icon: "Scale"        },
            { key: "strict",   label: "Строгий", desc: "Мут сразу",     icon: "ShieldX"       },
          ] as const).map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`p-3 rounded-lg border text-center transition-all ${mode === m.key
                ? "bg-cyan-500/12 border-cyan-500/40 text-cyan-300"
                : "bg-[hsl(220_12%_9%)] border-border text-muted-foreground hover:border-[hsl(220_12%_28%)]"}`}>
              <Icon name={m.icon as any} size={15} className="mx-auto mb-1" />
              <div className="text-xs font-semibold">{m.label}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="animate-fade-in space-y-3">
        <SectionTitle>Фильтры</SectionTitle>
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
              <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
            </div>
            <Toggle2 on={item.on} onChange={() => toggle(item.id)} />
          </div>
        ))}
      </Card>

      <Card className="animate-fade-in space-y-3">
        <SectionTitle>Запрещённые слова</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {words.map(w => (
            <span key={w} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs mono">
              {w}
              <button onClick={() => removeWord(w)} className="opacity-50 hover:opacity-100 ml-0.5 leading-none">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newWord} onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addWord()} placeholder="Добавить слово..."
            className="flex-1 rounded-lg bg-[hsl(220_12%_9%)] border border-border text-sm px-3 py-2 focus:outline-none focus:border-cyan-500/60 transition-colors" />
          <button onClick={addWord}
            className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 transition-colors">
            <Icon name="Plus" size={15} />
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE: COMMANDS
══════════════════════════════════════════ */
function CommandsPage() {
  const [cmds, setCmds] = useState(INITIAL_COMMANDS);
  const [filter, setFilter] = useState<"all" | "admin" | "mod" | "everyone">("all");
  const toggle = (cmd: string) => setCmds(cs => cs.map(c => c.cmd === cmd ? { ...c, enabled: !c.enabled } : c));

  const filtered = filter === "all" ? cmds : cmds.filter(c => c.access === (filter === "everyone" ? "all" : filter));

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-1">Команды</h2>
        <p className="text-sm text-muted-foreground">Управляй доступными командами бота</p>
      </div>

      <div className="flex gap-2 flex-wrap animate-fade-in">
        {([
          { key: "all", label: "Все" },
          { key: "everyone", label: "Для всех" },
          { key: "mod", label: "Модераторы" },
          { key: "admin", label: "Админы" },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f.key
              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((cmd, i) => (
          <div key={cmd.cmd}
            className={`animate-fade-in flex items-center gap-3 p-3 rounded-xl border border-border bg-card transition-opacity ${!cmd.enabled ? "opacity-50" : ""}`}
            style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="mono text-sm font-bold text-cyan-400">{cmd.cmd}</span>
                <AccessBadge access={cmd.access} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{cmd.desc}</p>
            </div>
            <Toggle2 on={cmd.enabled} onChange={() => toggle(cmd.cmd)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE: REPUTATION
══════════════════════════════════════════ */
function ReputationPage() {
  const [enabled, setEnabled] = useState(true);
  const [showPublic, setShowPublic] = useState(false);
  const [autoRole, setAutoRole] = useState(true);

  const members = [
    { name: "Алексей Воронов", rep: 98, msgs: 1240, role: "Администратор", badge: "🏆" },
    { name: "Мария Крылова",   rep: 84, msgs: 876,  role: "Старожил",      badge: "⭐" },
    { name: "Татьяна Лисова",  rep: 71, msgs: 310,  role: "Активный",      badge: "👍" },
    { name: "Денис Орлов",     rep: 67, msgs: 432,  role: "Активный",      badge: "👍" },
    { name: "Светлана Рыбина", rep: 52, msgs: 198,  role: "Участник",      badge: ""   },
    { name: "Игорь Волков",    rep: 30, msgs: 45,   role: "Новичок",       badge: ""   },
  ];

  const thresholds = [
    { rep: 0,  msgs: 0,   label: "Новичок",  color: "text-slate-400"  },
    { rep: 10, msgs: 50,  label: "Участник", color: "text-slate-300"  },
    { rep: 40, msgs: 200, label: "Активный", color: "text-green-400"  },
    { rep: 70, msgs: 600, label: "Старожил", color: "text-amber-400"  },
  ];

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-1">Репутация</h2>
        <p className="text-sm text-muted-foreground">Система рейтинга участников группы</p>
      </div>

      <Card className="animate-fade-in space-y-3">
        <SectionTitle>Настройки</SectionTitle>
        {[
          { label: "Система репутации",  sub: "Начислять баллы за активность и соблюдение правил", on: enabled,    set: setEnabled    },
          { label: "Публичный рейтинг",  sub: "Участники видят репутацию друг друга",              on: showPublic, set: setShowPublic },
          { label: "Автосмена роли",     sub: "Менять роль при достижении порога",                 on: autoRole,   set: setAutoRole   },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
            <Toggle2 on={item.on} onChange={() => item.set(!item.on)} />
          </div>
        ))}
      </Card>

      <Card className="animate-fade-in">
        <SectionTitle>Пороги ролей</SectionTitle>
        <div className="space-y-2.5">
          {thresholds.map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-20 shrink-0">
                <span className={`text-sm font-semibold ${t.color}`}>{t.label}</span>
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-[hsl(220_12%_16%)]">
                <div className="h-full rounded-full bg-cyan-500/50" style={{ width: `${Math.min(100, t.rep + 10)}%` }} />
              </div>
              <div className="text-xs mono text-muted-foreground shrink-0">≥{t.rep} · {t.msgs} сообщ.</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="animate-fade-in">
        <SectionTitle>Топ участников</SectionTitle>
        <div className="space-y-2.5">
          {members.map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="mono text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-[hsl(220_12%_18%)] flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                {m.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.name} {m.badge}</div>
                <div className="text-xs text-muted-foreground">{m.role} · {m.msgs} сообщ.</div>
              </div>
              <div className="mono text-base font-bold text-cyan-400 shrink-0">{m.rep}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE: WARNS
══════════════════════════════════════════ */
function WarnToggleRow({ label, sub, initial }: { label: string; sub: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <Toggle2 on={on} onChange={() => setOn(!on)} />
    </div>
  );
}

function WarnsPage() {
  const warned = [
    { name: "Игорь Волков",    warns: 3, last: "Спам (повтор ×4)",      time: "сегодня 12:41" },
    { name: "Денис Орлов",     warns: 2, last: "Запрещённое слово",     time: "вчера 18:10"   },
    { name: "Светлана Рыбина", warns: 1, last: "Капс (85% заглавных)",  time: "вчера 11:40"   },
  ];
  const dotColors = ["hsl(38 92% 50%)", "hsl(25 95% 55%)", "hsl(10 90% 55%)", "hsl(0 72% 51%)"];

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-1">Предупреждения</h2>
        <p className="text-sm text-muted-foreground">Система варнов и автоматических санкций</p>
      </div>

      <Card className="animate-fade-in">
        <SectionTitle>Лестница санкций</SectionTitle>
        <div className="relative pl-5">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
          {WARN_ACTIONS.map((step, i) => (
            <div key={i} className="relative flex items-center gap-3 mb-3.5 last:mb-0">
              <div className="absolute -left-1 w-2.5 h-2.5 rounded-full border-2 bg-background"
                style={{ borderColor: dotColors[i] }} />
              <div className="pl-3">
                <span className="mono text-sm font-bold" style={{ color: dotColors[i] }}>
                  {step.warns} {step.warns === 1 ? "варн" : "варна"}
                </span>
                <span className="text-sm text-muted-foreground ml-2">→ {step.action}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="animate-fade-in">
        <SectionTitle>Активные предупреждения</SectionTitle>
        <div className="space-y-3">
          {warned.map((w, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(220_12%_9%)] border border-border">
              <div className="w-8 h-8 rounded-full bg-[hsl(220_12%_16%)] flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                {w.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{w.name}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className={`w-3 h-3 rounded-sm ${j < w.warns ? "bg-red-500" : "bg-[hsl(220_12%_22%)]"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{w.last}</p>
                <p className="text-xs text-muted-foreground mono">{w.time}</p>
              </div>
              <button className="shrink-0 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors">
                Сбросить
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="animate-fade-in space-y-3">
        <SectionTitle>Параметры</SectionTitle>
        <WarnToggleRow label="Варны сгорают автоматически" sub="Через 7 дней без нарушений"        initial={true}  />
        <WarnToggleRow label="Варн при удалении сообщения"  sub="Автоматически назначать варн"      initial={false} />
        <WarnToggleRow label="Уведомлять модераторов"        sub="Сообщение при новом варне"         initial={true}  />
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE: CONNECT
══════════════════════════════════════════ */
function ConnectPage() {
  const [token, setToken] = useState("");
  const [groupId, setGroupId] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-1">Подключение к Макс</h2>
        <p className="text-sm text-muted-foreground">Привяжи бота к своей группе в мессенджере Макс</p>
      </div>

      <Card className="animate-fade-in space-y-4">
        <SectionTitle>Инструкция</SectionTitle>
        {[
          { n: "1", text: "Открой Макс → найди официального бота @BotFather" },
          { n: "2", text: "Отправь /newbot → следуй инструкциям → получи токен" },
          { n: "3", text: "Добавь бота в свою группу с правами администратора" },
          { n: "4", text: "Скопируй токен и ID группы, вставь ниже" },
        ].map(step => (
          <div key={step.n} className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-cyan-400 mono">{step.n}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
          </div>
        ))}
      </Card>

      <Card className="animate-fade-in space-y-4">
        <SectionTitle>Данные бота</SectionTitle>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">API токен</label>
          <input type="password" value={token} onChange={e => setToken(e.target.value)}
            placeholder="1234567890:AABBccDD..."
            className="w-full rounded-lg bg-[hsl(220_12%_9%)] border border-border text-sm px-3 py-2.5 mono focus:outline-none focus:border-cyan-500/60 transition-colors" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">ID группы</label>
          <input type="text" value={groupId} onChange={e => setGroupId(e.target.value)}
            placeholder="-100123456789"
            className="w-full rounded-lg bg-[hsl(220_12%_9%)] border border-border text-sm px-3 py-2.5 mono focus:outline-none focus:border-cyan-500/60 transition-colors" />
        </div>
        <button onClick={() => setSaved(true)}
          className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 transition-colors text-sm font-bold text-[hsl(220_16%_8%)]">
          {saved ? "✓ Сохранено" : "Подключить бота"}
        </button>
      </Card>

      <Card className="animate-fade-in">
        <SectionTitle>Полезные ссылки</SectionTitle>
        <div className="space-y-1.5">
          {[
            { label: "Документация API Макс",       url: "https://dev.max.ru",          icon: "BookOpen"     },
            { label: "GroupHelp — аналог в Telegram", url: "https://grouphelp.bot",     icon: "ExternalLink" },
            { label: "Центр поддержки poehali.dev", url: "https://poehali.dev/help",    icon: "HelpCircle"   },
          ].map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-[hsl(220_12%_14%)] transition-colors group">
              <Icon name={link.icon as any} size={14} className="text-muted-foreground group-hover:text-cyan-400 transition-colors" />
              <span className="text-sm group-hover:text-cyan-400 transition-colors">{link.label}</span>
              <Icon name="ArrowRight" size={12} className="text-muted-foreground ml-auto" />
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   NAV
══════════════════════════════════════════ */
const NAV: { key: Page; label: string; icon: string }[] = [
  { key: "dashboard",  label: "Главная",     icon: "LayoutDashboard" },
  { key: "welcome",    label: "Приветствие", icon: "Handshake"       },
  { key: "antispam",   label: "Антиспам",    icon: "ShieldCheck"     },
  { key: "commands",   label: "Команды",     icon: "Terminal"        },
  { key: "reputation", label: "Репутация",   icon: "Star"            },
  { key: "warns",      label: "Варны",       icon: "AlertTriangle"   },
  { key: "connect",    label: "Подключение", icon: "Link"            },
];

/* ══════════════════════════════════════════
   ROOT
══════════════════════════════════════════ */
export default function Index() {
  const [active, setActive] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pages: Record<Page, React.ReactNode> = {
    dashboard:  <DashboardPage />,
    welcome:    <WelcomePage />,
    antispam:   <AntispamPage />,
    commands:   <CommandsPage />,
    reputation: <ReputationPage />,
    warns:      <WarnsPage />,
    connect:    <ConnectPage />,
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex">
      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 border-r border-border flex flex-col transition-transform duration-200 bg-[hsl(220_18%_6%)]
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static
      `}>
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Icon name="Bot" size={16} className="text-cyan-400" />
            </div>
            <div>
              <div className="text-sm font-bold">Порядок</div>
              <div className="text-xs text-muted-foreground mono">GroupBot для Макс</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <button key={item.key}
              onClick={() => { setActive(item.key); setSidebarOpen(false); }}
              className={`nav-item w-full ${active === item.key ? "active" : ""}`}>
              <Icon name={item.icon as any} size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot inline-block" />
            <span className="text-xs text-muted-foreground">Бот подключён</span>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-secondary" onClick={() => setSidebarOpen(true)}>
            <Icon name="Menu" size={18} />
          </button>
          <span className="text-sm font-semibold hidden lg:block">
            {NAV.find(n => n.key === active)?.label}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot inline-block" />
              <span className="text-xs text-emerald-400 font-semibold mono">онлайн</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-4 py-5">
            {pages[active]}
          </div>
        </main>
      </div>
    </div>
  );
}
