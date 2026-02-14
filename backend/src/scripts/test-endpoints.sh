#!/bin/bash

# Configuration variables
BASE_URL="http://localhost:5000"
TOKEN="your-jwt-token-here"
ORG_ID="your-org-id-here"
MAC="AA:BB:CC:DD:EE:FF"

echo "=========================================="
echo "TESTING ENDPOINT 1: GET /api/devices/topology/:orgId"
echo "=========================================="
curl -s -X GET "$BASE_URL/api/devices/topology/$ORG_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
echo -e "\n"

echo "=========================================="
echo "TESTING ENDPOINT 2: GET /api/devices/org/:orgId"
echo "=========================================="
curl -s -X GET "$BASE_URL/api/devices/org/$ORG_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
echo -e "\n"

echo "=========================================="
echo "TESTING ENDPOINT 3: POST /api/devices/revoke"
echo "=========================================="
curl -s -X POST "$BASE_URL/api/devices/revoke" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"macAddress\": \"$MAC\"}" | jq .
echo -e "\n"

echo "Testing complete."
