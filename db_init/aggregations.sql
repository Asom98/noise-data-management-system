-- Create an hourly continuous aggregate view
CREATE MATERIALIZED VIEW hourly_noise_summary
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', ts) AS bucket,
    sensor_id,
    AVG(value_db) as avg_noise_db,
    MAX(value_db) as max_noise_db,
    MIN(value_db) as min_noise_db,
    COUNT(*) as reading_count
FROM noise_measurements
WHERE quality_flag = 1
GROUP BY bucket, sensor_id;

-- Set the refresh policy so it updates automatically in the background
SELECT add_continuous_aggregate_policy('hourly_noise_summary',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');