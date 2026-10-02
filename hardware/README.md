# MemoryCare Pager — hardware notes (ESP32)

This folder contains the firmware that matches the app's **Pager Management** screen.
Flashing this sketch makes "Sync / Replace Pager Data" work out of the box, and it
also gives you the USB-serial fallback the web app can use when Bluetooth is not
available.

```
hardware/
  MemoryCarePager/MemoryCarePager.ino   ← the sketch
  README.md                             ← this file
```

Protocol details: [`../docs/PAGER_PROTOCOL.md`](../docs/PAGER_PROTOCOL.md)

---

## 1. What you need

| Part | Notes |
|---|---|
| ESP32 DevKit (ESP32-WROOM-32, 30 or 38 pin) | Any classic ESP32 works |
| 3 push buttons | UP, DOWN, SELECT |
| 1 LED + 220 Ω resistor | Optional status LED (GPIO 2 is on-board on most boards) |
| SSD1306 OLED 128×64 (I2C) | Optional, see `USE_OLED` |
| USB cable | Flashing + USB fallback sync |

No extra libraries are needed for the Bluetooth + buttons version.

## 2. Wiring

```
ESP32 GPIO 32  ── button UP ────── GND
ESP32 GPIO 33  ── button DOWN ──── GND
ESP32 GPIO 25  ── button SELECT ── GND
ESP32 GPIO 2   ── LED + 220Ω ───── GND        (optional)

Optional OLED (I2C, address 0x3C)
ESP32 GPIO 21  ── SDA
ESP32 GPIO 22  ── SCL
VIN/3V3        ── VCC
GND            ── GND
```

Buttons use the internal pull-ups (`INPUT_PULLUP`), so pressing connects the pin to GND.

## 3. Flashing

1. Install the Arduino IDE (or `arduino-cli`) and add the ESP32 board package
   (`Boards Manager → esp32 by Espressif`).
2. Open `hardware/MemoryCarePager/MemoryCarePager.ino`.
3. Select **Tools → Board → ESP32 Dev Module** and the correct COM/tty port.
4. Press **Upload**.
5. Open **Tools → Serial Monitor** at **115200 baud**.
   You should see:

   ```
   [MC] loaded 0 bytes from flash
   [MC] Bluetooth ready — advertising as MemoryCare-Pager
   ```

   If you want the OLED menu, set `#define USE_OLED 1` and install
   *Adafruit SSD1306* + *Adafruit GFX Library* first.

## 4. Sending data from the app

1. Open the caregiver dashboard → **Pager Management**.
2. Fill in About Me / Routine / Medicines / Contacts / Emergency.
3. Tap **Save Changes**.
4. Tap **Connect Pager** (Chrome or Edge on a laptop/Android) and pick
   **MemoryCare-Pager** in the Bluetooth list.
5. Tap **Sync / Replace Pager Data** and wait for *"Pager updated successfully"*.
6. Switch the pager off and on again — the information is still there (saved in flash).

If your pager does not appear in the list, tick **Show all Bluetooth devices**.

### USB fallback (no Bluetooth needed)

Plug the pager into a laptop running Chrome/Edge → **Connect with USB cable** →
**Sync / Replace Pager Data**. The sketch accepts the same protocol on serial 115200.

## 5. Using the pager

| Action | Button |
|---|---|
| Previous item | UP |
| Next item | DOWN |
| Show the selected item / re-send READY | SELECT |

Menu order: **About Me → My Routine → Medicines → Contacts → Emergency**.
Everything is read from the ESP32 flash, so the pager works with no phone and no internet.

## 6. Firmware commands it understands

| Line from app | What the pager does | Reply |
|---|---|---|
| `MCV1|HELLO` / `MCV1|PING` | handshake | `MCV1|READY|MemoryCarePager|1.0.0` |
| `MCV1|BEGIN|REPLACE_ALL|<n>` | starts a fresh payload | `MCV1|ACK|BEGIN` |
| `PERSON\|…`, `ROUTINE\|…`, `MED\|…`, `CONTACT\|…`, `EMERGENCY\|…` | buffered as the new payload | – |
| `MCV1|END|<n>` | saves the payload to flash | `MCV1|SAVED|<count>` |
| `MCV1|DUMP` | sends the stored payload back | `MCV1|DATA\|…` … `MCV1|DUMP_END\|<n>` |
| `MCV1|CLEAR_ALL` | erases the flash copy | `MCV1|CLEARED` |

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Device does not show in the Bluetooth list | Tick **Show all Bluetooth devices** in the app, and make sure the sketch printed `Bluetooth ready`. Restart the pager. |
| Connects but nothing is saved | Open **Connection & diagnostics** in the app. If it says *No writable Bluetooth characteristic was found*, you flashed a different sketch — flash this one. |
| "Browser cannot talk to Bluetooth devices" | Use Chrome/Edge on a laptop or Android. **iOS Safari does not support Web Bluetooth**; use USB there instead. |
| Some letters look wrong on the pager | The OLED only draws Latin characters. Names typed in Assamese/Manipuri/Hindi cannot be shown pixel-perfectly; add an English spelling in the "Important note" field. |
| Data lost after a power cut | Make sure you pressed **Sync** (SAVED confirmation) and not only *Save Changes* (which saves in the app only). |
| USB port busy | Close the Arduino Serial Monitor before using **Connect with USB cable**. |
