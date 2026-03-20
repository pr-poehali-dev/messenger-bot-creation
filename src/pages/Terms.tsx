import { useNavigate } from "react-router-dom";

export default function Terms() {
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
        <h1 className="text-2xl font-black mb-2">Пользовательское соглашение</h1>
        <p className="text-sm text-muted-foreground mb-8">Редакция от {date}</p>

        <div className="prose prose-sm prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">1. Предмет соглашения</h2>
            <p>
              Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между
              пользователем и Оператором сервиса «Страж» — бота-модератора для мессенджера Max.
              Начиная использовать Сервис, вы подтверждаете своё согласие с условиями Соглашения.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">2. Пробный период</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Каждый новый пользователь получает бесплатный пробный период, длительность которого
                устанавливается Оператором (по умолчанию — 7 дней, на период тестирования — до 31 дня).
              </li>
              <li>
                Пробный период предоставляется однократно и привязан к уникальному User ID
                в мессенджере Max. Повторное получение пробного доступа через создание нового аккаунта
                не допускается.
              </li>
              <li>
                По истечении пробного периода доступ к платным функциям автоматически блокируется.
              </li>
              <li>
                <strong className="text-foreground">Длительность пробного периода может быть изменена Оператором в одностороннем порядке.</strong>
                {" "}Изменения применяются только к новым пользователям. Для пользователей с уже
                активированным пробным периодом условия сохраняются до его истечения.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">3. Платная подписка</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>После окончания пробного периода доступ к Сервису предоставляется на платной основе.</li>
              <li>Оплата производится через сервис ЮMoney. Все транзакции защищены протоколом HTTPS.</li>
              <li>Тарифы публикуются на странице оплаты и могут быть изменены Оператором с предварительным уведомлением.</li>
              <li>Возврат средств за уже оплаченный период не производится, за исключением случаев технической недоступности Сервиса по вине Оператора.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">4. Запрещённые действия</h2>
            <p>Пользователю запрещается:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Использовать Сервис для незаконной деятельности</li>
              <li>Создавать несколько аккаунтов с целью обхода ограничений пробного периода</li>
              <li>Передавать третьим лицам токен доступа своего бота</li>
              <li>Предпринимать попытки взлома или дестабилизации Сервиса</li>
              <li>Нарушать правила мессенджера Max при использовании бота</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">5. Ответственность</h2>
            <p>
              Сервис предоставляется «как есть» (as is). Оператор не несёт ответственности за ущерб,
              возникший в результате использования или невозможности использования Сервиса, включая
              упущенную выгоду. Полный перечень ограничений ответственности изложен в Отказе от
              ответственности (<a href="/disclaimer" className="text-cyan-400 hover:underline">страница /disclaimer</a>).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">6. Персональные данные</h2>
            <p>
              Обработка персональных данных осуществляется в соответствии с Политикой
              конфиденциальности (<a href="/privacy" className="text-cyan-400 hover:underline">страница /privacy</a>).
              Сервис не собирает паспортные данные, биометрию и иные чувствительные сведения.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">7. Прекращение доступа</h2>
            <p>
              Оператор вправе заблокировать доступ к Сервису без предупреждения при нарушении условий
              настоящего Соглашения. При этом оплаченный период не возмещается.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">8. Применимое право</h2>
            <p>
              Настоящее Соглашение регулируется законодательством Российской Федерации.
              Все споры разрешаются путём переговоров, а при невозможности — в суде по месту
              нахождения Оператора.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">9. Изменения Соглашения</h2>
            <p>
              Оператор вправе изменять Соглашение. Актуальная версия публикуется по адресу /terms.
              Продолжение использования Сервиса означает согласие с изменениями.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
