from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json
import anthropic

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
                ROUND(MAX(m.value_db)::numeric, 1) as max_db,
                ROUND(AVG(m.lamin_db)::numeric, 1) as avg_lamin_db
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
            if row['avg_lamin_db'] is not None:
                history_dict[time_str][f"lamin__{label}"] = float(row['avg_lamin_db'])

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

        # Active alerts: based on lamax (high) and lamin (low), fallback to value_db for old rows
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM (
                SELECT DISTINCT ON (sensor_id) value_db, lamax_db, lamin_db
                FROM noise_measurements
                ORDER BY sensor_id, ts DESC
            ) latest
            WHERE COALESCE(lamax_db, value_db) > 80 OR COALESCE(lamin_db, value_db) < 25;
        """)
        active_alerts = cursor.fetchone()['count']

        # Peak sensor: sensor with the highest current reading
        cursor.execute("""
            SELECT sensor_id, value_db
            FROM (
                SELECT DISTINCT ON (sensor_id) sensor_id, value_db
                FROM noise_measurements
                ORDER BY sensor_id, ts DESC
            ) latest
            ORDER BY value_db DESC
            LIMIT 1;
        """)
        peak_row = cursor.fetchone()
        peak_sensor_id = peak_row['sensor_id'] if peak_row else None
        peak_noise_db = float(peak_row['value_db']) if peak_row else None

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
            "peak_sensor_id": peak_sensor_id,
            "peak_noise_db": peak_noise_db,
            "active_alerts": active_alerts,
            "sensor_health_pct": sensor_health_pct
        }
    except Exception as e:
        print(f"Error in /api/stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts")
def get_alerts():
    """Returns last 24h readings where value_db > 80 (warning/critical) or value_db < 25 (low outlier), joined with sensor info."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT
                m.ts,
                m.sensor_id,
                m.value_db,
                m.lamax_db,
                m.lamin_db,
                m.quality_flag,
                s.description,
                CASE
                    WHEN COALESCE(m.lamax_db, m.value_db) > 90 THEN 'Critical'
                    WHEN COALESCE(m.lamax_db, m.value_db) > 80 THEN 'Warning'
                    WHEN COALESCE(m.lamin_db, m.value_db) < 25 THEN 'Low'
                END as alert_type
            FROM noise_measurements m
            LEFT JOIN sensors s ON m.sensor_id = s.sensor_id
            WHERE m.ts >= NOW() - INTERVAL '24 HOURS'
              AND (
                COALESCE(m.lamax_db, m.value_db) > 80
                OR COALESCE(m.lamin_db, m.value_db) < 25
              )
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
                "lamax_db": float(row['lamax_db']) if row['lamax_db'] is not None else None,
                "lamin_db": float(row['lamin_db']) if row['lamin_db'] is not None else None,
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


# ── Chat endpoint ──────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

def _db_get_stats():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT COUNT(*) as count FROM sensors WHERE lat IS NOT NULL;")
    active_sensors = cur.fetchone()['count']
    cur.execute("""
        SELECT ROUND(AVG(value_db)::numeric, 1) as avg_db
        FROM (SELECT DISTINCT ON (sensor_id) value_db FROM noise_measurements ORDER BY sensor_id, ts DESC) latest;
    """)
    row = cur.fetchone()
    avg_noise_db = float(row['avg_db']) if row and row['avg_db'] is not None else 0.0
    cur.execute("""
        SELECT COUNT(*) as count FROM (
            SELECT DISTINCT ON (sensor_id) value_db FROM noise_measurements ORDER BY sensor_id, ts DESC
        ) latest WHERE value_db > 80 OR value_db < 25;
    """)
    active_alerts = cur.fetchone()['count']
    cur.execute("""
        SELECT sensor_id, value_db FROM (
            SELECT DISTINCT ON (sensor_id) sensor_id, value_db FROM noise_measurements ORDER BY sensor_id, ts DESC
        ) latest ORDER BY value_db DESC LIMIT 1;
    """)
    peak = cur.fetchone()
    conn.close()
    return {
        "active_sensors": active_sensors,
        "avg_noise_db": avg_noise_db,
        "active_alerts": active_alerts,
        "peak_sensor_id": peak['sensor_id'] if peak else None,
        "peak_noise_db": float(peak['value_db']) if peak else None,
    }

def _db_get_latest_readings():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT DISTINCT ON (m.sensor_id) m.ts, m.sensor_id, m.value_db, s.description
        FROM noise_measurements m LEFT JOIN sensors s ON m.sensor_id = s.sensor_id
        ORDER BY m.sensor_id, m.ts DESC;
    """)
    rows = cur.fetchall()
    conn.close()
    return [{"sensor_id": r['sensor_id'], "description": r['description'],
             "value_db": float(r['value_db']), "ts": r['ts'].isoformat()} for r in rows]

def _db_get_recent_alerts(hours: int = 24):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"""
        SELECT m.ts, m.sensor_id, m.value_db, s.description,
            CASE WHEN m.value_db > 90 THEN 'Critical' WHEN m.value_db > 80 THEN 'Warning' ELSE 'Low' END as alert_type
        FROM noise_measurements m LEFT JOIN sensors s ON m.sensor_id = s.sensor_id
        WHERE m.ts >= NOW() - INTERVAL '{hours} HOURS' AND (m.value_db > 80 OR m.value_db < 25)
        ORDER BY m.ts DESC LIMIT 50;
    """)
    rows = cur.fetchall()
    conn.close()
    return [{"sensor_id": r['sensor_id'], "description": r['description'],
             "value_db": float(r['value_db']), "alert_type": r['alert_type'],
             "ts": r['ts'].isoformat()} for r in rows]

CHAT_TOOLS = [
    {
        "name": "get_current_stats",
        "description": "Returns current dashboard KPIs: number of active sensors, average noise level, active alert count, and the sensor with the highest current reading.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_latest_readings",
        "description": "Returns the most recent noise reading (dB) for every sensor, including sensor ID, description/location, and timestamp.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_recent_alerts",
        "description": "Returns outlier noise readings from the last N hours (Warning >80 dB, Critical >90 dB, Low <25 dB).",
        "input_schema": {
            "type": "object",
            "properties": {
                "hours": {"type": "integer", "description": "How many hours back to look. Default 24.", "default": 24}
            },
            "required": []
        },
    },
]

SYSTEM_PROMPT = """You are an AI assistant embedded in the Malmö Noise Monitoring Dashboard — a real-time system that tracks urban noise levels across Malmö, Sweden using distributed IoT sensors.

You have access to live sensor data via tools. Use them whenever a question requires current data.

Key thresholds:
- Normal: < 70 dB
- Elevated: 70–80 dB
- Warning / Approaching attention required: 80–90 dB
- Critical / Immediate attention required: > 90 dB
- Low outlier: < 25 dB

Be concise and factual. Format numbers with one decimal place. When listing sensors, show the sensor ID and location. Respond in the same language the user writes in (English or Swedish)."""

@app.post("/api/chat")
async def chat(req: ChatRequest):
    """AI chat endpoint using Claude with tool use for live sensor data access."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "your_anthropic_api_key_here":
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    client = anthropic.Anthropic(api_key=api_key)
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    # Agentic loop — runs until Claude stops calling tools
    for _ in range(8):
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            system=[{
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"}
            }],
            tools=CHAT_TOOLS,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            text = next((b.text for b in response.content if hasattr(b, "text")), "")
            return {"response": text}

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                try:
                    if block.name == "get_current_stats":
                        result = _db_get_stats()
                    elif block.name == "get_latest_readings":
                        result = _db_get_latest_readings()
                    elif block.name == "get_recent_alerts":
                        hours = block.input.get("hours", 24)
                        result = _db_get_recent_alerts(hours)
                    else:
                        result = {"error": "unknown tool"}
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    })
                except Exception as e:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps({"error": str(e)}),
                        "is_error": True,
                    })
            messages.append({"role": "user", "content": tool_results})
        else:
            break

    raise HTTPException(status_code=500, detail="Chat loop did not produce a response")
