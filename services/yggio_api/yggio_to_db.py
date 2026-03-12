import os
import requests
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

# Load secure credentials
load_dotenv()
USERNAME = os.getenv("YGGIO_USERNAME")
PASSWORD = os.getenv("YGGIO_PASSWORD")

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        port="5432",
        dbname="noise_db",
        user="noise_user",
        password="noise_password" # Change if your .env is different!
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

def ingest_to_timescale(nodes):
    """Parses the messy API data, registers new sensors, and inserts data"""
    conn = get_db_connection()
    conn.autocommit = True
    cursor = conn.cursor()
    
    success_count = 0
    
    for node in nodes:
        node_id = node.get("name", "Unknown Node")
        reported_at = node.get("reportedAt")
        values = node.get("values", {})
        
        # 1. SMART FIX: Automatically register the sensor if it doesn't exist!
        try:
            cursor.execute("""
                INSERT INTO sensors (sensor_id, description) 
                VALUES (%s, %s) 
                ON CONFLICT (sensor_id) DO NOTHING;
            """, (node_id, f"Real Malmö Yggio Sensor"))
        except Exception as e:
            print(f"Failed to register sensor {node_id}: {e}")
            continue # Skip to the next node if we can't register this one
            
        # 2. Extract the noisy data
        noise_value = None
        if "DN0007" in node_id:
            noise_value = values.get("691b344909e3eb66b5d4c5c9_sound")
        elif "DN0008" in node_id:
            output_obj = values.get("683d58e23bed6ef9a8a1c813_output", {})
            noise_value = output_obj.get("soundLevel")
        elif "DN0009" in node_id:
            noise_value = values.get("68b7ebba2470f5eb98a3f19a_soundLaeq")
            
        # 3. Save to the database
        if noise_value is not None and reported_at is not None:
            try:
                insert_query = """
                    INSERT INTO noise_measurements (ts, sensor_id, value_db, unit, quality_flag)
                    VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(insert_query, (reported_at, node_id, noise_value, 'dB', 1))
                print(f"✅ Ingested to DB: {node_id} -> {noise_value} dB at {reported_at}")
                success_count += 1
            except Exception as e:
                print(f"❌ DB Insert Error for {node_id}: {e}")
                
    cursor.close()
    conn.close()
    print(f"\nFinished ingestion cycle. Successfully saved {success_count} real records to TimescaleDB!")

if __name__ == "__main__":
    live_nodes = fetch_live_data()
    if live_nodes:
        ingest_to_timescale(live_nodes)