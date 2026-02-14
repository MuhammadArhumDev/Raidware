// ESP32 RandomBytes Implementation for PQClean
#include "randombytes.h"
#include <Arduino.h>

int randombytes(uint8_t *out, size_t outlen) {
    // Use ESP32's hardware RNG
    // esp_random() returns a 32-bit random number.
    // esp_fill_random() is the preferred way to fill a buffer.
    
    // Note: On ESP32, WiFi/BT should be enabled for true hardware RNG (entropy).
    // If not, it's pseudo-random. Since we use WiFi, it should be fine.
    
    extern void esp_fill_random(void *buf, size_t len);
    esp_fill_random(out, outlen);
    return 0; // Success
}
