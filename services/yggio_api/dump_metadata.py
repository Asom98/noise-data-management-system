import os
import json
import requests
from dotenv import load_dotenv

# Load secure credentials
load_dotenv()
USERNAME = os.getenv("YGGIO_USERNAME")
PASSWORD = os.getenv("YGGIO_PASSWORD")

def dump_full_metadata():
    print("Authenticating with Malmö Yggio Platform...")
    auth_resp = requests.post(
        "https://sensordata.malmo.se/api/auth/local",
        headers={"accept": "application/json", "Content-Type": "application/json"},
        json={"username": USERNAME, "password": PASSWORD}
    )
    
    if auth_resp.status_code != 200:
        print("❌ Auth failed!")
        return
        
    token = auth_resp.json().get("token")
    
    print("Fetching full IoT node payload...")
    nodes_resp = requests.get(
        "https://sensordata.malmo.se/api/iotnodes",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    
    if nodes_resp.status_code == 200:
        data = nodes_resp.json()
        # Save it to a beautifully formatted JSON file
        with open("latest_metadata_dump.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        print("✅ Success! Full metadata saved to 'latest_metadata_dump.json'.")
        print(f"Total nodes found: {len(data)}")
    else:
        print(f"❌ Failed to fetch data: {nodes_resp.status_code} - {nodes_resp.text}")

if __name__ == "__main__":
    dump_full_metadata()