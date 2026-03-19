/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Toggle2, SectionTitle, Card, INITIAL_ANTISPAM } from "./ui";

/* ══════════════════════════════════════════
   PAGE: DASHBOARD
══════════════════════════════════════════ */
export function DashboardPage() {
  const stats = [
    { icon: "Users",         label: "Участников",       val: "124", sub: "+3 сегодня",     color: "text-cyan-400"    },
    { icon: "MessageSquare", label: "Сообщений / день", val: "482", sub: "норма",           color: "text-emerald-400" },
    { icon: "ShieldAlert",   label: "Нарушений",        val: "7",   sub: "3 автоблок.",    color: "text-amber-400"   },
    { icon: "AlertTriangle", label: "Активных варнов",  val: "4",   sub: "у 3 участников", color: "text-red-400"     },
  ];
  const events = [
    { time: "12:41", icon: "AlertTriangle", color: "text-amber-400",  text: "Предупреждение → Игорь Волков (спам)"      },
    { time: "12:38", icon: "Trash2",        color: "text-red-400",    text: "Удалено сообщение → Денис Орлов"            },
    { time: "12:20", icon: "VolumeX",       color: "text-orange-400", text: "Мут 10 мин → Игорь Волков (3-е нарушение)" },
    { time: "11:55", icon: "UserCheck",     color: "text-emerald-400",text: "Новый участник → Кирилл Зайцев"             },
    { time: "11:12", icon: "TrendingUp",    color: "text-cyan-400",   text: "Смена роли → Мария Крылова: Старожил"       },
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
export function WelcomePage() {
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
            { label: "Капча при входе",           sub: "Кнопка «Я принял правила» — без неё мут",    on: captcha,   set: setCaptcha   },
            { label: "Отправить правила в ЛС",    sub: "Бот дублирует правила в личку новичку",      on: sendRules, set: setSendRules },
            { label: "Автокик без подтверждения", sub: "Исключить, если не нажал капчу за N минут",  on: autoKick,  set: setAutoKick  },
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
export function AntispamPage() {
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
            { key: "soft",     label: "Мягкий",  desc: "Предупреждает",  icon: "MessageCircle" },
            { key: "balanced", label: "Норма",   desc: "Удаляет + варн", icon: "Scale"         },
            { key: "strict",   label: "Строгий", desc: "Мут сразу",      icon: "ShieldX"       },
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
