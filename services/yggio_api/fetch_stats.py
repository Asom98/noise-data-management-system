import requests
import json
from yggio_auth import get_yggio_token

NODE_CONFIGS = {
    "69a6f8d609e3eb66b537dbfe": {
        "name": "DN0007-Spångatan",
        "measurement": "68c40a532470f5eb989e6e91_output.soundLevel"
    },
    "69a7e07109e3eb66b5555a43": {
        "name": "DN0009-Bergsgatan",
        "measurement": "68b7ebba2470f5eb98a3f19a_soundLaeq"
    }
}

def get_node_stats(token, node_id, name, measurement):
    url = f"https://sensordata.malmo.se/api/iotnodes/{node_id}/stats"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # We leave start and end out entirely so it defaults to pulling the max 1000 points!
    params = {
        "measurement": measurement
    }
    
    print(f"\nFetching historical stats for {name} (Measurement: {measurement})...")
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status() 
        
        data = response.json()
        print(f" -> Server returned {len(data) if isinstance(data, list) else 'some'} records!")
        return data
        
    except requests.exceptions.HTTPError as err:
        print(f"Failed to fetch stats. HTTP Error: {err}")
        if err.response is not None:
            print(f"Server Message: {err.response.text}")
        return None
        
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

if __name__ == "__main__":
    token = get_yggio_token()
    
    if token:
        all_stats = {}
        
        for node_id, config in NODE_CONFIGS.items():
            stats = get_node_stats(token, node_id, config["name"], config["measurement"])
            all_stats[config["name"]] = stats
                
        with open("stats_response.json", "w", encoding="utf-8") as f:
            json.dump(all_stats, f, indent=4)
        print("\nSuccess! Saved raw API response to 'stats_response.json'.")