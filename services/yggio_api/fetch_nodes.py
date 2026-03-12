import requests
import json
from yggio_auth import get_yggio_token

def get_iot_nodes(token):
    url = "https://sensordata.malmo.se/api/iotnodes"
    
    # Passing the Bearer token in the headers exactly as the instructions specified
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("\nFetching available IoT nodes from Malmö City...")
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status() # Check for HTTP errors
        nodes = response.json()
        
        print(f"Successfully retrieved {len(nodes)} nodes!")
        
        # Print a clean summary of the nodes we have access to
        for node in nodes:
            # The API might use '_id' or 'id', we will check both just in case
            node_id = node.get('_id') or node.get('id', 'Unknown ID')
            name = node.get('name', 'Unknown Name')
            print(f"- Node ID: {node_id} | Name: {name}")
            
        return nodes
        
    except requests.exceptions.HTTPError as err:
        print(f"Failed to fetch nodes. HTTP Error: {err}")
        print(f"Server Response: {response.text}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

if __name__ == "__main__":
    # 1. Get the token securely
    token = get_yggio_token()
    
    if token:
        # 2. Use the token to fetch the nodes
        nodes = get_iot_nodes(token)
        
        # 3. Save the raw JSON data to a file so we can study its structure!
        if nodes:
            with open("nodes_response.json", "w", encoding="utf-8") as f:
                json.dump(nodes, f, indent=4)
            print("\nSaved full API response to 'nodes_response.json' for schema inspection.")