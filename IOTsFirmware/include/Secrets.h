#ifndef SECRETS_H
#define SECRETS_H

#define DEVICE_ID "38ccf41c-5809-4d1b-91f4-f32eb22a94d9"

#define SHARED_SECRET "7fb5aabe6229b8b5190b515ca1f1a2c11aeb149ae3c04a6fbeb87dbe24ca04d5"

#define SERVER_PUBLIC_KEY "-----BEGIN PUBLIC KEY-----\n" \
"MCowBQYDK2VwAyEA/gBiMwUjg5uMOG/VHFNcZPpKO1rwtZPTO5oAV+wX660=\n" \
"-----END PUBLIC KEY-----\n"

#ifndef SERVER_URL
#define SERVER_URL "https://raidware.example.com"
#endif

#ifndef AUTH_ENDPOINT
#define AUTH_ENDPOINT "/api/devices/device-provisioning/authenticate"
#endif

#endif 
