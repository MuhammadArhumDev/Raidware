#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <WiFiMulti.h>
#include <Adafruit_NeoPixel.h>
#include "mbedtls/md.h"
#include "Secrets.h" // Must contain SECRET_SSID, SECRET_PASS, SERVER_HOST, SERVER_PORT, DEVICE_SHARED_SECRET
extern "C" {
    #include "api.h"
}

#define LED_PIN 48
#define NUM_PIXELS 1

Adafruit_NeoPixel pixel(NUM_PIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);
WiFiMulti wifiMulti;
WebSocketsClient webSocket;

// Global State
String macAddress;
bool isAuthenticated = false;

// LED & WiFi State
unsigned long lastWifiReconnectAttempt = 0;
const unsigned long WIFI_RECONNECT_INTERVAL = 5000;
unsigned long lastLedBlink = 0;
const unsigned long LED_BLINK_INTERVAL = 500;
bool ledOn = false;

// --- Crypto Helper: HMAC-SHA256 ---
// --- Crypto Helper: HMAC-SHA256 ---
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
    return hashStr;
}

// --- Crypto Helper: AES-GCM ---
#include "mbedtls/gcm.h"

uint8_t sharedSecret[32]; // 32 bytes for AES-256
bool hasSharedSecret = false;

// Encrypt payload (AES-256-GCM)
// Returns JSON string: { "iv": "hex", "tag": "hex", "data": "hex" }
String encryptMessage(String plaintext) {
    if (!hasSharedSecret) return plaintext; // Fallback or Error

    mbedtls_gcm_context aes;
    mbedtls_gcm_init(&aes);
    mbedtls_gcm_setkey(&aes, MBEDTLS_CIPHER_ID_AES, sharedSecret, 256);

    uint8_t iv[12];
    esp_fill_random(iv, 12);
    
    size_t len = plaintext.length();
    uint8_t* output = new uint8_t[len];
    uint8_t tag[16];

    mbedtls_gcm_crypt_and_tag(&aes, MBEDTLS_GCM_ENCRYPT, len, iv, 12, NULL, 0, (const unsigned char*)plaintext.c_str(), output, tag);
    mbedtls_gcm_free(&aes);

    // Format as JSON
    DynamicJsonDocument doc(2048);
    doc["iv"] = bytesToHexString(iv, 12);
    doc["tag"] = bytesToHexString(tag, 16);
    doc["data"] = bytesToHexString(output, len);
    
    delete[] output;
    
    String jsonString;
    serializeJson(doc, jsonString);
    return jsonString;
}

// Decrypt payload (AES-256-GCM)
// Expects JSON { "iv": "hex", "tag": "hex", "data": "hex" }
String decryptMessage(String jsonPayload) {
    if (!hasSharedSecret) return "";

    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, jsonPayload);
    if (error) return "";

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

// --- Hex Helpers ---
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

// --- Socket.IO Helper Functions ---

void sendSocketEvent(String eventName, DynamicJsonDocument& doc) {
    String jsonString;
    serializeJson(doc, jsonString);
    // Socket.IO 42 format: 4 (Message) 2 (Event) [ "event", payload ]
    String output = "42[\"" + eventName + "\"," + jsonString + "]";
    webSocket.sendTXT(output);
}

void hexdump(const void *mem, uint32_t len, uint8_t cols = 16) {
	const uint8_t* src = (const uint8_t*) mem;
	Serial.printf("\n[HEXDUMP] Address: 0x%08X len: 0x%X (%d)", (ptrdiff_t)src, len, len);
	for(uint32_t i = 0; i < len; i++) {
		if(i % cols == 0) {
			Serial.printf("\n[0x%08X] 0x%08X: ", (ptrdiff_t)src, i);
		}
		Serial.printf("%02X ", *src);
		src++;
	}
	Serial.printf("\n");
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
	switch(type) {
		case WStype_DISCONNECTED:
			Serial.printf("[WSc] Disconnected!\n");
            isAuthenticated = false;
            // pixel.setPixelColor(0, pixel.Color(255, 0, 0)); // Red
            // pixel.show();
			break;
		case WStype_CONNECTED:
			Serial.printf("[WSc] Connected to url: %s\n", payload);
            // pixel.setPixelColor(0, pixel.Color(255, 165, 0)); // Orange (Connected, waiting auth)
            // pixel.show();

            // Init Auth: "auth:init"
            {
                DynamicJsonDocument doc(1024);
                doc["macAddress"] = macAddress;
                sendSocketEvent("auth:init", doc);
            }
			break;
		case WStype_TEXT:
            // Handle Socket.IO packets
            // Format 42["event", data]
            String text = (char*)payload;
            if (text.startsWith("42")) {
                // Parse Event
                int jsonStart = text.indexOf('[');
                if (jsonStart != -1) {
                    String jsonBody = text.substring(jsonStart);
                    DynamicJsonDocument doc(2048);
                    DeserializationError error = deserializeJson(doc, jsonBody);
                    if (!error) {
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
                                 Serial.print("[Kyber] Error: Invalid PK length! Expected ");
                                 Serial.print(PQCLEAN_MLKEM768_CLEAN_CRYPTO_PUBLICKEYBYTES * 2);
                                 Serial.print(" but got ");
                                 Serial.println(pkHex.length());
                             }
                             
                             // Calculate Signature (Standard Auth)
                             // Payload: nonce + macAddress
                             String payload = nonce + macAddress;
                             // Secret: Defined in Secrets.h or dynamically loaded
                             String signature = hmacSHA256(DEVICE_SHARED_SECRET, payload);
                             
                             // Send Response
                             DynamicJsonDocument resp(2048);
                             resp["signature"] = signature;
                             // Attach Kyber Ciphertext
                             resp["ciphertext"] = bytesToHexString(ct, PQCLEAN_MLKEM768_CLEAN_CRYPTO_CIPHERTEXTBYTES);
                             
                             sendSocketEvent("auth:response", resp);
                         } 
                         else if (event == "auth:success") {
                             Serial.println("[Auth] SUCCESS!");
                             isAuthenticated = true;
                             // pixel.setPixelColor(0, pixel.Color(0, 255, 0)); // Green
                             // pixel.show();
                         }
                         else if (event == "auth:failed") {
                             Serial.println("[Auth] FAILED!");
                             isAuthenticated = false;
                             // pixel.setPixelColor(0, pixel.Color(255, 0, 0)); // Red
                             // pixel.show();
                         }
                         else if (event == "message") {
                             // Handle incoming encrypted message
                             // Payload is expected to be { iv, tag, data }
                             String msgPayload;
                             serializeJson(doc[1], msgPayload);
                             
                             Serial.println("[Message] Received Payload (Encrypted): " + msgPayload);
                             
                             String decrypted = decryptMessage(msgPayload);
                             if (decrypted != "") {
                                 Serial.println("[Message] Decrypted Content: " + decrypted);
                                 // Optional: Act on message, e.g. "REBOOT"
                             } else {
                                 Serial.println("[Message] Decryption Failed!");
                             }
                         }
                    }
                }
            }
			break;
	}
}

void setup() {
    Serial.begin(115200);
    pixel.begin();
    pixel.setBrightness(20);

    // Get MAC
    macAddress = WiFi.macAddress();
    macAddress.replace(":", ""); // Remove colons to match backend
    Serial.println("Device MAC: " + macAddress);

    wifiMulti.addAP(SECRET_SSID, SECRET_PASS);
    
    Serial.println("Connecting to WiFi...");
    while(wifiMulti.run() != WL_CONNECTED) {
        Serial.print(".");
        delay(500);
    }
    Serial.println("\nWiFi Connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

    // WebSocket Init
    // Namespace: /devices
    // Socket.IO Handshake URL format: /socket.io/?EIO=4&transport=websocket
    // But we use the /devices namespace -> URL: /socket.io/?EIO=4&transport=websocket&sid=... (handled by lib?)
    // WebSocketsClient doesn't handle namespaces automatically in the URL path for handshake 
    // Usually we connect to root, then send namespace packet. 
    // Or we append path.
    
    // For simplicity with this library, let's try connecting to the default path and check if the backend handles it.
    // However, my backend logic is `io.of("/devices")`.
    // Standard Socket.io client connects to `/socket.io/` then sends a CONNECT packet `40/devices,`.
    
    webSocket.begin(SECRET_HOST, SECRET_PORT, "/socket.io/?EIO=4&transport=websocket");
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(5000);
    
    // Set headers if needed?
}

unsigned long lastPulse = 0;

void loop() {
    unsigned long currentMillis = millis();

    // --- WiFi Connection Logic (WiFiMulti) ---
    // wifiMulti.run() manages connection automatically
    if (wifiMulti.run() != WL_CONNECTED) {
        Serial.println("[WiFi] Reconnecting...");
        delay(100); 
        // wifiMulti.run() should be called frequently
        
        // Blink RED when disconnected
        if (currentMillis - lastLedBlink > LED_BLINK_INTERVAL) {
            lastLedBlink = currentMillis;
            ledOn = !ledOn;
            if (ledOn) pixel.setPixelColor(0, pixel.Color(255, 0, 0)); // Red
            else pixel.setPixelColor(0, pixel.Color(0, 0, 0)); // Off
            pixel.show();
        }
    } else {
        // --- Connected Logic ---
        // Blink GREEN when connected
        if (currentMillis - lastLedBlink > LED_BLINK_INTERVAL) {
            lastLedBlink = currentMillis;
            ledOn = !ledOn;
            if (ledOn) pixel.setPixelColor(0, pixel.Color(0, 255, 0)); // Green
            else pixel.setPixelColor(0, pixel.Color(0, 0, 0)); // Off
            pixel.show();
        }

        webSocket.loop();

        if (isAuthenticated && currentMillis - lastPulse > 5000) {
            lastPulse = currentMillis;
            // Send Pulse
            // "42/devices,[\"pulse\",{}]"
            
            if (hasSharedSecret) {
                DynamicJsonDocument pulseDoc(64);
                pulseDoc["status"] = "online";
                pulseDoc["timestamp"] = millis();
                String pulseJson;
                serializeJson(pulseDoc, pulseJson);
                
                String encryptedPulse = encryptMessage(pulseJson);
                
                // Wrap in JSON object for Socket.IO
                DynamicJsonDocument outDoc(2048);
                DeserializationError err = deserializeJson(outDoc, encryptedPulse);
                if(!err) sendSocketEvent("pulse", outDoc);
            } else {
                 webSocket.sendTXT("42/devices,[\"pulse\",{}]");
            }
        }
    }
}
