-- Карточки предприятий (юридические данные)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    organization_type TEXT,
    inn TEXT,
    kpp TEXT,
    ogrn TEXT,
    okpo TEXT,
    okved TEXT,
    legal_address TEXT,
    actual_address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    director_name TEXT,
    director_position TEXT,
    chief_accountant TEXT,
    bank_name TEXT,
    bank_bik TEXT,
    bank_account TEXT,
    bank_corr_account TEXT,
    license_number TEXT,
    license_issued_by TEXT,
    license_issued_at DATE,
    license_expires_at DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Документы предприятий (устав, свидетельства, лицензии и т.д.)
CREATE TABLE IF NOT EXISTS company_documents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    doc_type TEXT NOT NULL,
    doc_name TEXT NOT NULL,
    doc_number TEXT,
    issued_by TEXT,
    issued_at DATE,
    expires_at DATE,
    file_url TEXT,
    file_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_documents_company ON company_documents(company_id);
