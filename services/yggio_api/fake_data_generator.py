"""
Fake Data Generator for Malmö Noise Dashboard.

Generates realistic noise readings for all 5 sensors and inserts them
into TimescaleDB. Covers:
  - 7 days of history   (every 5 minutes)
  - Realistic day/night patterns
  - Rush hour spikes
  - Occasional alert-level readings (>70 dB)
  - Random sensor dropouts for sensor health realism
"""

import os
import random
import math
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import psycopg2
import psycopg2.extras

load_dotenv()

# ── DB connection ────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "timescaledb"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "noise_db"),
        user=os.getenv("DB_USER", "noise_user"),
        password=os.getenv("DB_PASSWORD", "noise_password"),
    )


# ── Sensor profiles ──────────────────────────────────────────────────────────
# Each sensor has a base noise level and a location "type" that affects peaks.

SENSORS = [
    {"id": "DN0007-Buller Spångatan x Bergsgatan",          "base": 58, "type": "intersection"},
    {"id": "DN0008-Buller Västravarvsgatan",                 "base": 54, "type": "residential"},
    {"id": "DN0009-Buller Bergsgatan 17",                    "base": 56, "type": "street"},
    {"id": "DN0010-Buller Föreningsgatan x Disponentgatan",  "base": 60, "type": "intersection"},
    {"id": "DN0011-Buller Fersens v. x E. Dahlbergsg.",      "base": 52, "type": "residential"},
]

# Multipliers applied on top of base level per hour of day
HOUR_PROFILE = {
    0: 0.65,  1: 0.60,  2: 0.58,  3: 0.57,  4: 0.58,  5: 0.65,
    6: 0.82,  7: 0.95,  8: 1.05,  9: 1.00, 10: 0.97, 11: 0.98,
   12: 1.00, 13: 0.98, 14: 0.97, 15: 0.99, 16: 1.08, 17: 1.15,
   18: 1.10, 19: 1.00, 20: 0.90, 21: 0.80, 22: 0.72, 23: 0.67,
}

# Intersections are louder and spike more
TYPE_FACTOR = {
    "intersection": 1.10,
    "street":       1.00,
    "residential":  0.90,
}


def noise_value(sensor: dict, ts: datetime) -> float:
    """Generate a realistic noise value (dB) for a sensor at a given time."""
    hour   = ts.hour
    minute = ts.minute

    # Smooth transition between hour multipliers
    next_hour   = (hour + 1) % 24
    blend       = minute / 60.0
    multiplier  = (1 - blend) * HOUR_PROFILE[hour] + blend * HOUR_PROFILE[next_hour]

    base        = sensor["base"] * multiplier * TYPE_FACTOR[sensor["type"]]

    # Add Gaussian noise
    noise       = random.gauss(0, 2.5)

    # Occasional traffic spike (5% chance)
    spike       = random.choice([0] * 19 + [random.uniform(8, 20)])

    value       = base + noise + spike
    return round(max(30.0, min(95.0, value)), 1)


def quality_flag(value: float) -> int:
    """0 = good, 1 = warning (>70 dB), 2 = critical (>80 dB)."""
    if value > 80:
        return 2
    if value > 70:
        return 1
    return 0


# ── Generator ────────────────────────────────────────────────────────────────

def generate(days: int = 7, interval_minutes: int = 5):
    now    = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    start  = now - timedelta(days=days)
    steps  = int((days * 24 * 60) / interval_minutes)

    rows = []
    for sensor in SENSORS:
        # Simulate ~5% dropout windows (sensor offline for 1–3 hours randomly)
        dropout_windows = []
        for _ in range(random.randint(1, 4)):
            dropout_start = start + timedelta(minutes=random.randint(0, steps * interval_minutes))
            dropout_end   = dropout_start + timedelta(hours=random.randint(1, 3))
            dropout_windows.append((dropout_start, dropout_end))

        for i in range(steps):
            ts = start + timedelta(minutes=i * interval_minutes)

            # Skip if in a dropout window
            in_dropout = any(d_start <= ts <= d_end for d_start, d_end in dropout_windows)
            if in_dropout:
                continue

            value = noise_value(sensor, ts)
            flag  = quality_flag(value)
            rows.append((ts, sensor["id"], value, "dB", flag))

    return rows


# ── Insert ───────────────────────────────────────────────────────────────────

def seed():
    print("Generating fake noise data...")
    rows = generate(days=7, interval_minutes=5)
    print(f"Generated {len(rows):,} readings across {len(SENSORS)} sensors.")

    print("Connecting to database...")
    conn = get_db()
    cursor = conn.cursor()

    print("Clearing existing measurements...")
    cursor.execute("DELETE FROM noise_measurements;")

    print("Inserting rows (this may take a moment)...")
    psycopg2.extras.execute_values(
        cursor,
        "INSERT INTO noise_measurements (ts, sensor_id, value_db, unit, quality_flag) VALUES %s",
        rows,
        page_size=1000,
    )

    conn.commit()
    cursor.close()
    conn.close()
    print(f"Done. {len(rows):,} rows inserted successfully.")


if __name__ == "__main__":
    seed()
