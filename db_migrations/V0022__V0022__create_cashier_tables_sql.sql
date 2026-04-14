-- Отчёт кассира за день: покупюрная таблица + безнал по каждому ТС
CREATE TABLE cashier_reports (
    id SERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    schedule_entry_id INTEGER,
    board_number VARCHAR(50),
    gov_number VARCHAR(50),
    driver_name VARCHAR(255),
    route_number VARCHAR(50),
    graph_number INTEGER,
    organization VARCHAR(255),
    bills_5000 INTEGER NOT NULL DEFAULT 0,
    bills_2000 INTEGER NOT NULL DEFAULT 0,
    bills_1000 INTEGER NOT NULL DEFAULT 0,
    bills_500  INTEGER NOT NULL DEFAULT 0,
    bills_200  INTEGER NOT NULL DEFAULT 0,
    bills_100  INTEGER NOT NULL DEFAULT 0,
    bills_50   INTEGER NOT NULL DEFAULT 0,
    bills_10   INTEGER NOT NULL DEFAULT 0,
    coins_10   INTEGER NOT NULL DEFAULT 0,
    coins_5    INTEGER NOT NULL DEFAULT 0,
    coins_2    INTEGER NOT NULL DEFAULT 0,
    coins_1    INTEGER NOT NULL DEFAULT 0,
    cashless_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_overtime BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_cashier_reports_entry ON cashier_reports(report_date, schedule_entry_id) WHERE schedule_entry_id IS NOT NULL;
CREATE INDEX idx_cashier_reports_date ON cashier_reports(report_date);
CREATE INDEX idx_cashier_reports_org ON cashier_reports(organization);

-- Ограничения на выдачу наличных (устанавливает бухгалтер)
CREATE TABLE cash_restrictions (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER,
    driver_name VARCHAR(255),
    reason TEXT NOT NULL,
    restriction_type VARCHAR(50) NOT NULL DEFAULT 'block',
    limit_amount NUMERIC(12,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at DATE
);

CREATE INDEX idx_cash_restrictions_driver ON cash_restrictions(driver_id);
CREATE INDEX idx_cash_restrictions_active ON cash_restrictions(is_active);
