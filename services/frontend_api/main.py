from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt as jose_jwt
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from typing import Optional
from datetime import datetime, timezone, timedelta

# ─── Auth config ──────────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET   = os.getenv("JWT_SECRET", "malmo-noise-secret-2026")
JWT_ALG      = "HS256"
JWT_EXPIRE_H = 24

bearer_scheme = HTTPBearer()

def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(username: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_H)
    return jose_jwt.encode({"sub": username, "role": role, "exp": exp}, JWT_SECRET, algorithm=JWT_ALG)

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    try:
        payload = jose_jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        return {"username": payload["sub"], "role": payload["role"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ─── App ──────────────────────────────────────────────────────────────────────

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

# ─── DB helper ────────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "timescaledb"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "noise_db"),
        user=os.getenv("DB_USER", "noise_user"),
        password=os.getenv("DB_PASSWORD", "noise_password")
    )

# ─── Startup: seed admin user ─────────────────────────────────────────────────

@app.on_event("startup")
def seed_admin():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        cur.execute("SELECT 1 FROM users WHERE username = %s", ('mårten',))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
                ('mårten', hash_password('0046'), 'admin')
            )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Startup seed error: {e}")

# ─── Auth request models ──────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "user"

# ─── Auth endpoints ───────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM users WHERE username = %s", (req.username,))
    row = cur.fetchone()
    conn.close()
    if not row or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(row["username"], row["role"])
    return {"token": token, "user": {"username": row["username"], "role": row["role"]}}

@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    return user

# ─── User management endpoints ────────────────────────────────────────────────

@app.get("/api/users")
def list_users(user: dict = Depends(require_admin)):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT id, username, role, created_at FROM users ORDER BY created_at ASC")
    rows = cur.fetchall()
    conn.close()
    return [{"id": r["id"], "username": r["username"], "role": r["role"],
             "created_at": r["created_at"].isoformat() if r["created_at"] else None} for r in rows]

@app.post("/api/users")
def create_user(req: CreateUserRequest, user: dict = Depends(require_admin)):
    valid_roles = ("admin", "environmental_officer", "it_staff", "citizen")
    if req.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(valid_roles)}")
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
            (req.username, hash_password(req.password), req.role)
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Username already exists")
    finally:
        cur.close()
        conn.close()
    return {"ok": True}

@app.delete("/api/users/{username}")
def delete_user(username: str, user: dict = Depends(require_admin)):
    if username == user["username"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    conn = get_db()
    cur = conn.cursor()
    # Prevent removing last admin
    cur.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
    admin_count = cur.fetchone()[0]
    cur.execute("SELECT role FROM users WHERE username = %s", (username,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row[0] == 'admin' and admin_count <= 1:
        raise HTTPException(status_code=400, detail="Cannot remove the last admin")
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    conn.commit()
    cur.close()
    conn.close()
    return {"ok": True}

# ─── Data endpoints (all require authentication) ──────────────────────────────

@app.get("/api/db/summary")
def get_db_summary(_user: dict = Depends(get_current_user)):
    """Returns a summary of what's in the database: total records, per-sensor counts, time range."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT COUNT(*) as total FROM noise_measurements;")
        total = cursor.fetchone()['total']

        cursor.execute("SELECT MIN(ts) as oldest, MAX(ts) as newest FROM noise_measurements;")
        row = cursor.fetchone()

        cursor.execute("""
            SELECT m.sensor_id, s.description, COUNT(*) as record_count,
                   ROUND(AVG(m.value_db)::numeric, 1) as avg_db,
                   ROUND(MIN(m.value_db)::numeric, 1) as min_db,
                   ROUND(MAX(m.value_db)::numeric, 1) as max_db,
                   MAX(m.ts) as last_seen
            FROM noise_measurements m
            LEFT JOIN sensors s ON m.sensor_id = s.sensor_id
            GROUP BY m.sensor_id, s.description
            ORDER BY m.sensor_id;
        """)
        per_sensor = cursor.fetchall()
        conn.close()

        return {
            "total_records": total,
            "oldest": row['oldest'].isoformat() if row['oldest'] else None,
            "newest": row['newest'].isoformat() if row['newest'] else None,
            "per_sensor": [
                {
                    "sensor_id": r['sensor_id'],
                    "description": r['description'],
                    "record_count": r['record_count'],
                    "avg_db": float(r['avg_db']) if r['avg_db'] else None,
                    "min_db": float(r['min_db']) if r['min_db'] else None,
                    "max_db": float(r['max_db']) if r['max_db'] else None,
                    "last_seen": r['last_seen'].isoformat() if r['last_seen'] else None,
                }
                for r in per_sensor
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/db/raw")
def get_raw_measurements(
    _user: dict = Depends(get_current_user),
    sensor_id: str = Query(default=None),
    limit: int = Query(default=50, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
    from_dt: Optional[str] = Query(default=None),
    to_dt: Optional[str] = Query(default=None),
):
    """Returns paginated raw measurements, optionally filtered by sensor and date range."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        conditions, params = [], []
        if sensor_id:
            conditions.append("m.sensor_id = %s"); params.append(sensor_id)
        if from_dt:
            conditions.append("m.ts >= %s::timestamptz"); params.append(from_dt)
        if to_dt:
            conditions.append("m.ts <= %s::timestamptz"); params.append(to_dt)
        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        cursor.execute(f"""
            SELECT m.ts, m.sensor_id, s.description, m.value_db, m.unit, m.quality_flag
            FROM noise_measurements m
            LEFT JOIN sensors s ON m.sensor_id = s.sensor_id
            {where}
            ORDER BY m.ts DESC
            LIMIT %s OFFSET %s;
        """, params + [limit, offset])
        rows = cursor.fetchall()

        cursor.execute(f"SELECT COUNT(*) as total FROM noise_measurements m {where};", params)
        total = cursor.fetchone()['total']
        conn.close()

        return {
            "total": total,
            "offset": offset,
            "limit": limit,
            "rows": [
                {
                    "ts": r['ts'].isoformat(),
                    "sensor_id": r['sensor_id'],
                    "description": r['description'],
                    "value_db": float(r['value_db']),
                    "unit": r['unit'],
                    "quality_flag": r['quality_flag'],
                }
                for r in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sensors")
def get_sensors(_user: dict = Depends(get_current_user)):
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
def get_latest_measurements(_user: dict = Depends(get_current_user)):
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
def get_historical_measurements(
    _user: dict = Depends(get_current_user),
    hours: int = Query(default=1, ge=1, le=8760),
    from_dt: Optional[str] = Query(default=None),
    to_dt: Optional[str] = Query(default=None),
):
    """Returns noise data averaged by time bucket, supports hours or explicit date range."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if from_dt and to_dt:
            dt_from = datetime.fromisoformat(from_dt.replace('Z', '+00:00'))
            dt_to   = datetime.fromisoformat(to_dt.replace('Z', '+00:00'))
            span_h  = max(1, (dt_to - dt_from).total_seconds() / 3600)
            where_clause = "m.ts >= %(from_dt)s::timestamptz AND m.ts <= %(to_dt)s::timestamptz"
            q_params = {'from_dt': from_dt, 'to_dt': to_dt}
        else:
            span_h = hours
            where_clause = f"m.ts >= NOW() - INTERVAL '{hours} HOURS'"
            q_params = None

        if span_h <= 2:    bucket = '1 minute'
        elif span_h <= 12: bucket = '5 minutes'
        elif span_h <= 72: bucket = '1 hour'
        else:              bucket = '6 hours'

        cursor.execute(f"""
            SELECT
                time_bucket('{bucket}', m.ts) AS time_block,
                m.sensor_id,
                s.description,
                ROUND(AVG(m.value_db)::numeric, 1) as avg_db,
                ROUND(MAX(m.value_db)::numeric, 1) as max_db
            FROM noise_measurements m
            LEFT JOIN sensors s ON m.sensor_id = s.sensor_id
            WHERE {where_clause}
            GROUP BY time_block, m.sensor_id, s.description
            ORDER BY time_block ASC;
        """, q_params)

        measurements = cursor.fetchall()

        # Fetch all registered sensors so every sensor appears in the chart
        # even if it has no readings in the requested window.
        cursor.execute("SELECT sensor_id FROM sensors WHERE lat IS NOT NULL ORDER BY sensor_id;")
        all_labels = [r['sensor_id'][:25] for r in cursor.fetchall()]
        conn.close()

        # Return ISO timestamps — the frontend converts to local time so the
        # chart labels are never displayed in the wrong timezone.
        history_dict = {}
        for row in measurements:
            time_key = row['time_block'].isoformat()
            label = row['sensor_id'][:25]

            if time_key not in history_dict:
                history_dict[time_key] = {"time": time_key}

            history_dict[time_key][f"avg__{label}"] = float(row['avg_db']) if row['avg_db'] is not None else None
            history_dict[time_key][f"max__{label}"] = float(row['max_db']) if row['max_db'] is not None else None

        result = list(history_dict.values())

        # Guarantee every sensor key exists in at least the first row so the
        # frontend legend always shows all sensors regardless of data gaps.
        if result:
            first = result[0]
            for label in all_labels:
                if f"avg__{label}" not in first:
                    first[f"avg__{label}"] = None
                    first[f"max__{label}"] = None

        return result

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def get_stats(_user: dict = Depends(get_current_user)):
    """Returns summary statistics for the dashboard KPI cards."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Active sensors (with GPS coords)
        cursor.execute("SELECT COUNT(*) as count FROM sensors WHERE lat IS NOT NULL;")
        active_sensors = cursor.fetchone()['count']

        # Max noise from latest reading per sensor (and which sensor)
        cursor.execute("""
            SELECT sensor_id, ROUND(value_db::numeric, 1) as max_db
            FROM (
                SELECT DISTINCT ON (sensor_id) sensor_id, value_db
                FROM noise_measurements
                ORDER BY sensor_id, ts DESC
            ) latest
            ORDER BY value_db DESC
            LIMIT 1;
        """)
        row = cursor.fetchone()
        max_noise_db = float(row['max_db']) if row and row['max_db'] is not None else 0.0
        max_noise_sensor_id = row['sensor_id'] if row else None

        # Active alerts: latest readings >= 80 dB (Warning) or >= 90 dB (Critical)
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM (
                SELECT DISTINCT ON (sensor_id) value_db
                FROM noise_measurements
                ORDER BY sensor_id, ts DESC
            ) latest
            WHERE value_db >= 80;
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
            "max_noise_db": max_noise_db,
            "max_noise_sensor_id": max_noise_sensor_id,
            "active_alerts": active_alerts,
            "sensor_health_pct": sensor_health_pct
        }
    except Exception as e:
        print(f"Error in /api/stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts")
def get_alerts(
    _user: dict = Depends(get_current_user),
    from_dt: Optional[str] = Query(default=None),
    to_dt: Optional[str] = Query(default=None),
):
    """Returns alert readings (≥80 dB or <25 dB). Defaults to last 24h; supports date range."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if from_dt and to_dt:
            time_filter = "m.ts >= %(from_dt)s::timestamptz AND m.ts <= %(to_dt)s::timestamptz"
            q_params = {'from_dt': from_dt, 'to_dt': to_dt}
        else:
            time_filter = "m.ts >= NOW() - INTERVAL '24 HOURS'"
            q_params = None

        cursor.execute(f"""
            SELECT
                m.ts,
                m.sensor_id,
                m.value_db,
                m.quality_flag,
                s.description,
                CASE
                    WHEN m.value_db >= 90 THEN 'Critical'
                    WHEN m.value_db >= 80 THEN 'High'
                    WHEN m.value_db < 25  THEN 'Low'
                END as alert_type
            FROM noise_measurements m
            LEFT JOIN sensors s ON m.sensor_id = s.sensor_id
            WHERE {time_filter}
              AND (m.value_db >= 80 OR m.value_db < 25)
            ORDER BY m.ts DESC
            LIMIT 500;
        """, q_params)
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
def get_report_data(_user: dict = Depends(get_current_user)):
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
def get_sensor_health(_user: dict = Depends(get_current_user)):
    """
    Returns per-sensor health metrics based on Data Availability Rate (DAR).

    DAR = observed readings in the last 24 h / expected readings (1 440 at 60-second poll interval).
    Max Gap = longest consecutive silence between readings in the last 24 h (minutes).

    Status classification:
      Operational — DAR >= 80 %
      Warning     — DAR 40–80 %
      Critical    — DAR < 40 % or no data in last 24 h
    """
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # One query with three CTEs:
        # - gap_data:   inter-reading gaps per sensor over the last 24 h
        # - health:     readings count + max gap per sensor
        # - median_gap: median normal inter-reading gap over the last 30 days
        #               (gaps > 3600 s are excluded — those are outages, not the
        #               sensor's natural reporting interval)
        #   expected_per_day = 86400 / median_gap_s
        #   This baseline is stable: it reflects the sensor's hardware-level cadence
        #   and does NOT drift down when the sensor degrades, so DAR will correctly
        #   fall when readings are missed.
        cursor.execute("""
            WITH gap_data AS (
                SELECT
                    sensor_id,
                    ts,
                    LAG(ts) OVER (PARTITION BY sensor_id ORDER BY ts) AS prev_ts
                FROM noise_measurements
                WHERE ts >= NOW() - INTERVAL '24 hours'
            ),
            health AS (
                SELECT
                    sensor_id,
                    COUNT(*) AS readings_24h,
                    MAX(
                        EXTRACT(EPOCH FROM (ts - prev_ts)) / 60.0
                    ) AS max_gap_minutes
                FROM gap_data
                GROUP BY sensor_id
            ),
            all_gaps AS (
                SELECT
                    sensor_id,
                    EXTRACT(EPOCH FROM (ts - LAG(ts) OVER (
                        PARTITION BY sensor_id ORDER BY ts
                    ))) AS gap_s
                FROM noise_measurements
                WHERE ts >= NOW() - INTERVAL '30 days'
            ),
            median_gap AS (
                SELECT
                    sensor_id,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gap_s) AS median_gap_s
                FROM all_gaps
                WHERE gap_s BETWEEN 60 AND 3600
                GROUP BY sensor_id
            )
            SELECT
                s.sensor_id,
                s.description,
                MAX(m.ts)                        AS last_seen,
                COALESCE(h.readings_24h, 0)      AS readings_24h,
                h.max_gap_minutes,
                86400.0 / NULLIF(mg.median_gap_s, 0) AS expected_per_day
            FROM sensors s
            LEFT JOIN noise_measurements m  ON s.sensor_id = m.sensor_id
            LEFT JOIN health h              ON s.sensor_id = h.sensor_id
            LEFT JOIN median_gap mg         ON s.sensor_id = mg.sensor_id
            GROUP BY s.sensor_id, s.description, h.readings_24h, h.max_gap_minutes, mg.median_gap_s
            ORDER BY s.sensor_id;
        """)
        rows = cursor.fetchall()
        conn.close()

        result = []
        for row in rows:
            last_seen = row['last_seen']
            if last_seen and last_seen.tzinfo is None:
                last_seen = last_seen.replace(tzinfo=timezone.utc)

            readings = int(row['readings_24h'])
            # expected_per_day derived from the sensor's median normal reporting interval.
            # Fall back to 1440 (one per minute) for sensors with < 30 days of history.
            expected = float(row['expected_per_day']) if row['expected_per_day'] else 1440.0
            availability_pct = round(min(readings / expected * 100, 100.0), 1)

            max_gap = row['max_gap_minutes']
            max_gap_minutes = round(float(max_gap), 1) if max_gap is not None else None

            if readings == 0:
                status = 'Critical'
            elif availability_pct >= 80:
                status = 'Operational'
            elif availability_pct >= 40:
                status = 'Warning'
            else:
                status = 'Critical'

            result.append({
                "sensor_id": row['sensor_id'],
                "description": row['description'],
                "last_seen": last_seen.isoformat() if last_seen else None,
                "status": status,
                "availability_pct": availability_pct,
                "readings_24h": readings,
                "max_gap_minutes": max_gap_minutes,
                "expected_per_day": round(expected),
            })

        return result
    except Exception as e:
        print(f"Error in /api/sensors/health: {e}")
        raise HTTPException(status_code=500, detail=str(e))
