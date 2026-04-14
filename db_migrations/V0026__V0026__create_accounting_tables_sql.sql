-- Банковские транзакции (загрузка из 1С / ручной ввод)
CREATE TABLE IF NOT EXISTS bank_transactions (
    id SERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL,
    direction VARCHAR(10) NOT NULL DEFAULT 'debit', -- debit=расход, credit=приход
    amount NUMERIC(15,2) NOT NULL,
    counterparty VARCHAR(500),         -- поставщик / получатель
    counterparty_inn VARCHAR(20),
    category VARCHAR(50) DEFAULT 'other', -- supplier, leasing, utilities, tax, salary, loan, other
    purpose TEXT,                      -- назначение платежа
    account_number VARCHAR(50),        -- расчётный счёт
    bank_name VARCHAR(255),
    document_number VARCHAR(100),
    organization VARCHAR(255),
    source VARCHAR(20) DEFAULT 'manual', -- manual, import_1c
    import_batch VARCHAR(100),         -- ID пакета импорта из 1С
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_tx_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_tx_category ON bank_transactions(category);
CREATE INDEX IF NOT EXISTS idx_bank_tx_counterparty ON bank_transactions(counterparty);

-- Налоговые платежи (ЕНС и прочие)
CREATE TABLE IF NOT EXISTS tax_payments (
    id SERIAL PRIMARY KEY,
    payment_date DATE,
    due_date DATE NOT NULL,
    tax_type VARCHAR(100) NOT NULL,    -- НДС, налог на прибыль, НДФЛ, взносы, ЕНС и т.д.
    period_year INTEGER,
    period_month INTEGER,
    accrued_amount NUMERIC(15,2),      -- начислено
    paid_amount NUMERIC(15,2) DEFAULT 0, -- уплачено
    status VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid, overdue
    ens_balance NUMERIC(15,2),         -- остаток на ЕНС
    organization VARCHAR(255),
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tax_due_date ON tax_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_status ON tax_payments(status);

-- Кредиторская задолженность
CREATE TABLE IF NOT EXISTS creditors (
    id SERIAL PRIMARY KEY,
    counterparty VARCHAR(500) NOT NULL,
    counterparty_inn VARCHAR(20),
    debt_type VARCHAR(50) DEFAULT 'supplier', -- supplier, leasing, loan, other
    contract_number VARCHAR(100),
    contract_date DATE,
    original_amount NUMERIC(15,2),
    current_debt NUMERIC(15,2) NOT NULL,
    overdue_amount NUMERIC(15,2) DEFAULT 0,
    last_payment_date DATE,
    next_payment_date DATE,
    next_payment_amount NUMERIC(15,2),
    organization VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_creditors_active ON creditors(is_active);
CREATE INDEX IF NOT EXISTS idx_creditors_next_payment ON creditors(next_payment_date);

-- Предстоящие платежи (планировщик)
CREATE TABLE IF NOT EXISTS upcoming_payments (
    id SERIAL PRIMARY KEY,
    due_date DATE NOT NULL,
    payment_type VARCHAR(50) NOT NULL, -- tax, leasing, supplier, salary, utilities, loan, other
    counterparty VARCHAR(500),
    description TEXT NOT NULL,
    planned_amount NUMERIC(15,2) NOT NULL,
    paid_amount NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'planned', -- planned, paid, partial, cancelled
    is_recurring BOOLEAN DEFAULT FALSE,
    recur_day INTEGER,                 -- день месяца для повторяющихся
    organization VARCHAR(255),
    bank_transaction_id INTEGER,       -- связь с фактической транзакцией
    notify_days_before INTEGER DEFAULT 5,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upcoming_due ON upcoming_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_upcoming_status ON upcoming_payments(status);

-- Лизинговые договора
CREATE TABLE IF NOT EXISTS leasing_contracts (
    id SERIAL PRIMARY KEY,
    lessor VARCHAR(500) NOT NULL,      -- лизингодатель
    contract_number VARCHAR(100),
    contract_date DATE,
    object_description TEXT,           -- предмет лизинга (марка/модель ТС)
    bus_id INTEGER,
    total_amount NUMERIC(15,2),        -- общая сумма договора
    monthly_payment NUMERIC(15,2),     -- ежемесячный платёж
    payment_day INTEGER,               -- день оплаты
    start_date DATE,
    end_date DATE,
    payments_total INTEGER,            -- всего платежей
    payments_made INTEGER DEFAULT 0,   -- оплачено платежей
    remaining_debt NUMERIC(15,2),      -- остаток долга
    organization VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leasing_active ON leasing_contracts(is_active);
