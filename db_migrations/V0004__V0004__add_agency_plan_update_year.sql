-- Добавляем тариф Агентство (5 групп)
INSERT INTO strazh_pricing (plan, label, price_rub, days, badge, sort_order)
VALUES ('agency', 'Агентство', 990, 30, '5 групп', 4)
ON CONFLICT (plan) DO UPDATE
SET label = EXCLUDED.label, price_rub = EXCLUDED.price_rub,
    days = EXCLUDED.days, badge = EXCLUDED.badge, sort_order = EXCLUDED.sort_order;

-- Обновляем годовой тариф — добавляем бейдж и правильную скидку
UPDATE strazh_pricing SET price_rub = 390, badge = '-34%' WHERE plan = 'year';
