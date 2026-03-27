import paho.mqtt.client as mqtt
import psycopg2
import json
import os
from datetime import datetime

# --- Configuration ---
# MQTT Broker settings
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
TOPIC = "city/malmo/noise"

# --- Database Setup ---
try:
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )
    conn.autocommit = True
    cursor = conn.cursor()
    print("Successfully connected to TimescaleDB!")
except Exception as e:
    print(f"Database connection failed: {e}")
    exit(1)

# --- MQTT Callbacks ---
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"Connected to MQTT Broker. Subscribing to topic: {TOPIC}")
        client.subscribe(TOPIC)
    else:
        print(f"Failed to connect to MQTT broker, return code {reason_code}")

def on_message(client, userdata, msg):
    """
    Acts as the ingestion service validating and transforming incoming messages[cite: 190].
    Implements Schema validation: required fields present.
    """
    try:
        # Decode the JSON payload
        payload = json.loads(msg.payload.decode('utf-8'))
        
        # 1. Validation Rule: Check for required fields 
        required_keys = ["ts", "sensor_id", "value_db"]
        if not all(key in payload for key in required_keys):
            print(f"Validation Error: Missing required fields in {payload}")
            return
            
        # 2. Extract variables
        ts = payload["ts"]
        sensor_id = payload["sensor_id"]
        value_db = payload["value_db"]
        unit = payload.get("unit", "dB")
        quality_flag = payload.get("quality_flag", 1) # Default to 1 (valid) if missing
        
        # 3. Range check validation
        if value_db < 0 or value_db > 150:
            quality_flag = 2 # Suspect/Out of bounds
            print(f"Quality Flag applied: Out of bounds value {value_db} from {sensor_id}")
            
        # 4. Insert into TimescaleDB hypertable
        insert_query = """
            INSERT INTO noise_measurements (ts, sensor_id, value_db, unit, quality_flag)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (ts, sensor_id, value_db, unit, quality_flag))
        print(f"Ingested: {sensor_id} -> {value_db} dB at {ts}")
        
    except json.JSONDecodeError:
        print(f"Error: Malformed JSON payload received: {msg.payload}")
    except psycopg2.Error as db_err:
        print(f"Database error during insertion: {db_err}")
    except Exception as e:
        print(f"Unexpected error processing message: {e}")

# --- Start the MQTT Client ---
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "ingestion-client")
client.on_connect = on_connect
client.on_message = on_message

print("Attempting to connect to MQTT broker...")
client.connect(MQTT_BROKER, MQTT_PORT)

try:
    # This keeps the script running, listening for new messages continuously
    client.loop_forever() 
except KeyboardInterrupt:
    print("\nIngestion stopped by user.")
finally:
    cursor.close()
    conn.close()
    client.disconnect()
    print("Connections closed cleanly.")