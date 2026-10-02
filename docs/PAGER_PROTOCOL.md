# MemoryCare Pager protocol — MCV1

The pager and the web app exchange **newline-terminated ASCII lines** over
Bluetooth LE (or USB serial at 115200 baud). The web app is tolerant: it discovers
the writable characteristic itself and simply ignores replies it does not know.

## Bluetooth LE profile (default firmware)

| Role | UUID | Properties |
|---|---|---|
| Service | `0000fff0-0000-1000-8000-00805f9b34fb` | – |
| RX (phone → pager) | `0000fff1-0000-1000-8000-00805f9b34fb` | Write, Write Without Response |
| TX (pager → phone) | `0000fff2-0000-1000-8000-00805f9b34fb` | Notify, Read |
| Device name | `MemoryCare-Pager` | – |

The app chunks every line into **20-byte** writes with a ~28 ms gap, which is safe
for every BLE serial bridge and works with the default ATT MTU of 23. The Nordic
UART Service (`6e400001…`), HM-10 (`ffe0`) and other common BLE-serial UUIDs are
also auto-detected, so a custom sketch usually keeps working.

## Lines sent by the app

```
MCV1|HELLO                                   handshake
MCV1|PING                                    connection test
MCV1|BEGIN|REPLACE_ALL|<lineCount>           start of a full replacement
PERSON|<name>|<age>|<bloodGroup>|<note>
ROUTINE|<time>|<title>
MED|<time>|<medicine>
CONTACT|<relation>|<name>|<phone>
EMERGENCY|<number>|<note>
MCV1|END|<lineCount>                         commit to flash
MCV1|DUMP                                    ask for the stored copy
MCV1|CLEAR_ALL                               erase the stored copy
```

* `|` is the field separator; empty fields are allowed.
* A line is at most 110 characters; long lines are split into several BLE writes
  and reassembled by the pager until it sees `\n`.
* Data lines are only accepted between `BEGIN` and `END`, so a broken connection
  can never leave the pager with half-updated information.

## Lines sent by the pager

```
MCV1|READY|MemoryCarePager|1.0.0
MCV1|ACK|BEGIN
MCV1|SAVED|<lineCount>
MCV1|CLEARED
MCV1|PONG
MCV1|DATA|<stored line>        (repeated)
MCV1|DUMP_END|<lineCount>
MCV1|ERR|<reason>
```

The app waits up to 6 seconds for `MCV1|SAVED` and tells the caregiver whether the
pager confirmed the update or not.

## Compatibility with other sketches

If you flashed a different sketch (BLE UART example, HC-08 style module, …):

1. Tick **Show all Bluetooth devices** in the app and connect.
2. Open **Connection & diagnostics** — the app lists every service and
   characteristic it found and marks the writable one it selected.
3. Use **Test connection** to send `MCV1|PING` and see what comes back.
   Most plain-text sketches will simply print the line on their serial monitor,
   which is enough to prove that sending works.

If the diagnostics panel says *No writable Bluetooth characteristic was found*,
the device only exposes read/notify characteristics — reflash
`hardware/MemoryCarePager/MemoryCarePager.ino` or add a write characteristic to
your own sketch.

## Text and encoding

The pager stores UTF-8 bytes but the OLED font is Latin-only. Typing a name in
Assamese, Manipuri or Hindi is accepted and stored, but the pager screen can only
display the characters its font contains. Add an English spelling in
*Important note* when the display must be readable by anyone.
