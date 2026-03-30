from fastapi import FastAPI, HTTPException
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
        # We only return sensors that have GPS coordinates
        cursor.execute("SELECT * FROM sensors WHERE lat IS NOT NULL;")
        sensors = cursor.fetchall()
        conn.close()
        return sensors
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/measurements/latest")
def get_latest_measurements():
    """Returns the absolute latest noise reading for every sensor."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        # DISTINCT ON is a powerful PostgreSQL command to get the latest row per group
        cursor.execute("""
            SELECT DISTINCT ON (sensor_id) 
                ts, sensor_id, value_db, quality_flag 
            FROM noise_measurements 
            ORDER BY sensor_id, ts DESC;
        """)
        measurements = cursor.fetchall()
        conn.close()
        return measurements
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/measurements/history")
def get_historical_measurements():
    """Returns the last hour of noise data, averaged by minute."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1-minute buckets for the last 1 hour
        cursor.execute("""
            SELECT 
                time_bucket('1 minute', ts) AS time_block, 
                sensor_id, 
                ROUND(AVG(value_db)::numeric, 1) as avg_db 
            FROM noise_measurements 
            WHERE ts >= NOW() - INTERVAL '1 HOUR'
            GROUP BY time_block, sensor_id 
            ORDER BY time_block ASC;
        """)
        
        measurements = cursor.fetchall()
        conn.close()
        
        history_dict = {}
        for row in measurements:
            time_str = row['time_block'].strftime('%H:%M')
            # FIXED: Python uses slice [:15] instead of .substring()
            short_id = row['sensor_id'].replace('DN000', '').replace('-Buller ', '')[:15]
            
            if time_str not in history_dict:
                history_dict[time_str] = {"time": time_str}
            
            history_dict[time_str][short_id] = float(row['avg_db'])

        return list(history_dict.values())

    except Exception as e:
        # This will print the error to your Docker logs if it happens again
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))