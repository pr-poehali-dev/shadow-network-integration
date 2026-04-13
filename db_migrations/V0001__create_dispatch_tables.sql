
CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  number VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE buses (
  id SERIAL PRIMARY KEY,
  board_number VARCHAR(50) NOT NULL UNIQUE,
  model VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conductors (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE schedule_entries (
  id SERIAL PRIMARY KEY,
  work_date DATE NOT NULL,
  route_id INTEGER NOT NULL REFERENCES routes(id),
  bus_id INTEGER REFERENCES buses(id),
  driver_id INTEGER REFERENCES drivers(id),
  conductor_id INTEGER REFERENCES conductors(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schedule_date ON schedule_entries(work_date);
