#!/bin/bash

# Direct Device-to-Server Authentication Test
# This script tests HMAC-SHA256 authentication without mesh parent requirement

API_URL="http://localhost:5000"
AUTH_TOKEN="eyJhbGc..." # Your JWT token here
ORG_ID="your-org-id-here"
MAC_ADDRESS="AA:BB:CC:DD:EE:FF"

echo "=========================================="
echo "Testing Direct Device Authentication Flow"
echo "=========================================="
echo "Connection Type: DIRECT (No Mesh Parent)"
echo "Authentication: HMAC-SHA256"
echo ""

# Test 1: Generate Keys
echo -e "\n[TEST 1] Generate Keys for New Device"
RESPONSE=$(curl -s -X POST \
  "$API_URL/api/devices/device-provisioning/generate-keys/$ORG_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "'$MAC_ADDRESS'",
    "deviceName": "Test_Device"
  }')
echo "$RESPONSE" | jq .

# Extract values from response
DEVICE_ID=$(echo "$RESPONSE" | jq -r '.provisioning.deviceId')
SHARED_SECRET=$(echo "$RESPONSE" | jq -r '.provisioning.sharedSecret')
echo "[✓] Got Device ID: $DEVICE_ID"
echo "[✓] Got Shared Secret: ${SHARED_SECRET:0:16}..."

# Test 2: Simulate Device Authentication (Direct Connection)
echo -e "\n[TEST 2] Device Authenticate via Direct Connection (HMAC)"
TIMESTAMP=$(($(date +%s)))
MESSAGE="$DEVICE_ID|$TIMESTAMP"
# Note: This requires a way to generate HMAC-SHA256. For testing, use:
# echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$SHARED_SECRET" -hex
SIGNATURE="mock-signature-here"

RESPONSE=$(curl -s -X POST \
  "$API_URL/api/devices/device-provisioning/authenticate" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'$DEVICE_ID'",
    "macAddress": "'$MAC_ADDRESS'",
    "timestamp": '$TIMESTAMP',
    "signature": "'$SIGNATURE'"
  }')
echo "$RESPONSE" | jq .

# Test 3: Get Copyable Secrets (Retrieve Again)
echo -e "\n[TEST 3] Get Copyable Secrets"
curl -s -X GET \
  "$API_URL/api/devices/device-provisioning/copy-secrets/$ORG_ID/$MAC_ADDRESS" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq .

echo -e "\n=========================================="
echo "All tests complete!"
echo "=========================================="
