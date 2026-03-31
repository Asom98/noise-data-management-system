import os
import json
import requests
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
USERNAME = os.getenv("YGGIO_USERNAME")
PASSWORD = os.getenv("YGGIO_PASSWORD")

def stream_telemetry():
    print("🔬 TELEMETRY STREAMER INITIATED (10-Minute Run)...")
    
    # 1. Authenticate Once
    auth_resp = requests.post(
        "https://sensordata.malmo.se/api/auth/local",
        headers={"accept": "application/json", "Content-Type": "application/json"},
        json={"username": USERNAME, "password": PASSWORD}
    )
    
    if auth_resp.status_code != 200:
        print("❌ Auth failed!")
        return
        
    token = auth_resp.json().get("token")
    print("✅ Authenticated. Starting 10-minute polling cycle...\n")
    
    # 2. Loop for 10 iterations (1 minute apart)
    for i in range(1, 11):
        timestamp = datetime.now().strftime("%H%M%S")
        print(f"[{i}/10] Fetching payload at {timestamp}...")
        
        nodes_resp = requests.get(
            "https://sensordata.malmo.se/api/iotnodes",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        )
        
        if nodes_resp.status_code == 200:
            data = nodes_resp.json()
            filename = f"malmo_dump_{timestamp}.json"
            
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
                
            print(f"   💾 Saved {len(data)} nodes to {filename}")
        else:
            print(f"   ❌ Fetch failed: {nodes_resp.status_code}")
            
        if i < 10:
            print("   ⏳ Waiting 60 seconds...\n")
            time.sleep(60)
            
    print("\n🏁 10-Minute Data Collection Complete!")

if __name__ == "__main__":
    stream_telemetry()