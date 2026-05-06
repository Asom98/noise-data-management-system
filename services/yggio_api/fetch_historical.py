"""
Yggio Historical Data Fetcher
==============================
Uses the /api/iotnodes/{id}/stats endpoint to pull bucketed historical
noise data and backfill TimescaleDB.

The stats endpoint (confirmed by Besim Musliu / Yggio support):
  GET /api/iotnodes/{node_id}/stats
      ?measurement=values.{measurement_key}
      &start={unix_ms}
      &end={unix_ms}
      &distance={bucket_seconds}
      &valueFunction=mean|max|min

This script:
  1. Authenticates with Yggio.
  2. Fetches the current node list to discover each sensor's _id and
     measurement key automatically.
  3. For each Buller noise sensor, calls /stats for the requested window.
  4. Inserts the results into TimescaleDB (idempotent — duplicates are skipped).
"""

import os
import time
import requests
import psycopg2
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_URL   = "https://sensordata.malmo.se/api"
USERNAME   = os.getenv("YGGIO_USERNAME")
PASSWORD   = os.getenv("YGGIO_PASSWORD")


# ── Auth ──────────────────────────────────────────────────────────────────────

def get_token():
    resp = requests.post(
        f"{BASE_URL}/auth/local",
        headers={"Content-Type": "application/json"},
        json={"username": USERNAME, "password": PASSWORD},
        timeout=15,
    )
    resp.raise_for_status()
    token = resp.json().get("token")
    print(f"✅ Authenticated as {USERNAME}")
    return token


# ── Node discovery ────────────────────────────────────────────────────────────

def detect_measurement_key(values: dict) -> str | None:
    """
    Auto-detect the primary noise measurement path from a node's values dict.

    Yggio sensors use two formats:
      A. Nested: {hex_id}_output → {soundLevel, soundLaeq, ...}
         → measurement = "values.{hex_id}_output.soundLevel"  (or soundLaeq)
      B. Flat:   {hex_id}_soundLaeq / {hex_id}_soundLevel
         → measurement = "values.{hex_id}_soundLaeq"
    """
    for key, val in values.items():
        # Format A — nested _output dict
        if key.endswith("_output") and isinstance(val, dict):
            if "soundLaeq" in val:
                return f"values.{key}.soundLaeq"
            if "soundLevel" in val:
                return f"values.{key}.soundLevel"

    # Format B — flat scalar keys
    for key in values:
        if key.endswith("_soundLaeq"):
            return f"values.{key}"
        if key.endswith("_soundLevel"):
            return f"values.{key}"

    return None


def get_buller_nodes(token: str) -> list[dict]:
    """Returns all Buller noise sensors with their _id and detected measurement key."""
    resp = requests.get(
        f"{BASE_URL}/iotnodes",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    resp.raise_for_status()
    nodes = resp.json()

    sensors = []
    for node in nodes:
        name = node.get("name", "")
        if "Buller" not in name:
            continue
        node_id  = node["_id"]
        m_key    = detect_measurement_key(node.get("values", {}))
        sensors.append({
            "name":        name,
            "node_id":     node_id,
            "measurement": m_key,
        })
        print(f"  {name}  →  _id={node_id}  measurement={m_key}")

    return sensors


# ── Stats fetch ───────────────────────────────────────────────────────────────

def fetch_stats_chunk(token: str, node_id: str, measurement: str,
                      start_ms: int, end_ms: int,
                      distance_s: int = 60,
                      value_fn: str = "mean") -> list[dict]:
    """Single request to /stats. Returns raw list or [] on error."""
    resp = requests.get(
        f"{BASE_URL}/iotnodes/{node_id}/stats",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "measurement":   measurement,
            "start":         start_ms,
            "end":           end_ms,
            "distance":      distance_s,
            "valueFunction": value_fn,
        },
        timeout=30,
    )
    if resp.status_code == 404:
        return []
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


def fetch_stats_all(token: str, node_id: str, measurement: str,
                    start_ms: int, end_ms: int,
                    distance_s: int = 60,
                    value_fn: str = "mean",
                    chunk_days: int = 3) -> list[dict]:
    """
    Paginates the /stats endpoint in `chunk_days`-day windows to work
    around Yggio's 5 000-result-per-request cap.
    """
    chunk_ms = chunk_days * 24 * 3600 * 1000
    all_rows = []
    cursor   = start_ms

    while cursor < end_ms:
        chunk_end = min(cursor + chunk_ms, end_ms)
        chunk = fetch_stats_chunk(token, node_id, measurement,
                                  cursor, chunk_end, distance_s, value_fn)
        if chunk:
            all_rows.extend(chunk)
            print(f"    chunk {datetime.fromtimestamp(cursor/1000, tz=timezone.utc).date()} "
                  f"→ {datetime.fromtimestamp(chunk_end/1000, tz=timezone.utc).date()} "
                  f"  {len(chunk)} points  (total so far: {len(all_rows)})")
        cursor = chunk_end

    return all_rows


# ── DB insert ─────────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "timescaledb"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "noise_db"),
        user=os.getenv("DB_USER", "noise_user"),
        password=os.getenv("DB_PASSWORD", "noise_password"),
    )


def insert_stats(sensor_name: str, rows: list, dry_run: bool = True):
    """
    Insert parsed stats rows into noise_measurements.
    Each row must have 'ts' (datetime) and 'value_db' (float).
    Set dry_run=False to actually write to the DB.
    """
    if not rows:
        return 0

    if dry_run:
        print(f"    [DRY RUN] Would insert {len(rows)} rows for {sensor_name}")
        for r in rows[:3]:
            print(f"      {r['ts']}  {r['value_db']} dB")
        if len(rows) > 3:
            print(f"      ... ({len(rows) - 3} more)")
        return 0

    conn = get_db()
    conn.autocommit = True
    cur  = conn.cursor()
    inserted = 0
    for r in rows:
        cur.execute("""
            INSERT INTO noise_measurements (ts, sensor_id, value_db, unit, quality_flag)
            VALUES (%s, %s, %s, 'dB', 1)
            ON CONFLICT (sensor_id, ts) DO NOTHING;
        """, (r["ts"], sensor_name, r["value_db"]))
        if cur.rowcount > 0:
            inserted += 1
    cur.close()
    conn.close()
    return inserted


# ── Response parser ───────────────────────────────────────────────────────────

def parse_stats_response(data, sensor_name: str) -> list[dict]:
    """
    Parses the Yggio /stats response into { ts: datetime, value_db: float } rows.

    Confirmed response format from live API:
      [{"value": 67.78, "time": "2026-04-27T19:41:29.328Z"}, ...]
    """
    rows = []

    if isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            # Live API returns ISO string in "time", float in "value"
            raw_time = item.get("time")
            val      = item.get("value")
            if raw_time is None or val is None:
                continue
            try:
                if isinstance(raw_time, str):
                    ts = datetime.fromisoformat(raw_time.replace("Z", "+00:00"))
                else:
                    # Fallback: treat as unix milliseconds
                    ts = datetime.fromtimestamp(raw_time / 1000, tz=timezone.utc)
                rows.append({"ts": ts, "value_db": round(float(val), 1)})
            except Exception as e:
                print(f"    ⚠️  Could not parse row {item}: {e}")

    elif isinstance(data, dict):
        inner = data.get("data") or data.get("values") or data.get("results")
        if inner:
            return parse_stats_response(inner, sensor_name)

    if rows:
        print(f"    ✅ Parsed {len(rows)} data points  "
              f"({rows[0]['ts'].strftime('%Y-%m-%d %H:%M')} → "
              f"{rows[-1]['ts'].strftime('%Y-%m-%d %H:%M')} UTC)")
    else:
        print(f"    ⚠️  No rows parsed from response")
    return rows


# ── Main ──────────────────────────────────────────────────────────────────────

def main(days_back: int = 7, dry_run: bool = True):
    print(f"\n{'='*60}")
    print(f"  Yggio Historical Data Fetcher")
    print(f"  Window: last {days_back} days  |  Bucket: 60 s (raw readings)  |  dry_run={dry_run}")
    print(f"{'='*60}\n")

    token = get_token()

    now_ms    = int(time.time() * 1000)
    start_ms  = now_ms - days_back * 24 * 3600 * 1000
    print(f"\nTime window: {datetime.fromtimestamp(start_ms/1000, tz=timezone.utc)}  →  now\n")

    print("Discovering Buller sensors...")
    sensors = get_buller_nodes(token)
    print(f"\nFound {len(sensors)} Buller sensor(s).\n")

    total_inserted = 0
    for s in sensors:
        print(f"\n── {s['name']} ──")
        if not s["measurement"]:
            print("  ⚠️  Could not detect measurement key — skipping")
            continue

        raw = fetch_stats_all(
            token, s["node_id"], s["measurement"],
            start_ms, now_ms,
            distance_s=60,        # one bucket per actual sensor reading
            value_fn="mean",
            chunk_days=3,         # 3-day windows stay well under the 5000-row cap
        )
        rows = parse_stats_response(raw, s["name"])
        n    = insert_stats(s["name"], rows, dry_run=dry_run)
        if not dry_run:
            print(f"    Inserted {n} new rows")
        total_inserted += n

    print(f"\n{'='*60}")
    if dry_run:
        print("  DRY RUN complete. Re-run with dry_run=False to write to DB.")
    else:
        print(f"  Done. Total new rows inserted: {total_inserted}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    # Start with a dry run to inspect the API response shape.
    # Change dry_run=False once the response format is confirmed.
    # distance=60 gives one row per actual sensor reading (sensors report every ~84 s).
    # 90 days covers the full Yggio archive back to 3 March 2026.
    main(days_back=90, dry_run=False)
