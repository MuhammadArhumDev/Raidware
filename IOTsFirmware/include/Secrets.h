#ifndef SECRETS_H
#define SECRETS_H

// ===== PROVISIONING DATA =====
// These values are flashed by the admin via web interface
// or pre-loaded via Arduino IDE → Tools → Serial Monitor

// Unique device identifier (UUID format)
#define DEVICE_ID "0627af0c-3614-4e61-9f41-f95276b93c97"

// Shared secret for HMAC authentication (64 hex chars = 32 bytes)
#define SHARED_SECRET "e9018678ee0448e19dcdbff546d368b8668f6cf7e2c02bd137e993e8f21728b6"

// Server's public key (Ed25519, PEM format)
#define SERVER_PUBLIC_KEY "-----BEGIN PUBLIC KEY-----\n" \
"MCowBQYDK2VwAyEAqanL2k/dix4t4X0ZQz/hOGGTxbrwYZ7i3yD5o+GNol4=\n" \
"-----END PUBLIC KEY-----\n"


#ifndef SERVER_URL
#define SERVER_URL "https://raidware.example.com"
#endif

#ifndef AUTH_ENDPOINT
#define AUTH_ENDPOINT "/api/devices/device-provisioning/authenticate"
#endif

#endif // SECRETS_H
