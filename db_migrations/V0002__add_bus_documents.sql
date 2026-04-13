CREATE TABLE bus_documents (
  id SERIAL PRIMARY KEY,
  bus_id INTEGER NOT NULL REFERENCES buses(id),
  doc_type VARCHAR(50) NOT NULL,
  doc_number VARCHAR(100),
  issued_at DATE,
  expires_at DATE,
  file_url TEXT,
  file_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bus_documents_bus_id ON bus_documents(bus_id);
CREATE INDEX idx_bus_documents_expires ON bus_documents(expires_at);
