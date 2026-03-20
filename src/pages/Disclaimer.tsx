import { useNavigate } from "react-router-dom";

export default function Disclaimer() {
  const navigate = useNavigate();
  const date = "21 марта 2026 г.";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/strazh")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            ← Назад
          </button>
          <span className="text-sm text-muted-foreground">⚔️ Страж</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-black mb-2">Отказ от ответственности</h1>
        <p className="text-sm text-muted-foreground mb-8">Редакция от {date}</p>

        <div className="prose prose-sm prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">

          <div className="p-4 rounded-xl border border-border bg-card text-xs">
            Настоящий документ является неотъемлемой частью Пользовательского соглашения и
            Политики конфиденциальности сервиса «Страж».
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">1. Предоставление сервиса «как есть»</h2>
            <p>
              Сервис «Страж» предоставляется в состоянии «как есть» (as is) и «по мере доступности»
              (as available) без каких-либо явных или подразумеваемых гарантий, включая, но не
              ограничиваясь гарантиями коммерческой пригодности, соответствия определённым целям
              и ненарушения прав третьих лиц.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">2. Ограничение ответственности Оператора</h2>
            <p>Оператор не несёт ответственности за:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Прямой или косвенный ущерб, включая упущенную выгоду, потерю данных,
                нарушение работы бизнеса, возникшие в связи с использованием или невозможностью
                использования Сервиса;
              </li>
              <li>
                Действия, совершённые ботом в управляемых группах мессенджера Max —
                ответственность за настройку правил несёт пользователь;
              </li>
              <li>
                Временную недоступность Сервиса в связи с техническими работами, сбоями
                инфраструктуры или действиями третьих лиц;
              </li>
              <li>
                Изменения в API мессенджера Max, которые могут повлиять на работоспособность Сервиса;
              </li>
              <li>
                Последствия нарушения пользователем правил мессенджера Max, законодательства РФ
                или настоящего Соглашения;
              </li>
              <li>
                Убытки, возникшие в результате несанкционированного доступа к аккаунту пользователя;
              </li>
              <li>
                Потерю токена доступа бота или иных учётных данных по вине пользователя.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">3. Ответственность пользователя</h2>
            <p>Пользователь несёт полную ответственность за:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Корректность настройки правил модерации в боте</li>
              <li>Соответствие использования бота правилам мессенджера Max</li>
              <li>Соблюдение законодательства РФ при работе с группами и их участниками</li>
              <li>Сохранность токена доступа своего бота</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">4. Сторонние сервисы</h2>
            <p>
              Сервис взаимодействует со сторонними платформами: мессенджер Max (API) и ЮMoney
              (обработка платежей). Оператор не несёт ответственности за действия, политику или
              недоступность этих сервисов.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">5. Пробный период</h2>
            <p>
              Пробный период предоставляется безвозмездно в ознакомительных целях. Оператор не
              гарантирует идентичность функциональности в период триала и после его завершения.
              Оператор вправе изменить длительность пробного периода для новых пользователей
              без предварительного уведомления.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">6. Максимальный размер ответственности</h2>
            <p>
              В случаях, когда ответственность Оператора не может быть полностью исключена
              в соответствии с применимым законодательством, она ограничивается суммой,
              фактически уплаченной пользователем за Сервис в течение 30 дней,
              предшествующих дате возникновения претензии.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">7. Изменения документа</h2>
            <p>
              Оператор вправе изменять настоящий документ. Актуальная версия публикуется по
              адресу /disclaimer. Продолжение использования Сервиса означает согласие с изменениями.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}