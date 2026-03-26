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
    Dynamically searches a JSON dictionary for noise-related values.
    This makes the script infinitely scalable for any future sensor models!
    """
    target_keywords = ['sound', 'soundlaeq', 'soundlevel', 'noise']
    
    for key, val in values_dict.items():
        key_lower = key.lower()
        
        # If the value is a nested dictionary (like DN0008), search inside it recursively
        if isinstance(val, dict):
            nested_result = extract_noise_value(val)
            if nested_result is not None:
                return nested_result
                
        # If the key contains our keywords and the value is a number, we found it!
        elif any(keyword in key_lower for keyword in target_keywords) and isinstance(val, (int, float)):
            return float(val)
            
    return None

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
        
        # 1. Automatically register ANY sensor it finds
        try:
            cursor.execute("""
                INSERT INTO sensors (sensor_id, description) 
                VALUES (%s, %s) 
                ON CONFLICT (sensor_id) DO NOTHING;
            """, (node_id, "Real Malmö Yggio Sensor"))
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