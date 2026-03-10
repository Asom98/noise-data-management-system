import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime, timezone

# Configuration
MQTT_BROKER = "localhost" # Connects to the dockerized mosquitto broker
MQTT_PORT = 1883
TOPIC = "city/malmo/noise"
SENSOR_IDS = ["sensor-malmo-01", "sensor-malmo-02", "sensor-malmo-03"]

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print("Successfully connected to the MQTT Broker!")
    else:
        print(f"Failed to connect, return code {reason_code}")

# Initialize MQTT Client (using v5 to align with modern standards)
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "simulator-client")
client.on_connect = on_connect

print("Attempting to connect to broker...")
client.connect(MQTT_BROKER, MQTT_PORT)
client.loop_start() # Start the network loop in the background

try:
    print("Starting simulated sensor data generation. Press Ctrl+C to exit.")
    while True:
        for sensor_id in SENSOR_IDS:
            # Simulate normal urban noise levels between 40dB and 75dB
            noise_level = round(random.uniform(40.0, 75.0), 2)
            
            # Create payload matching your logical schema (Table 4.1)
            payload = {
                "ts": datetime.now(timezone.utc).isoformat(),
                "sensor_id": sensor_id,
                "value_db": noise_level,
                "unit": "dB",
                "quality_flag": 1 # 1 represents "valid" data
            }
            
            # Publish to broker
            client.publish(TOPIC, json.dumps(payload))
            print(f"Published to {TOPIC}: {payload}")
            
        # Wait 5 seconds before publishing the next batch
        time.sleep(5) 
        
except KeyboardInterrupt:
    print("\nSimulation stopped by user.")
finally:
    client.loop_stop()
    client.disconnect()
    print("Disconnected from broker.")