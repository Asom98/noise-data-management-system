"""
Yggio Connection Test — Step by step from zero.

Steps:
  1. Authenticate  → get Bearer token
  2. List IoT nodes
  3. Fetch time-series stats for each node
"""

import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://sensordata.malmo.se"
USERNAME = os.getenv("YGGIO_USERNAME")
PASSWORD = os.getenv("YGGIO_PASSWORD")


# ── Step 1: Authenticate ────────────────────────────────────────────────────

def step1_authenticate():
    print("=" * 60)
    print("STEP 1: Authenticate with Yggio")
    print("=" * 60)
    print(f"  URL      : {BASE_URL}/api/auth/local")
    print(f"  Username : {USERNAME}")

    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/local",
            headers={"accept": "application/json", "Content-Type": "application/json"},
            json={"username": USERNAME, "password": PASSWORD},
            timeout=15,
        )
        response.raise_for_status()
        token = response.json().get("token")
        print(f"  Status   : {response.status_code} OK")
        print(f"  Token    : {token[:30]}...")
        return token

    except requests.exceptions.ConnectionError as e:
        print(f"  FAILED — Cannot reach server: {e}")
    except requests.exceptions.Timeout:
        print("  FAILED — Request timed out after 15s")
    except requests.exceptions.HTTPError as e:
        print(f"  FAILED — HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print(f"  FAILED — Unexpected error: {e}")

    return None


# ── Step 2: List IoT nodes ──────────────────────────────────────────────────

def step2_list_nodes(token):
    print()
    print("=" * 60)
    print("STEP 2: Retrieve available IoT nodes")
    print("=" * 60)
    print(f"  URL : {BASE_URL}/api/iotnodes")

    try:
        response = requests.get(
            f"{BASE_URL}/api/iotnodes",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=15,
        )
        response.raise_for_status()
        nodes = response.json()
        print(f"  Status : {response.status_code} OK")
        print(f"  Found  : {len(nodes)} node(s)")
        for node in nodes:
            node_id = node.get("_id") or node.get("id", "?")
            name = node.get("name", "Unknown")
            print(f"    - {name}  (id: {node_id})")
        return nodes

    except requests.exceptions.HTTPError as e:
        print(f"  FAILED — HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print(f"  FAILED — {e}")

    return []


# ── Step 3: Fetch stats for each node ──────────────────────────────────────

def step3_fetch_stats(token, nodes):
    print()
    print("=" * 60)
    print("STEP 3: Fetch time-series stats per node")
    print("=" * 60)

    for node in nodes:
        node_id = node.get("_id") or node.get("id")
        name = node.get("name", "Unknown")
        url = f"{BASE_URL}/api/iotnodes/{node_id}/stats"
        print(f"\n  Node: {name} (id: {node_id})")
        print(f"  URL : {url}")

        try:
            response = requests.get(
                url,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=15,
            )
            response.raise_for_status()
            stats = response.json()
            print(f"  Status : {response.status_code} OK")
            print(f"  Data   : {json.dumps(stats, indent=4)[:300]}...")  # first 300 chars

        except requests.exceptions.HTTPError as e:
            print(f"  FAILED — HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print(f"  FAILED — {e}")


# ── Main ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\nYggio Connection Test — Starting...\n")

    token = step1_authenticate()
    if not token:
        print("\nCannot continue without a valid token. Exiting.")
        exit(1)

    nodes = step2_list_nodes(token)
    if not nodes:
        print("\nNo nodes found or failed to retrieve. Exiting.")
        exit(1)

    step3_fetch_stats(token, nodes)

    print()
    print("=" * 60)
    print("Connection test complete.")
    print("=" * 60)
