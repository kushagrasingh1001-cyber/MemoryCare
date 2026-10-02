/*
 * MemoryCare Pager — ESP32 firmware (BLE + USB serial)
 * ----------------------------------------------------
 * Pairs with the MemoryCare caregiver web app (Pager Management screen).
 *
 *   Service  0000fff0-0000-1000-8000-00805f9b34fb
 *   RX       0000fff1-0000-1000-8000-00805f9b34fb   phone -> pager (write)
 *   TX       0000fff2-0000-1000-8000-00805f9b34fb   pager -> phone (notify + read)
 *
 * The same protocol also runs over USB Serial at 115200 baud, which the web app
 * can use with "Connect with USB cable" if Bluetooth is unavailable.
 *
 * Everything is stored in the ESP32 NVS flash, so the pager keeps the patient's
 * routine, medicines, contacts and emergency information after a power cut and
 * completely offline.
 *
 * Board: "ESP32 Dev Module" (or any classic ESP32 / ESP32-WROOM board).
 * No extra libraries are required for BLE + buttons.
 * An SSD1306 OLED is optional — set USE_OLED to 1 and install
 * "Adafruit SSD1306" + "Adafruit GFX Library" if you have one.
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
#define DEVICE_NAME "MemoryCare-Pager"
#define FW_VERSION  "1.0.0"

#define SERVICE_UUID "0000fff0-0000-1000-8000-00805f9b34fb"
#define RX_UUID      "0000fff1-0000-1000-8000-00805f9b34fb"
#define TX_UUID      "0000fff2-0000-1000-8000-00805f9b34fb"

#define USE_OLED 0            // set to 1 if you wired an SSD1306 display
#define MAX_PAYLOAD 4096      // bytes of offline storage kept in NVS

static const int PIN_BTN_UP     = 32;
static const int PIN_BTN_DOWN   = 33;
static const int PIN_BTN_SELECT = 25;
static const int PIN_LED        = 2;

#if USE_OLED
  #include <Wire.h>
  #include <Adafruit_GFX.h>
  #include <Adafruit_SSD1306.h>
  #define OLED_W 128
  #define OLED_H 64
  Adafruit_SSD1306 display(OLED_W, OLED_H, &Wire, -1);
#endif

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
Preferences prefs;
BLEServer* bleServer = nullptr;
BLECharacteristic* txCharacteristic = nullptr;

bool deviceConnected = false;
bool wasConnected = false;
String rxBuffer;      // characters received since the last '\n'
String staging;       // payload being received (REPLACE_ALL)
String stored;        // committed payload
bool receiving = false;

String menu[] = {"About Me", "My Routine", "Medicines", "Contacts", "Emergency"};
const int MENU_COUNT = 5;
int menuIndex = 0;
int scrollLine = 0;
String screenLines[8];
int screenLineCount = 0;

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------
void loadFromFlash() {
  prefs.begin("memorycare", true);
  stored = prefs.getString("payload", "");
  prefs.end();
  Serial.printf("[MC] loaded %u bytes from flash\n", (unsigned)stored.length());
}

void saveToFlash() {
  prefs.begin("memorycare", false);
  if (stored.length() == 0) prefs.remove("payload");
  else {
    String trimmed = stored;
    if (trimmed.length() > MAX_PAYLOAD) trimmed = trimmed.substring(trimmed.length() - MAX_PAYLOAD);
    prefs.putString("payload", trimmed);
  }
  prefs.end();
}

// ---------------------------------------------------------------------------
// Output helpers (BLE notify + USB serial)
// ---------------------------------------------------------------------------
void sendLine(const String& line) {
  Serial.println(line);                       // USB / serial monitor
  if (deviceConnected && txCharacteristic) {
    txCharacteristic->setValue(String(line)); // notify the phone
    txCharacteristic->notify();
    delay(12);                                // keep the BLE buffer happy
  }
}

void sendChunked(const String& line, size_t chunk = 20) {
  Serial.println(line);
  if (!deviceConnected || !txCharacteristic) return;
  for (size_t i = 0; i < line.length(); i += chunk) {
    String part = line.substring(i, i + chunk);
    txCharacteristic->setValue((uint8_t*)part.c_str(), part.length());
    txCharacteristic->notify();
    delay(18);
  }
}

// ---------------------------------------------------------------------------
// Screen / serial menu
// ---------------------------------------------------------------------------
String sectionFor(int index) {
  String out = "";
  if (stored.length() == 0) return "(empty)";
  int start = 0;
  while (start < (int)stored.length()) {
    int end = stored.indexOf('\n', start);
    if (end < 0) end = stored.length();
    String line = stored.substring(start, end);
    line.trim();
    start = end + 1;
    if (line.length() == 0) continue;
    if (index == 0 && line.startsWith("PERSON|")) out += line.substring(7) + "\n";
    if (index == 1 && line.startsWith("ROUTINE|")) out += line.substring(8) + "\n";
    if (index == 2 && line.startsWith("MED|")) out += line.substring(4) + "\n";
    if (index == 3 && line.startsWith("CONTACT|")) out += line.substring(8) + "\n";
    if (index == 4 && line.startsWith("EMERGENCY|")) out += line.substring(10) + "\n";
  }
  out.replace("|", " ");
  if (out.length() == 0) out = "(empty)";
  return out;
}

void buildScreen() {
  screenLineCount = 0;
  screenLines[screenLineCount++] = String("> ") + menu[menuIndex];
  String body = sectionFor(menuIndex);
  int pos = 0;
  while (pos < (int)body.length() && screenLineCount < 8) {
    int nl = body.indexOf('\n', pos);
    if (nl < 0) nl = body.length();
    String row = body.substring(pos, nl);
    row.trim();
    pos = nl + 1;
    if (row.length() == 0) continue;
    screenLines[screenLineCount++] = row.substring(0, 20);
  }
}

void refreshScreen() {
  buildScreen();
#if USE_OLED
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  for (int i = 0; i < screenLineCount; i++) display.println(screenLines[i]);
  display.display();
#endif
  if (!deviceConnected) {
    Serial.println("---- MemoryCare Pager ----");
    for (int i = 0; i < screenLineCount; i++) Serial.println(screenLines[i]);
    Serial.println("--------------------------");
  }
}

void moveMenu(int delta) {
  menuIndex = (menuIndex + delta + MENU_COUNT) % MENU_COUNT;
  scrollLine = 0;
  refreshScreen();
}

// ---------------------------------------------------------------------------
// Protocol handling
// ---------------------------------------------------------------------------
void handleDataLine(const String& line) {
  if (!receiving) return;                    // data outside a BEGIN/END block is ignored
  if (staging.length() < MAX_PAYLOAD) {
    staging += line;
    staging += '\n';
  }
}

int countLines(const String& blob) {
  int n = 0;
  for (int i = 0; i < (int)blob.length(); i++) if (blob[i] == '\n') n++;
  return n;
}

void handleCommand(const String& line) {
  // MCV1|<command>|...
  int first = line.indexOf('|');
  int second = line.indexOf('|', first + 1);
  String command = second < 0 ? line.substring(first + 1) : line.substring(first + 1, second);

  if (command == "HELLO" || command == "PING") {
    sendLine(String("MCV1|READY|MemoryCarePager|") + FW_VERSION);
    return;
  }
  if (command == "BEGIN") {
    receiving = true;
    staging = "";
    sendLine("MCV1|ACK|BEGIN");
    return;
  }
  if (command == "END") {
    receiving = false;
    stored = staging;
    staging = "";
    saveToFlash();
    sendLine(String("MCV1|SAVED|") + String(countLines(stored)));
    refreshScreen();
    return;
  }
  if (command == "CLEAR_ALL") {
    receiving = false;
    staging = "";
    stored = "";
    saveToFlash();
    sendLine("MCV1|CLEARED");
    refreshScreen();
    return;
  }
  if (command == "DUMP") {
    int n = 0;
    int start = 0;
    while (start < (int)stored.length()) {
      int end = stored.indexOf('\n', start);
      if (end < 0) end = stored.length();
      String row = stored.substring(start, end);
      row.trim();
      start = end + 1;
      if (row.length() == 0) continue;
      sendChunked(String("MCV1|DATA|") + row);
      n++;
    }
    sendLine(String("MCV1|DUMP_END|") + String(n));
    return;
  }
  sendLine("MCV1|ERR|UNKNOWN_COMMAND");
}

void handleIncomingChar(char c) {
  if (c == '\r') return;
  if (c == '\n') {
    rxBuffer.trim();
    if (rxBuffer.length() > 0) {
      if (rxBuffer.startsWith("MCV1|")) handleCommand(rxBuffer);
      else if (rxBuffer.startsWith("PERSON|") || rxBuffer.startsWith("ROUTINE|") ||
               rxBuffer.startsWith("MED|") || rxBuffer.startsWith("CONTACT|") ||
               rxBuffer.startsWith("EMERGENCY|")) handleDataLine(rxBuffer);
    }
    rxBuffer = "";
    return;
  }
  if (rxBuffer.length() < 200) rxBuffer += c;
}

// ---------------------------------------------------------------------------
// BLE plumbing
// ---------------------------------------------------------------------------
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s) override {
    deviceConnected = true;
    digitalWrite(PIN_LED, HIGH);
    Serial.println("[MC] phone connected");
  }
  void onDisconnect(BLEServer* s) override {
    deviceConnected = false;
    digitalWrite(PIN_LED, LOW);
    Serial.println("[MC] phone disconnected");
    delay(300);
    BLEDevice::startAdvertising();   // always stay discoverable
  }
};

class RxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* characteristic) override {
    String value = String(characteristic->getValue().c_str());
    for (size_t i = 0; i < value.length(); i++) handleIncomingChar(value[i]);
  }
};

void setupBle() {
  BLEDevice::init(DEVICE_NAME);
  BLEDevice::setMTU(185);
  bleServer = BLEDevice::createServer();
  bleServer->setCallbacks(new ServerCallbacks());

  BLEService* service = bleServer->createService(SERVICE_UUID);

  BLECharacteristic* rx = service->createCharacteristic(
      RX_UUID, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  rx->setCallbacks(new RxCallbacks());

  txCharacteristic = service->createCharacteristic(
      TX_UUID, BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
  txCharacteristic->addDescriptor(new BLE2902());
  txCharacteristic->setValue("MCV1|READY|MemoryCarePager|" FW_VERSION);

  service->start();

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  BLEDevice::startAdvertising();
  Serial.println("[MC] Bluetooth ready — advertising as " DEVICE_NAME);
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
int lastUp = HIGH, lastDown = HIGH, lastSelect = HIGH;
unsigned long lastPress = 0;

void readButtons() {
  int up = digitalRead(PIN_BTN_UP);
  int down = digitalRead(PIN_BTN_DOWN);
  int select = digitalRead(PIN_BTN_SELECT);
  unsigned long now = millis();
  if (now - lastPress < 220) { lastUp = up; lastDown = down; lastSelect = select; return; }

  if (up == LOW && lastUp == HIGH) { moveMenu(-1); lastPress = now; }
  else if (down == LOW && lastDown == HIGH) { moveMenu(1); lastPress = now; }
  else if (select == LOW && lastSelect == HIGH) {
    lastPress = now;
    sendLine(String("MCV1|READY|MemoryCarePager|") + FW_VERSION);
    refreshScreen();
  }
  lastUp = up; lastDown = down; lastSelect = select;
}

// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BTN_UP, INPUT_PULLUP);
  pinMode(PIN_BTN_DOWN, INPUT_PULLUP);
  pinMode(PIN_BTN_SELECT, INPUT_PULLUP);
  digitalWrite(PIN_LED, LOW);

#if USE_OLED
  Wire.begin();
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.display();
#endif

  loadFromFlash();
  setupBle();
  refreshScreen();
}

void loop() {
  // USB serial input (same protocol as Bluetooth)
  while (Serial.available() > 0) handleIncomingChar((char)Serial.read());
  readButtons();

  if (wasConnected && !deviceConnected) Serial.println("[MC] waiting for the app to reconnect…");
  wasConnected = deviceConnected;

  delay(5);
}
