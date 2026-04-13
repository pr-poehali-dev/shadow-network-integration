CREATE TABLE route_graphs (
  id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES routes(id),
  graph_number INTEGER NOT NULL CHECK (graph_number BETWEEN 1 AND 10),
  work_date DATE NOT NULL,
  board_number VARCHAR(20),
  gov_number VARCHAR(20),
  driver_name VARCHAR(255),
  conductor_name VARCHAR(255),
  trips_planned INTEGER,
  trips_actual INTEGER,
  shortage_reason TEXT,
  departure_time TIME,
  arrival_time TIME,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_route_graphs_unique ON route_graphs(route_id, graph_number, work_date);
CREATE INDEX idx_route_graphs_route_id ON route_graphs(route_id);
CREATE INDEX idx_route_graphs_work_date ON route_graphs(work_date);
