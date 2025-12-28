#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <WiFiMulti.h>
#include <Adafruit_NeoPixel.h>

// mbedtls includes
#include "mbedtls/md.h"
#include "mbedtls/gcm.h"

// Kyber PQC library
extern "C" {
    #include "api.h"
}

#include "Secrets.h" 

#define LED_PIN 48
#define NUM_PIXELS 1

Adafruit_NeoPixel pixel(NUM_PIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);
WiFiMulti wifiMulti;
WebSocketsClient webSocket;

String macAddress;
bool isAuthenticated = false;

unsigned long lastWifiReconnectAttempt = 0;
const unsigned long WIFI_RECONNECT_INTERVAL = 5000;
unsigned long lastLedBlink = 0;
const unsigned long LED_BLINK_INTERVAL = 500;
bool ledOn = false;

// ==========================================
// FORWARD DECLARATIONS (Crucial for Scope)
// ==========================================
void hexStringToBytes(String hex, uint8_t* bytes, size_t len);
String bytesToHexString(const uint8_t* bytes, size_t len);

// ==========================================
// CRYPTO HELPERS
// ==========================================

String hmacSHA256(String key, String payload) {
    byte hmacResult[32];
    mbedtls_md_context_t ctx;
    mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;

    mbedtls_md_init(&ctx);
    mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 1);
    mbedtls_md_hmac_starts(&ctx, (const unsigned char *)key.c_str(), key.length());
    mbedtls_md_hmac_update(&ctx, (const unsigned char *)payload.c_str(), payload.length());
    mbedtls_md_hmac_finish(&ctx, hmacResult);
    mbedtls_md_free(&ctx);

    String hashStr = "";
    for (int i = 0; i < 32; i++) {
        if (hmacResult[i] < 16) hashStr += "0";
        hashStr += String(hmacResult[i], HEX);
    }
    return hashStr;
}

uint8_t sharedSecret[32]; // AES-256
bool hasSharedSecret = false;

String encryptMessage(String plaintext) {
    if (!hasSharedSecret) return plaintext;

    mbedtls_gcm_context aes;
    mbedtls_gcm_init(&aes);
    mbedtls_gcm_setkey(&aes, MBEDTLS_CIPHER_ID_AES, sharedSecret, 256);

    uint8_t iv[12];
    esp_fill_random(iv, 12);
    
    size_t len = plaintext.length();
    uint8_t* output = new uint8_t[len];
    uint8_t tag[16];

    // FIX: Correct signature for ESP32 mbedTLS (note the placement of 16 for tag_len)
    // The error "too few arguments" and "invalid conversion" was because of missing tag_len
    mbedtls_gcm_crypt_and_tag(&aes, MBEDTLS_GCM_ENCRYPT, len, iv, 12, NULL, 0, (const unsigned char*)plaintext.c_str(), output, 16, tag);
    
    mbedtls_gcm_free(&aes);

    DynamicJsonDocument doc(2048);
    // These functions are now declared above, so scope issue is resolved
    doc["iv"] = bytesToHexString(iv, 12);
    doc["tag"] = bytesToHexString(tag, 16);
    doc["data"] = bytesToHexString(output, len);
    
    delete[] output;
    
    String jsonString;
    serializeJson(doc, jsonString);
    return jsonString;
}

String decryptMessage(String jsonPayload) {
    if (!hasSharedSecret) return "";

    DynamicJsonDocument doc(2048);
    if (deserializeJson(doc, jsonPayload)) return "";

    String ivHex = doc["iv"];
    String tagHex = doc["tag"];
    String dataHex = doc["data"];

    uint8_t iv[12];
    uint8_t tag[16];
    size_t dataLen = dataHex.length() / 2;
    uint8_t* data = new uint8_t[dataLen];
    uint8_t* output = new uint8_t[dataLen];

    hexStringToBytes(ivHex, iv, 12);
    hexStringToBytes(tagHex, tag, 16);
    hexStringToBytes(dataHex, data, dataLen);

    mbedtls_gcm_context aes;
    mbedtls_gcm_init(&aes);
    mbedtls_gcm_setkey(&aes, MBEDTLS_CIPHER_ID_AES, sharedSecret, 256);

    int ret = mbedtls_gcm_auth_decrypt(&aes, dataLen, iv, 12, NULL, 0, tag, 16, data, output);
    mbedtls_gcm_free(&aes);
    
    delete[] data;

    if (ret != 0) {
        delete[] output;
        Serial.println("[AES] Decryption/Auth Failed!");
        return "";
    }

    String result = "";
    for(size_t i=0; i<dataLen; i++) result += (char)output[i];
    delete[] output;
    
    return result;
}

// ==========================================
// STRING HELPERS (Defined here)
// ==========================================

void hexStringToBytes(String hex, uint8_t* bytes, size_t len) {
    for (size_t i = 0; i < len; i++) {
        String byteStr = hex.substring(i * 2, i * 2 + 2);
        bytes[i] = (uint8_t) strtol(byteStr.c_str(), NULL, 16);
    }
}

String bytesToHexString(const uint8_t* bytes, size_t len) {
    String hex = "";
    for (size_t i = 0; i < len; i++) {
        if (bytes[i] < 16) hex += "0";
        hex += String(bytes[i], HEX);
    }
    return hex;
}

// ==========================================
// WEBSOCKET & APP LOGIC
// ==========================================

void sendSocketEvent(String eventName, DynamicJsonDocument& doc) {
    String jsonString;
    serializeJson(doc, jsonString);
    String output = "42[\"" + eventName + "\"," + jsonString + "]";
    webSocket.sendTXT(output);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.println("[WSc] Disconnected!");
            isAuthenticated = false;
            break;

        case WStype_CONNECTED: {
            Serial.printf("[WSc] Connected to %s\n", payload);
            DynamicJsonDocument doc(256);
            doc["macAddress"] = macAddress;
            sendSocketEvent("auth:init", doc);
            break;
        }

        case WStype_TEXT: {
            String text = (char*)payload;
            if (!text.startsWith("42")) break;

            int jsonStart = text.indexOf('[');
            if (jsonStart < 0) break;

            DynamicJsonDocument doc(2048);
            if (deserializeJson(doc, text.substring(jsonStart))) break;

            String event = doc[0];

            if (event == "auth:challenge") {
                String nonce = doc[1]["nonce"];
                String pkHex = doc[1]["pk"];
                Serial.println("[Auth] Received Nonce: " + nonce);
                
                uint8_t pk[PQCLEAN_MLKEM768_CLEAN_CRYPTO_PUBLICKEYBYTES];
                uint8_t ss[PQCLEAN_MLKEM768_CLEAN_CRYPTO_BYTES];
                uint8_t ct[PQCLEAN_MLKEM768_CLEAN_CRYPTO_CIPHERTEXTBYTES];
                
                if (pkHex.length() == PQCLEAN_MLKEM768_CLEAN_CRYPTO_PUBLICKEYBYTES * 2) {
                    hexStringToBytes(pkHex, pk, PQCLEAN_MLKEM768_CLEAN_CRYPTO_PUBLICKEYBYTES);
                    PQCLEAN_MLKEM768_CLEAN_crypto_kem_enc(ct, ss, pk);
                    memcpy(sharedSecret, ss, 32);
                    hasSharedSecret = true;
                    Serial.println("[Kyber] Shared Secret stored.");
                } else {
                    Serial.print("[Kyber] Error: Invalid PK length!");
                }
                
                String payloadForSig = nonce + macAddress;
                String signature = hmacSHA256(DEVICE_SHARED_SECRET, payloadForSig);
                
                DynamicJsonDocument resp(2048);
                resp["signature"] = signature;
                resp["ciphertext"] = bytesToHexString(ct, PQCLEAN_MLKEM768_CLEAN_CRYPTO_CIPHERTEXTBYTES);
                
                sendSocketEvent("auth:response", resp);
            } 
            else if (event == "auth:success") {
                Serial.println("[Auth] SUCCESS");
                isAuthenticated = true;
            }
            else if (event == "auth:failed") {
                Serial.println("[Auth] FAILED");
                isAuthenticated = false;
            }
            else if (event == "message") {
                String enc;
                serializeJson(doc[1], enc);
                String dec = decryptMessage(enc);
                if (dec.length()) {
                    Serial.println("[MSG] " + dec);
                }
            }
            break;
        }
    }
}

void setup() {
    Serial.begin(115200);
    pixel.begin();
    pixel.setBrightness(20);

    macAddress = WiFi.macAddress();
    macAddress.replace(":", "");
    Serial.println("MAC: " + macAddress);

    wifiMulti.addAP(SECRET_SSID, SECRET_PASS);
    
    Serial.println("Connecting to WiFi...");
    while(wifiMulti.run() != WL_CONNECTED) {
        Serial.print(".");
        delay(500);
    }
    Serial.println("\nWiFi Connected");

    webSocket.begin(SECRET_HOST, SECRET_PORT, "/socket.io/?EIO=4&transport=websocket");
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(5000);
}

unsigned long lastPulse = 0;

void loop() {
    wifiMulti.run();
    webSocket.loop();

    if (isAuthenticated && millis() - lastPulse > 5000 && hasSharedSecret) {
        lastPulse = millis();

        DynamicJsonDocument doc(128);
        doc["status"] = "online";
        doc["ts"] = millis();

        String plain;
        serializeJson(doc, plain);

        String enc = encryptMessage(plain);

        DynamicJsonDocument out(512);
        deserializeJson(out, enc);
        sendSocketEvent("pulse", out);
    }
}
