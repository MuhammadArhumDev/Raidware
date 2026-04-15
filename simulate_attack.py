import requests
import time
import json
import random


BACKEND_URL = "http://localhost:5000"
DEVICE_TOKEN = "7fb5aabe6229b8b5190b515ca1f1a2c11aeb149ae3c04a6fbeb87dbe24ca04d5"
MAC_ADDRESS = "20:6E:F1:98:AF:44" 

def send_simulated_attack_log():
    url = f"{BACKEND_URL}/api/devices/device-provisioning/network-log"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEVICE_TOKEN}"
    }

    
    payload = {
        "deviceId": "38ccf41c-5809-4d1b-91f4-f32eb22a94d9",
        "macAddress": MAC_ADDRESS,
        "srcIp": "10.229.27.10",
        "dstIp": "10.229.27.109",
        "protocol": "TCP",
        "srcPort": random.randint(1024, 65535),
        "dstPort": 80,
        "packetCount": 500,
        "byteCount": 10000,
        "flowDuration": 10     
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
    print("Starting continuous DoS attack simulation (Press Ctrl+C to stop)...")
    try:
        while True:
            send_simulated_attack_log()
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping attack simulation.")
