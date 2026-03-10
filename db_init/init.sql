-- Create the sensors metadata table
CREATE TABLE IF NOT EXISTS sensors (
    sensor_id TEXT PRIMARY KEY,
    description TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
);

-- Insert our simulated sensors so the foreign keys match
INSERT INTO sensors (sensor_id, description) VALUES 
    ('sensor-malmo-01', 'Central Station'),
    ('sensor-malmo-02', 'Triangeln'),
    ('sensor-malmo-03', 'Folkets Park')
ON CONFLICT DO NOTHING;

-- Create the raw measurements table
CREATE TABLE IF NOT EXISTS noise_measurements (
    ts TIMESTAMPTZ NOT NULL,
    sensor_id TEXT NOT NULL,
    value_db DOUBLE PRECISION NOT NULL,
    unit TEXT,
    quality_flag SMALLINT,
    FOREIGN KEY (sensor_id) REFERENCES sensors (sensor_id)
);

-- Convert to a TimescaleDB hypertable partitioned by the 'ts' column
SELECT create_hypertable('noise_measurements', by_range('ts'), if_not_exists => TRUE);

-- Create index for fast per-sensor time-window queries
CREATE INDEX IF NOT EXISTS ix_sensor_ts ON noise_measurements (sensor_id, ts DESC);