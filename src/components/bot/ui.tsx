 

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
export type Page = "dashboard" | "welcome" | "antispam" | "commands" | "reputation" | "warns" | "connect";

export type ToggleItem = { id: string; label: string; sub: string; on: boolean };
export type Command = { cmd: string; desc: string; access: "all" | "admin" | "mod"; enabled: boolean };

/* ══════════════════════════════════════════
   DATA
══════════════════════════════════════════ */
export const INITIAL_ANTISPAM: ToggleItem[] = [
  { id: "flood",   label: "Антифлуд",            sub: "Блок >3 одинаковых сообщений подряд",   on: true  },
  { id: "links",   label: "Запрет ссылок",        sub: "Удалять сторонние URL, кроме whitelist", on: true  },
  { id: "caps",    label: "Фильтр капса",          sub: "Удалять сообщения с >70% заглавных",    on: false },
  { id: "arabic",  label: "Фильтр иероглифов",    sub: "Скрывать нечитаемые символы",           on: false },
  { id: "sticker", label: "Стикеры новичкам",     sub: "Запрет медиа первые 24 ч",              on: true  },
  { id: "bot",     label: "Защита от ботов",      sub: "Блок если нет аватарки и биографии",    on: true  },
];

export const INITIAL_COMMANDS: Command[] = [
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

export const WARN_ACTIONS = [
  { warns: 1, action: "Предупреждение в чате" },
  { warns: 2, action: "Мут на 15 минут"       },
  { warns: 3, action: "Мут на 1 час"          },
  { warns: 5, action: "Кик из группы"         },
];

/* ══════════════════════════════════════════
   SMALL UI COMPONENTS
══════════════════════════════════════════ */
export function Toggle2({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative rounded-full shrink-0 transition-colors duration-200 ${on ? "bg-cyan-500" : "bg-[hsl(220_12%_22%)]"}`}
      style={{ width: 38, height: 21 }}>
      <span className="absolute top-[3px] w-[15px] h-[15px] rounded-full bg-white transition-all duration-200"
        style={{ left: on ? "20px" : "3px" }} />
    </button>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{children}</h3>;
}

export function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`} style={style}>{children}</div>
  );
}

export function AccessBadge({ access }: { access: "all" | "admin" | "mod" }) {
  const map = {
    all:   { label: "все",       cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
    mod:   { label: "модератор", cls: "bg-amber-500/10  text-amber-400  border-amber-500/20" },
    admin: { label: "админ",     cls: "bg-cyan-500/10   text-cyan-400   border-cyan-500/20"  },
  };
  const { label, cls } = map[access];
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border mono ${cls}`}>{label}</span>;
}
