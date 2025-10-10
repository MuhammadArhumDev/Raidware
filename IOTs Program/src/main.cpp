#include <WiFi.h>
#include <WiFiMulti.h>
#include <Adafruit_NeoPixel.h>

#define LED_PIN     48
#define NUM_PIXELS  1

const char* ssid1     = "botnet";
const char* password1 = "123456789";

// Create WiFiMulti object
WiFiMulti wifiMulti;

// NeoPixel setup
Adafruit_NeoPixel pixel(NUM_PIXELS, LED_PIN, NEO_GRB + NEO_KHZ800);

void setup() {
  Serial.begin(115200);
  
  // Initialize LED
  pixel.begin();
  pixel.setBrightness(10);
  pixel.show();

  // Add WiFi networks to WiFiMulti
  wifiMulti.addAP(ssid1, password1);

  Serial.println("Connecting to WiFi...");

  // --- Blocking WiFi connection ---
  while (wifiMulti.run() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Blink green LED every 1 second
  pixel.setPixelColor(0, pixel.Color(0, 255, 0)); // Green ON
  pixel.show();
  delay(500);

  pixel.clear(); // LED OFF
  pixel.show();
  delay(500);
}
