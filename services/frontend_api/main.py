from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import os

app = FastAPI(
    title="Malmö Noise Dashboard API",
    description="Backend API serving TimescaleDB data to the presentation layer.",
    version="1.0.0"
)

# CORS Middleware: Crucial for allowing your future React/Vue frontend to fetch data safely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "timescaledb"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "noise_db"),
        user=os.getenv("DB_USER", "noise_user"),
        password=os.getenv("DB_PASSWORD", "noise_password")
    )

@app.get("/api/sensors")
def get_sensors():
    """Returns all sensors and their spatial coordinates for the Map view."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM sensors WHERE lat IS NOT NULL;")
        sensors = cursor.fetchall()
        conn.close()
        return sensors
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/measurements/latest")
def get_latest_measurements():
    """Returns the absolute latest noise reading for every sensor, joined with sensor description."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT DISTINCT ON (m.sensor_id)
                m.ts, m.sensor_id, m.value_db, m.quality_flag,
                s.description
            FROM noise_measurements m
            LEFT JOIN sensors s ON m.sensor_id = s.sensor_id
            ORDER BY m.sensor_id, m.ts DESC;
        """)
        measurements = cursor.fetchall()
        conn.close()
        return measurements
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/measurements/history")
def get_historical_measurements(hours: int = Query(default=1, ge=1, le=168)):
    """Returns noise data averaged by time bucket. 1h uses 1-min buckets, >1h uses 1-hour buckets."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if hours == 1:
            bucket = '1 minute'
            time_format = '%H:%M'
        else:
            bucket = '1 hour'
            time_format = '%m/%d %H:%M'

        cursor.execute(f"""
            SELECT
                time_bucket('{bucket}', m.ts) AS time_block,
                m.sensor_id,
                s.description,
                ROUND(AVG(m.value_db)::numeric, 1) as avg_db,
                ROUND(MAX(m.value_db)::numeric, 1) as max_db
            FROM noise_measurements m
            LEFT JOIN sensors s ON m.sensor_id = s.sensor_id
            WHERE m.ts >= NOW() - INTERVAL '{hours} HOURS'
            GROUP BY time_block, m.sensor_id, s.description
            ORDER BY time_block ASC;
        """)

        measurements = cursor.fetchall()
        conn.close()

        history_dict = {}
        for row in measurements:
            time_str = row['time_block'].strftime(time_format)
            # Use sensor_id as the chart series key to ensure uniqueness.
            label = row['sensor_id'][:25]

            if time_str not in history_dict:
                history_dict[time_str] = {"time": time_str}

            history_dict[time_str][f"avg__{label}"] = float(row['avg_db'])
            history_dict[time_str][f"max__{label}"] = float(row['max_db'])

        return list(history_dict.values())

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def get_stats():
    """Returns summary statistics for the dashboard KPI cards."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Active sensors (with GPS coords)
        cursor.execute("SELECT COUNT(*) as count FROM sensors WHERE lat IS NOT NULL;")
        active_sensors = cursor.fetchone()['count']

        # Average noise from latest reading per sensor
        cursor.execute("""
            SELECT ROUND(AVG(value_db)::numeric, 1) as avg_db
            FROM (
                SELECT DISTINCT ON (sensor_id) value_db
                FROM noise_measurements
                ORDER BY sensor_id, ts DESC
            ) latest;
        """)
        row = cursor.fetchone()
        avg_noise_db = float(row['avg_db']) if row['avg_db'] is not None else 0.0

        # Active alerts: latest readings > 70 dB
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM (
                SELECT DISTINCT ON (sensor_id) value_db
                FROM noise_measurements
                ORDER BY sensor_id, ts DESC
            ) latest
            WHERE value_db > 70;
        """)
        active_alerts = cursor.fetchone()['count']

        # Sensor health: % of sensors seen in last 2 hours
        cursor.execute("SELECT COUNT(*) as total FROM sensors;")
        total_sensors = cursor.fetchone()['total']

        cursor.execute("""
            SELECT COUNT(DISTINCT sensor_id) as count
            FROM noise_measurements
            WHERE ts >= NOW() - INTERVAL '2 HOURS';
        """)
        healthy_sensors = cursor.fetchone()['count']

        sensor_health_pct = round((healthy_sensors / total_sensors * 100), 1) if total_sensors > 0 else 0.0

        conn.close()
        return {
            "active_sensors": active_sensors,
            "avg_noise_db": avg_noise_db,
            "active_alerts": active_alerts,
            "sensor_health_pct": sensor_health_pct
        }
    except Exception as e:
        print(f"Error in /api/stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts")
def get_alerts():
    """Returns last 24h readings where value_db > 70 or value_db < 10, joined with sensor info."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT
                m.ts,
                m.sensor_id,
                m.value_db,
                m.quality_flag,
                s.description,
                CASE
                    WHEN m.value_db > 80 THEN 'Critical'
                    WHEN m.value_db > 70 THEN 'High'
                    WHEN m.value_db < 10 THEN 'Low'
                END as alert_type
            FROM noise_measurements m
            LEFT JOIN sensors s ON m.sensor_id = s.sensor_id
            WHERE m.ts >= NOW() - INTERVAL '24 HOURS'
              AND (m.value_db > 70 OR m.value_db < 10)
            ORDER BY m.ts DESC
            LIMIT 200;
        """)
        alerts = cursor.fetchall()
        conn.close()
        # Convert timestamps to strings for JSON serialisation
        result = []
        for row in alerts:
            result.append({
                "ts": row['ts'].isoformat(),
                "sensor_id": row['sensor_id'],
                "value_db": float(row['value_db']),
                "quality_flag": row['quality_flag'],
                "description": row['description'],
                "alert_type": row['alert_type']
            })
        return result
    except Exception as e:
        print(f"Error in /api/alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports/data")
def get_report_data():
    """Returns a full CSV-ready snapshot: all latest measurements joined with sensor descriptions."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT DISTINCT ON (m.sensor_id)
                m.sensor_id,
                s.description,
                s.lat,
                s.lon,
                m.value_db,
                m.ts,
                m.quality_flag
            FROM noise_measurements m
            LEFT JOIN sensors s ON m.sensor_id = s.sensor_id
            ORDER BY m.sensor_id, m.ts DESC;
        """)
        rows = cursor.fetchall()
        conn.close()
        result = []
        for row in rows:
            result.append({
                "sensor_id": row['sensor_id'],
                "description": row['description'],
                "lat": float(row['lat']) if row['lat'] is not None else None,
                "lon": float(row['lon']) if row['lon'] is not None else None,
                "value_db": float(row['value_db']) if row['value_db'] is not None else None,
                "ts": row['ts'].isoformat() if row['ts'] is not None else None,
                "quality_flag": row['quality_flag'],
            })
        return result
    except Exception as e:
        print(f"Error in /api/reports/data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sensors/health")
def get_sensor_health():
    """Returns per-sensor health status with last_seen, battery placeholder, signal placeholder."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT
                s.sensor_id,
                s.description,
                MAX(m.ts) as last_seen
            FROM sensors s
            LEFT JOIN noise_measurements m ON s.sensor_id = m.sensor_id
            GROUP BY s.sensor_id, s.description
            ORDER BY s.sensor_id;
        """)
        rows = cursor.fetchall()
        conn.close()

        from datetime import datetime, timezone

        result = []
        for row in rows:
            last_seen = row['last_seen']
            if last_seen is None:
                status = 'Critical'
                minutes_ago = None
            else:
                # Make sure last_seen is timezone-aware
                if last_seen.tzinfo is None:
                    last_seen = last_seen.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                minutes_ago = (now - last_seen).total_seconds() / 60
                if minutes_ago <= 15:
                    status = 'Operational'
                elif minutes_ago <= 60:
                    status = 'Warning'
                else:
                    status = 'Critical'

            # Deterministic battery placeholder: 55–94%
            battery_pct = sum(ord(c) for c in row['sensor_id']) % 40 + 55

            # Signal based on status
            if status == 'Operational':
                signal = 'Strong'
            elif status == 'Warning':
                signal = 'Moderate'
            else:
                signal = 'Weak'

            result.append({
                "sensor_id": row['sensor_id'],
                "description": row['description'],
                "last_seen": last_seen.isoformat() if last_seen else None,
                "status": status,
                "battery_pct": battery_pct,
                "signal": signal
            })

        return result
    except Exception as e:
        print(f"Error in /api/sensors/health: {e}")
        raise HTTPException(status_code=500, detail=str(e))
