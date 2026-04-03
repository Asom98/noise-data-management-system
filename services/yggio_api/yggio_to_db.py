import os
import requests
import psycopg2
from datetime import datetime
from dotenv import load_dotenv
import time

# Load secure credentials
load_dotenv()
USERNAME = os.getenv("YGGIO_USERNAME")
PASSWORD = os.getenv("YGGIO_PASSWORD")

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

def fetch_live_data():
    """Authenticates and fetches the CURRENT live state of all sensors"""
    print("Authenticating with Malmö Yggio Platform...")
    auth_resp = requests.post(
        "https://sensordata.malmo.se/api/auth/local",
        headers={"accept": "application/json", "Content-Type": "application/json"},
        json={"username": USERNAME, "password": PASSWORD}
    )
    if auth_resp.status_code != 200:
        print("Auth failed!")
        return None
        
    token = auth_resp.json().get("token")
    
    print("Fetching live sensor states...")
    nodes_resp = requests.get(
        "https://sensordata.malmo.se/api/iotnodes",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    
    if nodes_resp.status_code == 200:
        return nodes_resp.json()
    return None

def extract_noise_value(values_dict):
    """
    Extracts the primary acoustic noise level (dB) from the Yggio sensor payload.

    Priority order:
      1. soundLaeq  — equivalent continuous noise level (acoustically correct standard)
      2. soundLevel — instantaneous level (used by DN0007, DN0008, DN0010)

    Explicitly excluded (NOT dB values):
      - soundAvgMinutes  — averaging window in minutes (integer metadata, e.g. 1 or 15)
      - soundMinLevel    — minimum threshold configuration, not a measurement
      - soundLamin       — minimum level over window (secondary statistic, not primary)
      - soundLamax       — maximum level over window (secondary statistic)
      - soundP1/P10/P50/P90/P99 — percentile statistics, not the primary reading

    This two-pass approach prevents the dict-iteration-order bug where
    soundAvgMinutes (value=15 or 1) was returned before soundLevel for
    sensors DN0007 and DN0008.
    """
    EXCLUDED = {
        'soundavgminutes', 'soundminlevel', 'soundlamin', 'soundlamax',
        'soundp1', 'soundp10', 'soundp50', 'soundp90', 'soundp99',
    }

    def _flat_search(d, keyword):
        """Single-pass search for one exact keyword substring, skipping excluded keys."""
        for key, val in d.items():
            key_lower = key.lower()
            if isinstance(val, dict):
                result = _flat_search(val, keyword)
                if result is not None:
                    return result
            elif (keyword in key_lower
                  and key_lower not in EXCLUDED
                  and not any(ex in key_lower for ex in EXCLUDED)
                  and isinstance(val, (int, float))):
                return float(val)
        return None

    # Pass 1: prefer soundLaeq (acoustically correct equivalent-continuous level)
    result = _flat_search(values_dict, 'soundlaeq')
    if result is not None:
        return result

    # Pass 2: fall back to soundLevel (instantaneous reading)
    return _flat_search(values_dict, 'soundlevel')

def ingest_to_timescale(nodes):
    """Parses API data, registers ANY new sensors, and inserts data"""
    conn = get_db_connection()
    conn.autocommit = True
    cursor = conn.cursor()
    
    success_count = 0
    
    for node in nodes:
        node_id = node.get("name", "Unknown Node")
        reported_at = node.get("reportedAt")
        values = node.get("values", {})

        # Extract human-readable location from the Yggio name field.
        # Name format: "DN0007-Buller Spångatan x Bergsgatan"
        # We store the location part after "Buller " as the description.
        full_name = node_id  # node_id == the "name" field
        if '-Buller ' in full_name:
            location = full_name.split('-Buller ', 1)[1].strip()
        else:
            location = full_name

        # 1. Automatically register ANY sensor it finds
        try:
            cursor.execute("""
                INSERT INTO sensors (sensor_id, description)
                VALUES (%s, %s)
                ON CONFLICT (sensor_id) DO UPDATE SET description = EXCLUDED.description;
            """, (node_id, location))
        except Exception as e:
            print(f"Failed to register sensor {node_id}: {e}")
            continue
            
        # 2. THE SCALABLE FIX: Dynamically extract the noise value without hardcoded IDs!
        noise_value = extract_noise_value(values)
            
        # 3. Save to the database
        if noise_value is not None and reported_at is not None:
            try:
                # ADDED: ON CONFLICT (sensor_id, ts) DO NOTHING
                insert_query = """
                    INSERT INTO noise_measurements (ts, sensor_id, value_db, unit, quality_flag)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (sensor_id, ts) DO NOTHING; 
                """
                cursor.execute(insert_query, (reported_at, node_id, noise_value, 'dB', 1))
                
                # Check if a row was actually inserted, or if it was ignored as a duplicate!
                if cursor.rowcount > 0:
                    print(f"✅ NEW DATA: {node_id} -> {noise_value} dB at {reported_at}")
                    success_count += 1
                else:
                    print(f"⏩ Skipped duplicate: {node_id} at {reported_at}")
                    
            except Exception as e:
                print(f"❌ DB Insert Error for {node_id}: {e}")
                
    cursor.close()
    conn.close()
    print(f"\nFinished ingestion cycle. Successfully saved {success_count} real records to TimescaleDB!")

if __name__ == "__main__":
    print("Starting Yggio API Continuous Ingestion Service...")
    
    # Run forever!
    while True:
        try:
            live_nodes = fetch_live_data()
            if live_nodes:
                ingest_to_timescale(live_nodes)
        except Exception as e:
            print(f"Critical error in main loop: {e}")
            
        print("Sleeping for 60 seconds before the next poll...\n")
        time.sleep(60) 