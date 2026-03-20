import { useNavigate } from "react-router-dom";

export default function Privacy() {
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
        <h1 className="text-2xl font-black mb-2">Политика конфиденциальности</h1>
        <p className="text-sm text-muted-foreground mb-8">Редакция от {date}</p>

        <div className="prose prose-sm prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">1. Общие положения</h2>
            <p>
              Настоящая Политика конфиденциальности (далее — «Политика») описывает, какие данные
              собирает сервис «Страж» (далее — «Сервис»), как они используются и как защищаются.
              Сервис предоставляется физическим лицом — разработчиком (далее — «Оператор»).
            </p>
            <p>
              Используя Сервис, вы соглашаетесь с условиями настоящей Политики. Если вы не согласны,
              пожалуйста, прекратите использование Сервиса.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">2. Какие данные мы собираем</h2>
            <p>Сервис собирает исключительно технические данные, необходимые для его работы:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Уникальный числовой идентификатор пользователя мессенджера Max (User ID)</li>
              <li>Имя пользователя и отображаемое имя в мессенджере (при наличии)</li>
              <li>Дата и время первого обращения к Сервису</li>
              <li>Статус подписки (пробный период, активная, истекшая)</li>
              <li>История платежей (сумма, дата, идентификатор транзакции)</li>
            </ul>
            <p className="text-amber-400/80 text-xs border border-amber-500/20 bg-amber-500/5 rounded-lg p-3">
              Сервис не собирает и не хранит: паспортные данные, биометрию, номера телефонов,
              адреса электронной почты, геолокацию, содержимое личных переписок.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">3. Цели обработки данных</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Идентификация пользователя и управление доступом к функциям Сервиса</li>
              <li>Отслеживание статуса пробного периода и платной подписки</li>
              <li>Предотвращение злоупотреблений и обходов ограничений</li>
              <li>Отправка уведомлений об истечении пробного периода</li>
              <li>Ведение финансовой отчётности</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">4. Пробный период и привязка к User ID</h2>
            <p>
              Пробный период привязан к уникальному User ID мессенджера Max. Создание нового аккаунта
              с целью получения повторного пробного доступа является нарушением настоящей Политики
              и Пользовательского соглашения. Оператор вправе заблокировать доступ к Сервису при
              обнаружении попыток обхода ограничений.
            </p>
            <p>
              Длительность пробного периода может быть изменена Оператором в одностороннем порядке.
              Изменения применяются исключительно к новым пользователям. Для пользователей, у которых
              пробный период уже активирован, условия сохраняются до его истечения.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">5. Хранение и защита данных</h2>
            <p>
              Данные хранятся на серверах в Российской Федерации. Доступ к базе данных имеет только
              Оператор. Передача данных третьим лицам не осуществляется, за исключением случаев,
              предусмотренных законодательством РФ.
            </p>
            <p>
              Платежи обрабатываются через сертифицированный платёжный сервис ЮMoney. Реквизиты
              банковских карт Оператором не хранятся.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">6. Права пользователей</h2>
            <p>Вы вправе:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Запросить информацию о данных, связанных с вашим User ID</li>
              <li>Потребовать удаления ваших данных (при этом доступ к Сервису прекратится)</li>
            </ul>
            <p>Запросы направляются через центр поддержки: <a href="https://poehali.dev/help" className="text-cyan-400 hover:underline" target="_blank" rel="noreferrer">poehali.dev/help</a></p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">7. Изменения Политики</h2>
            <p>
              Оператор вправе изменять настоящую Политику. Актуальная версия всегда доступна по адресу
              /privacy. Продолжение использования Сервиса после публикации изменений означает согласие
              с новой редакцией.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
