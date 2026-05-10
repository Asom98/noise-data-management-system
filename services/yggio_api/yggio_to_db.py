"""
Yggio → TimescaleDB ingestion service
======================================
On first startup (empty database) this service automatically backfills the
full Yggio historical archive using 3-day paginated chunks with distance=60 s,
giving one row per actual sensor reading.  Subsequent restarts skip the
backfill and go straight to the live loop.

Live loop (every 60 s):
  1. Calls /iotnodes to register any new sensors.
  2. Calls /iotnodes/{id}/stats with distance=60 for the last 10 minutes
     so every reading the sensor produced is captured, not just the snapshot
     that happened to land in the poll window.

All rows — historical and live — share the same structure.
"""

import os
import time
import requests
import psycopg2
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

BASE_URL         = "https://sensordata.malmo.se/api"
USERNAME         = os.getenv("YGGIO_USERNAME")
PASSWORD         = os.getenv("YGGIO_PASSWORD")

POLL_INTERVAL_S  = 60     # seconds between live cycles
STATS_WINDOW_MIN = 10     # minutes covered per live cycle
BACKFILL_DAYS    = 90     # days of history re-fetched on every startup
CHUNK_DAYS       = 3      # days per paginated chunk (keeps responses < 5000 rows)


# ── DB ────────────────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )




# ── Auth ──────────────────────────────────────────────────────────────────────

def authenticate():
    resp = requests.post(
        f"{BASE_URL}/auth/local",
        headers={"Content-Type": "application/json"},
        json={"username": USERNAME, "password": PASSWORD},
        timeout=15,
    )
    resp.raise_for_status()
    print("✅ Authenticated with Yggio")
    return resp.json()["token"]


# ── Node / sensor helpers ─────────────────────────────────────────────────────

def fetch_live_nodes(token):
    resp = requests.get(
        f"{BASE_URL}/iotnodes",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def detect_measurement_key(values: dict) -> str | None:
    """
    Returns the Yggio measurement path for the /stats endpoint.
    Two payload formats exist in the field:
      A. Nested:  {hex_id}_output → {soundLevel, soundLaeq, …}
      B. Flat:    {hex_id}_soundLaeq / {hex_id}_soundLevel
    """
    for key, val in values.items():
        if key.endswith("_output") and isinstance(val, dict):
            if "soundLaeq" in val:
                return f"values.{key}.soundLaeq"
            if "soundLevel" in val:
                return f"values.{key}.soundLevel"
    for key in values:
        if key.endswith("_soundLaeq"):
            return f"values.{key}"
        if key.endswith("_soundLevel"):
            return f"values.{key}"
    return None


def register_sensors(nodes, conn):
    cur = conn.cursor()
    for node in nodes:
        name = node.get("name", "")
        if "Buller" not in name:
            continue
        location = name.split("-Buller ", 1)[1].strip() if "-Buller " in name else name
        cur.execute("""
            INSERT INTO sensors (sensor_id, description)
            VALUES (%s, %s)
            ON CONFLICT (sensor_id) DO UPDATE SET description = EXCLUDED.description;
        """, (name, location))
    conn.commit()
    cur.close()


def buller_sensors(nodes) -> list[dict]:
    result = []
    for node in nodes:
        name = node.get("name", "")
        if "Buller" not in name:
            continue
        m_key = detect_measurement_key(node.get("values", {}))
        result.append({"name": name, "node_id": node["_id"], "measurement": m_key})
    return result


# ── Stats fetch ───────────────────────────────────────────────────────────────

def fetch_stats_chunk(token, node_id, measurement, start_ms, end_ms):
    resp = requests.get(
        f"{BASE_URL}/iotnodes/{node_id}/stats",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "measurement":   measurement,
            "start":         start_ms,
            "end":           end_ms,
            "distance":      60,
            "valueFunction": "mean",
        },
        timeout=30,
    )
    if resp.status_code == 404:
        return []
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


def insert_stats_rows(rows, sensor_name, conn):
    cur = conn.cursor()
    inserted = 0
    for item in rows:
        raw_time = item.get("time")
        val      = item.get("value")
        if raw_time is None or val is None:
            continue
        try:
            ts = datetime.fromisoformat(raw_time.replace("Z", "+00:00"))
            cur.execute("""
                INSERT INTO noise_measurements (ts, sensor_id, value_db, unit, quality_flag)
                VALUES (%s, %s, %s, 'dB', 1)
                ON CONFLICT (sensor_id, ts) DO NOTHING;
            """, (ts, sensor_name, round(float(val), 1)))
            if cur.rowcount > 0:
                inserted += 1
        except Exception as e:
            print(f"  ⚠️  Row error for {sensor_name}: {e}")
    conn.commit()
    cur.close()
    return inserted


# ── Historical backfill ───────────────────────────────────────────────────────

def run_backfill(token, nodes):
    print(f"\n📥 Starting historical backfill — last {BACKFILL_DAYS} days "
          f"in {CHUNK_DAYS}-day chunks (distance=60 s)\n")

    sensors  = buller_sensors(nodes)
    now_ms   = int(time.time() * 1000)
    start_ms = now_ms - BACKFILL_DAYS * 24 * 3600 * 1000
    chunk_ms = CHUNK_DAYS * 24 * 3600 * 1000
    total    = 0

    conn = get_db()

    for s in sensors:
        if not s["measurement"]:
            print(f"  ⚠️  {s['name']} — no measurement key detected, skipping")
            continue

        print(f"\n── {s['name']} ──")
        sensor_total = 0
        cursor = start_ms

        while cursor < now_ms:
            chunk_end = min(cursor + chunk_ms, now_ms)
            chunk = fetch_stats_chunk(token, s["node_id"], s["measurement"],
                                      cursor, chunk_end)
            if chunk:
                n = insert_stats_rows(chunk, s["name"], conn)
                sensor_total += n
                start_label = datetime.fromtimestamp(cursor / 1000, tz=timezone.utc).date()
                end_label   = datetime.fromtimestamp(chunk_end / 1000, tz=timezone.utc).date()
                print(f"  {start_label} → {end_label}  {len(chunk)} points  "
                      f"({n} new, {sensor_total} total)")
            cursor = chunk_end

        total += sensor_total
        print(f"  ✅ {s['name']}: {sensor_total} rows inserted")

    conn.close()
    print(f"\n📥 Backfill complete — {total} total rows inserted\n")




# ── Live ingestion ────────────────────────────────────────────────────────────

def run_live_cycle(token, nodes):
    now_ms   = int(time.time() * 1000)
    start_ms = now_ms - STATS_WINDOW_MIN * 60 * 1000
    sensors  = buller_sensors(nodes)
    conn     = get_db()
    total    = 0

    for s in sensors:
        if not s["measurement"]:
            continue
        chunk = fetch_stats_chunk(token, s["node_id"], s["measurement"],
                                  start_ms, now_ms)
        total += insert_stats_rows(chunk, s["name"], conn)

    conn.close()
    return total


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Starting Yggio ingestion service...")

    while True:
        try:
            token = authenticate()
            nodes = fetch_live_nodes(token)

            # Register sensors regardless of whether we backfill
            conn = get_db()
            register_sensors(nodes, conn)
            conn.close()

            # Always re-fetch the full BACKFILL_DAYS archive on every startup.
            # Idempotent — ON CONFLICT DO NOTHING means no duplicates are inserted.
            # Guarantees no day is ever missed regardless of downtime length.
            run_backfill(token, nodes)

            # Enter the live loop
            print(f"\n🔄 Entering live loop (every {POLL_INTERVAL_S}s, "
                  f"last {STATS_WINDOW_MIN} min stats window)\n")

            while True:
                try:
                    token = authenticate()
                    nodes = fetch_live_nodes(token)

                    conn = get_db()
                    register_sensors(nodes, conn)
                    conn.close()

                    new_rows = run_live_cycle(token, nodes)

                    ts_now = datetime.now(timezone.utc).strftime("%H:%M:%S")
                    if new_rows > 0:
                        print(f"[{ts_now}] ✅ Inserted {new_rows} new readings")
                    else:
                        print(f"[{ts_now}] ⏩ No new readings in window")

                except Exception as e:
                    print(f"❌ Live cycle error: {e}")

                time.sleep(POLL_INTERVAL_S)

        except Exception as e:
            print(f"❌ Startup error: {e} — retrying in 30 s")
            time.sleep(30)
