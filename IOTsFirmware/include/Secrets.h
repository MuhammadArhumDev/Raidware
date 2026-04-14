#ifndef SECRETS_H
#define SECRETS_H

// ===== PROVISIONING DATA =====
// These values are flashed by the admin via web interface
// or pre-loaded via Arduino IDE → Tools → Serial Monitor

// Unique device identifier (UUID format)
#define DEVICE_ID "5581b55f-b9fb-4934-b059-419c98fb69d2"

// Shared secret for HMAC authentication (64 hex chars = 32 bytes)
#define SHARED_SECRET "7a821f93ff9801427892fa3652682aa782f66ce1055e15004131510dbcec2017"

// Server's public key (Ed25519, PEM format)
#define SERVER_PUBLIC_KEY "-----BEGIN PUBLIC KEY-----\n" \
"MCowBQYDK2VwAyEAHM/bVV00G59yoMhpEM3EsAvHqe2b91ovt6ExFAZw7FI=\n" \
"-----END PUBLIC KEY-----\n"


#ifndef SERVER_URL
#define SERVER_URL "https://raidware.example.com"
#endif

#ifndef AUTH_ENDPOINT
#define AUTH_ENDPOINT "/api/devices/device-provisioning/authenticate"
#endif

#endif // SECRETS_H
