#ifndef SECRETS_H
#define SECRETS_H

// ===== PROVISIONING DATA =====
// These values are flashed by the admin via web interface
// or pre-loaded via Arduino IDE → Tools → Serial Monitor

// Unique device identifier (UUID format)
#define DEVICE_ID "38ccf41c-5809-4d1b-91f4-f32eb22a94d9"

// Shared secret for HMAC authentication (64 hex chars = 32 bytes)
#define SHARED_SECRET "7fb5aabe6229b8b5190b515ca1f1a2c11aeb149ae3c04a6fbeb87dbe24ca04d5"

// Server's public key (Ed25519, PEM format)
#define SERVER_PUBLIC_KEY "-----BEGIN PUBLIC KEY-----\n" \
"MCowBQYDK2VwAyEA/gBiMwUjg5uMOG/VHFNcZPpKO1rwtZPTO5oAV+wX660=\n" \
"-----END PUBLIC KEY-----\n"


#ifndef SERVER_URL
#define SERVER_URL "https://raidware.example.com"
#endif

#ifndef AUTH_ENDPOINT
#define AUTH_ENDPOINT "/api/devices/device-provisioning/authenticate"
#endif

#endif // SECRETS_H
