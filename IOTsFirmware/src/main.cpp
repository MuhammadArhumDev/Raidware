#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <mbedtls/md.h>  // For HMAC-SHA256
#include <Adafruit_NeoPixel.h>
#include "../include/Secrets.h"

// Hardware configuration
#define LED_PIN 48 // Common for ESP32-S3-DevKitC-1 built-in RGB LED
#define LED_COUNT 1

Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
WiFiMulti wifiMulti;

// Global state
String deviceAuthToken = "";
unsigned long lastAuthTime = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastNetworkLogTime = 0;

// Heartbeat interval (15 seconds)
const unsigned long HEARTBEAT_INTERVAL = 15000;
// Network log interval (5 seconds) — fast enough for live dashboard, slow enough for rate limiter
const unsigned long NETWORK_LOG_INTERVAL = 5000;

/**
 * Generate HMAC-SHA256 signature
 * message format: "deviceId|timestamp"
 */
String generateHmacSignature(String message, String sharedSecret) {
  unsigned char result[32];
  
  // Convert hex string to bytes
  unsigned char secretBytes[32];
  for (int i = 0; i < 32; i++) {
    String byteStr = sharedSecret.substring(i * 2, i * 2 + 2);
    secretBytes[i] = (unsigned char)strtol(byteStr.c_str(), NULL, 16);
  }

  // Compute HMAC-SHA256
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1);
  mbedtls_md_hmac_starts(&ctx, secretBytes, 32);
  mbedtls_md_hmac_update(&ctx, (unsigned char*)message.c_str(), message.length());
  mbedtls_md_hmac_finish(&ctx, result);
  mbedtls_md_free(&ctx);

  // Convert to hex string
  String hexSignature = "";
  for (int i = 0; i < 32; i++) {
    char buffer[3];
    sprintf(buffer, "%02x", result[i]);
    hexSignature += buffer;
  }

  return hexSignature;
}

/**
 * Authenticate device with server via HMAC-SHA256
 * Direct HTTP/HTTPS connection (no mesh routing)
 * Called on boot and periodically (every 1 hour)
 */
bool authenticateWithServer() {
  if (!WiFi.isConnected()) {
    Serial.println("[AUTH] ❌ WiFi not connected, skipping authentication");
    return false;
  }

  HTTPClient http;
  String url = String(SERVER_URL) + String(AUTH_ENDPOINT);
  
  // Generate current timestamp
  unsigned long timestamp = millis() / 1000;
  String message = String(DEVICE_ID) + "|" + String(timestamp);
  
  // Generate HMAC-SHA256 signature
  String signature = generateHmacSignature(message, String(SHARED_SECRET));

  // Create JSON payload
  DynamicJsonDocument doc(512);
  doc["deviceId"] = DEVICE_ID;
  doc["macAddress"] = WiFi.macAddress();
  doc["timestamp"] = timestamp;
  doc["signature"] = signature;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("[AUTH] 🔐 Authenticating with server...");
  Serial.println("[AUTH]   Device ID: " + String(DEVICE_ID).substring(0, 12) + "...");
  Serial.println("[AUTH]   Signature: " + signature.substring(0, 16) + "...");
  Serial.println("[AUTH]   Endpoint: " + url);

  // Make HTTPS request (direct to server)
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setConnectTimeout(5000);  // 5 second timeout
  http.setTimeout(10000);         // 10 second total timeout
  
  int httpCode = http.POST(jsonPayload);

  if (httpCode == 200) {
    String response = http.getString();
    DynamicJsonDocument responseDoc(1024);
    DeserializationError error = deserializeJson(responseDoc, response);

    if (!error) {
      if (responseDoc["success"]) {
        // ✅ Authentication successful
        deviceAuthToken = responseDoc["token"].as<String>();
        String connectionType = responseDoc["connectionType"].as<String>();
        
        lastAuthTime = millis();
        
        Serial.println("[AUTH] ✅ Authentication SUCCESS!");
        Serial.println("[AUTH]   Connection Type: " + connectionType);
        Serial.println("[AUTH]   Token: " + deviceAuthToken.substring(0, 20) + "...");
        Serial.println("[AUTH]   Token Expires: " + responseDoc["expiresIn"].as<String>());
        
        http.end();
        return true;
      } else {
        // ❌ Server returned error
        String errorMsg = responseDoc["error"].as<String>();
        Serial.println("[AUTH] ❌ Server rejected: " + errorMsg);
        http.end();
        return false;
      }
    } else {
      Serial.println("[AUTH] ❌ JSON parse error: " + String(error.c_str()));
      http.end();
      return false;
    }
  } else if (httpCode == 404) {
    Serial.println("[AUTH] ❌ Device not found (404). Check DEVICE_ID in Secrets.h");
    http.end();
    return false;
  } else if (httpCode == 403) {
    Serial.println("[AUTH] ❌ Signature validation failed (403). Check SHARED_SECRET.");
    http.end();
    return false;
  } else if (httpCode == -1) {
    Serial.println("[AUTH] ❌ Connection failed. Check WiFi and firewall.");
    http.end();
    return false;
  } else {
    Serial.println("[AUTH] ❌ HTTP Error: " + String(httpCode) + " - " + http.errorToString(httpCode));
    http.end();
    return false;
  }
}

/**
 * Send heartbeat to server
 * Reports device status, RSSI, IP, free heap, and uptime
 */
void sendHeartbeat() {
  if (!WiFi.isConnected() || deviceAuthToken.length() == 0) {
    return;
  }

  if (millis() - lastHeartbeatTime < HEARTBEAT_INTERVAL) {
    return;
  }
  lastHeartbeatTime = millis();

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/devices/device-provisioning/heartbeat";

  DynamicJsonDocument doc(512);
  doc["deviceId"] = DEVICE_ID;
  doc["macAddress"] = WiFi.macAddress();
  doc["status"] = "online";
  doc["rssi"] = WiFi.RSSI();
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["uptime"] = millis() / 1000;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + deviceAuthToken);
  http.setConnectTimeout(3000);
  http.setTimeout(5000);

  int httpCode = http.POST(jsonPayload);

  if (httpCode == 200) {
    Serial.println("[HEARTBEAT] ✅ Sent successfully (RSSI: " + String(WiFi.RSSI()) + " dBm)");
    
    // Brief blue flash to indicate heartbeat
    strip.setPixelColor(0, strip.Color(0, 0, 255));
    strip.show();
    delay(100);
  } else {
    Serial.println("[HEARTBEAT] ❌ Failed: HTTP " + String(httpCode));
    // If 401, token might be expired
    if (httpCode == 401) {
      Serial.println("[HEARTBEAT] Token expired, clearing for re-auth");
      deviceAuthToken = "";
    }
  }

  http.end();
}

/**
 * Send network log entry to server
 * Reports basic connection metadata for IDS analysis
 * Sends every 5 seconds — fast enough for live dashboard, avoids 429 rate limit
 */
void sendNetworkLog() {
  if (!WiFi.isConnected() || deviceAuthToken.length() == 0) {
    return;
  }

  if (millis() - lastNetworkLogTime < NETWORK_LOG_INTERVAL) {
    return;
  }
  lastNetworkLogTime = millis();

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/devices/device-provisioning/network-log";

  DynamicJsonDocument doc(512);
  doc["deviceId"] = DEVICE_ID;
  doc["macAddress"] = WiFi.macAddress();
  doc["srcIp"] = WiFi.localIP().toString();
  doc["dstIp"] = WiFi.gatewayIP().toString();
  doc["protocol"] = "TCP";
  doc["srcPort"] = random(1024, 65535);
  doc["dstPort"] = 5000;
  doc["packetCount"] = random(10, 500);
  doc["byteCount"] = random(500, 50000);

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + deviceAuthToken);
  http.setConnectTimeout(3000);
  http.setTimeout(5000);

  int httpCode = http.POST(jsonPayload);

  if (httpCode == 200) {
    Serial.println("[NETLOG] ✅ Network log sent");
  } else {
    Serial.println("[NETLOG] ❌ Failed: HTTP " + String(httpCode));
  }

  http.end();
}

/**
 * Initialize device authentication (direct connection to server)
 * Called once on boot
 */
void initializeDeviceAuth() {
  Serial.println("\n===== Device Direct Authentication =====");
  Serial.println("[DEVICE] Device ID: " + String(DEVICE_ID));
  Serial.println("[DEVICE] Connection Type: DIRECT (no mesh parent needed)");
  Serial.println("[DEVICE] Waiting for WiFi...");

  // Wait for WiFi
  while (wifiMulti.run() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("\n[DEVICE] ✅ WiFi connected!");
  Serial.println("[DEVICE] IP Address: " + WiFi.localIP().toString());
  
  // Attempt authentication immediately
  if (authenticateWithServer()) {
    Serial.println("[DEVICE] ✅ Initial authentication successful!");
  } else {
    Serial.println("[DEVICE] ⚠️  Initial auth failed. Will retry in loop.");
  }
  
  Serial.println("======================================\n");
}

/**
 * Check if device is authenticated
 */
bool isAuthenticated() {
  return deviceAuthToken.length() > 0;
}

/**
 * Called from main loop() periodically
 * Re-authenticate if token has expired or auth failed recently
 * Direct connection (no mesh routing)
 */
void checkDeviceAuth() {
  static unsigned long lastCheck = 0;
  const unsigned long CHECK_INTERVAL = 5000; // Check every 5 seconds
  const unsigned long AUTH_RETRY_INTERVAL = 3600000; // Re-auth every 1 hour

  if (millis() - lastCheck < CHECK_INTERVAL) {
    return; // Not time to check yet
  }
  lastCheck = millis();

  if (wifiMulti.run() != WL_CONNECTED) {
    if (millis() % 60000 == 0) { // Log every minute
      Serial.println("[AUTH] ⚠️  WiFi disconnected. Waiting for reconnection...");
    }
    return;
  }

  // Re-authenticate if token expired or never obtained
  if (!isAuthenticated() || (millis() - lastAuthTime > AUTH_RETRY_INTERVAL)) {
    Serial.println("[AUTH] 🔄 Re-authenticating device...");
    if (!authenticateWithServer()) {
      Serial.println("[AUTH] ⚠️  Re-authentication failed. Will retry later.");
    }
  }
}

/**
 * Get current auth token (use in subsequent API calls)
 */
String getAuthToken() {
  return deviceAuthToken;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Initialize LED
  strip.begin();
  strip.show(); // Initialize all pixels to 'off'
  strip.setBrightness(50);
  
  Serial.println("\n\n===== Raidware IoT Device Boot =====");
  Serial.println("Device Type: Direct Connection (No Mesh)");
  Serial.println("Firmware Version: 1.0.0");
  Serial.println("Build: " __DATE__ " " __TIME__);
  
  // Connect to WiFi using WiFiMulti
  Serial.println("\n[SETUP] Initializing WiFi...");
  WiFi.mode(WIFI_STA);
  wifiMulti.addAP(WIFI_SSID, WIFI_PASSWORD);
  
  // Initialize device authentication (direct to server)
  delay(2000);
  initializeDeviceAuth();
  
  Serial.println("\n[SETUP] Device ready. Running main loop...\n");
}

void loop() {
  // Handle LED based on connection and auth status
  static unsigned long lastLedToggle = 0;
  static bool ledState = false;
  
  if (wifiMulti.run() == WL_CONNECTED) {
    if (isAuthenticated()) {
      // Authenticated: solid green with slow pulse
      if (millis() - lastLedToggle > 1000) {
        lastLedToggle = millis();
        ledState = !ledState;
        if (ledState) {
          strip.setPixelColor(0, strip.Color(0, 255, 0)); // Green
        } else {
          strip.setPixelColor(0, strip.Color(0, 80, 0));  // Dim green
        }
        strip.show();
      }
    } else {
      // Connected but not authenticated: yellow blink
      if (millis() - lastLedToggle > 300) {
        lastLedToggle = millis();
        ledState = !ledState;
        if (ledState) {
          strip.setPixelColor(0, strip.Color(255, 165, 0)); // Orange
        } else {
          strip.setPixelColor(0, strip.Color(0, 0, 0));     // Off
        }
        strip.show();
      }
    }
  } else {
    // Not connected: solid red
    strip.setPixelColor(0, strip.Color(255, 0, 0));
    strip.show();
  }

  // Periodically check and reauthenticate if needed
  checkDeviceAuth();
  
  // Send heartbeat and network logs when authenticated
  if (isAuthenticated()) {
    sendHeartbeat();
    sendNetworkLog();
  }
  
  // Small delay to prevent watchdog reset
  delay(50);
}
