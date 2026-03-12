import os
import requests
from dotenv import load_dotenv

# Load credentials from the .env file
load_dotenv()
USERNAME = os.getenv("YGGIO_USERNAME")
PASSWORD = os.getenv("YGGIO_PASSWORD")
AUTH_URL = "https://sensordata.malmo.se/api/auth/local"

def get_yggio_token():
    print(f"Attempting to log in as: {USERNAME}...")
    
    headers = {
        "accept": "application/json",
        "Content-Type": "application/json"
    }
    
    payload = {
        "username": USERNAME,
        "password": PASSWORD
    }
    
    try:
        response = requests.post(AUTH_URL, headers=headers, json=payload)
        response.raise_for_status() # This will raise an error if the login fails
        
        # Extract the token from the response
        token = response.json().get("token")
        print("\nSuccess! We received the Bearer Token.")
        return token
        
    except requests.exceptions.HTTPError as err:
        print(f"\nLogin Failed. HTTP Error: {err}")
        print(f"Server Response: {response.text}")
        return None
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")
        return None

if __name__ == "__main__":
    # Test the authentication
    token = get_yggio_token()
    if token:
        print(f"Token begins with: {token}...")