-- Таблица операций с наличными средствами
CREATE TABLE cash_operations (
    id SERIAL PRIMARY KEY,
    operation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    operation_type VARCHAR(30) NOT NULL CHECK (operation_type IN ('income', 'expense')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('salary_payment', 'loan', 'loan_repayment', 'household', 'fuel', 'other_income', 'other_expense')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),

    -- Общие поля
    description TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    organization VARCHAR(255),

    -- Для займа сотруднику
    employee_name VARCHAR(255),
    loan_term_days INTEGER,
    monthly_deduction NUMERIC(12,2),

    -- Для хоз. расходов
    recipient_name VARCHAR(255),
    purpose TEXT,

    -- Для выплаты ЗП
    salary_period VARCHAR(50)
);

CREATE INDEX idx_cash_operations_date ON cash_operations(operation_date);
CREATE INDEX idx_cash_operations_type ON cash_operations(operation_type);
CREATE INDEX idx_cash_operations_category ON cash_operations(category);
