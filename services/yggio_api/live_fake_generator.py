"""
Live Fake Data Generator — runs continuously, inserting one reading
per sensor every INTERVAL seconds, simulating a real IoT data stream.
"""

import os
import sys
import time
import random
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

INTERVAL = 10  # seconds between each batch of readings

SENSORS = [
    {"id": "DN0007-Buller Spångatan x Bergsgatan",           "base": 58, "type": "intersection"},
    {"id": "DN0008-Buller Västravarvsgatan",                  "base": 54, "type": "residential"},
    {"id": "DN0009-Buller Bergsgatan 17",                     "base": 56, "type": "street"},
    {"id": "DN0010-Buller Föreningsgatan x Disponentgatan",   "base": 60, "type": "intersection"},
    {"id": "DN0011-Buller Fersens v. x E. Dahlbergsg.",       "base": 52, "type": "residential"},
]

HOUR_PROFILE = {
     0: 0.65,  1: 0.60,  2: 0.58,  3: 0.57,  4: 0.58,  5: 0.65,
     6: 0.82,  7: 0.95,  8: 1.05,  9: 1.00, 10: 0.97, 11: 0.98,
    12: 1.00, 13: 0.98, 14: 0.97, 15: 0.99, 16: 1.08, 17: 1.15,
    18: 1.10, 19: 1.00, 20: 0.90, 21: 0.80, 22: 0.72, 23: 0.67,
}

TYPE_FACTOR = {
    "intersection": 1.10,
    "street":       1.00,
    "residential":  0.90,
}


def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "timescaledb"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "noise_db"),
        user=os.getenv("DB_USER", "noise_user"),
        password=os.getenv("DB_PASSWORD", "noise_password"),
    )


def noise_value(sensor: dict, ts: datetime) -> float:
    hour        = ts.hour
    minute      = ts.minute
    next_hour   = (hour + 1) % 24
    blend       = minute / 60.0
    multiplier  = (1 - blend) * HOUR_PROFILE[hour] + blend * HOUR_PROFILE[next_hour]
    base        = sensor["base"] * multiplier * TYPE_FACTOR[sensor["type"]]
    noise       = random.gauss(0, 2.5)
    spike       = random.choice([0] * 19 + [random.uniform(8, 20)])
    value       = base + noise + spike
    return round(max(30.0, min(95.0, value)), 1)


def quality_flag(value: float) -> int:
    if value > 80:
        return 2
    if value > 70:
        return 1
    return 0


def insert_batch(conn, rows):
    with conn.cursor() as cur:
        psycopg2.extras.execute_values(
            cur,
            "INSERT INTO noise_measurements (ts, sensor_id, value_db, unit, quality_flag) VALUES %s",
            rows,
        )
    conn.commit()


def run():
    sys.stdout.reconfigure(line_buffering=True)
    print(f"Live fake data generator started — inserting every {INTERVAL}s", flush=True)
    print(f"Sensors: {len(SENSORS)}")

    conn = None
    while True:
        try:
            if conn is None or conn.closed:
                print("Connecting to database...")
                conn = get_db()
                print("Connected.")

            ts   = datetime.now(timezone.utc)
            rows = []
            for sensor in SENSORS:
                value = noise_value(sensor, ts)
                flag  = quality_flag(value)
                rows.append((ts, sensor["id"], value, "dB", flag))

            insert_batch(conn, rows)

            values_str = "  ".join(f"{s['id'].split('-')[0]}: {r[2]} dB" for s, r in zip(SENSORS, rows))
            print(f"[{ts.strftime('%H:%M:%S')}]  {values_str}", flush=True)

        except psycopg2.OperationalError as e:
            print(f"DB connection lost: {e} — reconnecting in 5s...", flush=True)
            conn = None
            time.sleep(5)
            continue
        except Exception as e:
            print(f"Error: {e}", flush=True)

        time.sleep(INTERVAL)


if __name__ == "__main__":
    run()
