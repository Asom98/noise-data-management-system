-- Create the sensors metadata table
CREATE TABLE IF NOT EXISTS sensors (
    sensor_id TEXT PRIMARY KEY,
    description TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
);

-- Real Malmö sensor GPS coordinates (WGS84) — seeded once at DB init.
-- sensor_id matches the "name" field from the Yggio IoT platform.
-- Description is the human-readable street location; updated on each ingestion cycle.
INSERT INTO sensors (sensor_id, description, lat, lon) VALUES
    ('DN0007-Buller Spångatan x Bergsgatan',         'Spångatan x Bergsgatan',              55.5962, 13.0087),
    ('DN0008-Buller Västravarvsgatan',               'Västravarvsgatan',                    55.6119, 12.9774),
    ('DN0009-Buller Bergsgatan 17',                  'Bergsgatan 17',                       55.5986, 13.0076),
    ('DN0010-Buller Föreningsgatan x Disponentgatan','Föreningsgatan x Disponentgatan',     55.5965, 13.0163),
    ('DN0011-Buller Fersens v. x E. Dahlbergsg.',   'Fersens v. x E. Dahlbergsg.',         55.5994, 12.9972)
ON CONFLICT (sensor_id) DO UPDATE
    SET lat = EXCLUDED.lat,
        lon = EXCLUDED.lon,
        description = EXCLUDED.description;

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