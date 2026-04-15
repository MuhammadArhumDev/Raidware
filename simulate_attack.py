import requests
import time
import json
import random

# Replace with your actual backend URL and an active device's token
BACKEND_URL = "http://localhost:5000"
DEVICE_TOKEN = "REPLACE_WITH_YOUR_DEVICE_AUTH_TOKEN"
MAC_ADDRESS = "DC:B4:D9:17:1D:98" # Replace with your device's MAC

def send_simulated_attack_log():
    url = f"{BACKEND_URL}/api/devices/device-provisioning/network-log"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEVICE_TOKEN}"
    }

    # Simulate a DoS Hulk signature:
    # High packet count (e.g., > 100) and low bytes per packet (e.g., < 50)
    # The rule in ids_server.py: bytes_per_pkt < 50 and packet_count > 100
    
    payload = {
        "deviceId": "38ccf41c-5809-4d1b-91f4-f32eb22a94d9",
        "macAddress": MAC_ADDRESS,
        "srcIp": "192.168.1.100", # Attacker IP
        "dstIp": "10.0.0.1",
        "protocol": "TCP",
        "srcPort": random.randint(1024, 65535),
        "dstPort": 80,
        "packetCount": 500,     # High packet rate
        "byteCount": 10000,     # Small payload (20 bytes per packet)
        "flowDuration": 10      # Short burst
    }

    print(f"Sending simulated DoS telemetry to {url}...")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            print("✅ Telemetry sent successfully.")
            print("Response:", response.json())
            print("Check your dashboard Network Logs to see the threat alert!")
        else:
            print(f"❌ Failed to send telemetry. HTTP {response.status_code}")
            print("Response:", response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    send_simulated_attack_log()
