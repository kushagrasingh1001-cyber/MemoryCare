import {CHUNK_GAP_MS, CHUNK_SIZE, LineAssembler, chunkLine, decodeChunk} from './pagerProtocol';

/**
 * Talks to the ESP32 pager over Bluetooth LE or, as a fallback, over a USB cable.
 *
 * The previous implementation only worked with one exact service/characteristic
 * pair and used a single hard-coded write mode, so a different (or slightly
 * older) ESP32 sketch connected but never received anything. This transport:
 *   - accepts any device (or only MemoryCare named devices) when scanning,
 *   - discovers the writable / notify / readable characteristics itself,
 *   - falls back between write-with-response and write-without-response,
 *   - writes in 20 byte chunks with a small gap, which every BLE serial bridge
 *     understands,
 *   - retries "GATT operation already in progress" errors,
 *   - and can also talk over Web Serial (USB) when Bluetooth is unavailable.
 */

export const MEMORYCARE_SERVICE = '0000fff0-0000-1000-8000-00805f9b34fb';
export const MEMORYCARE_RX = '0000fff1-0000-1000-8000-00805f9b34fb';
export const MEMORYCARE_TX = '0000fff2-0000-1000-8000-00805f9b34fb';

const COMMON_SERVICES = [
  MEMORYCARE_SERVICE,
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / AT-09
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe5-0000-1000-8000-00805f9b34fb',
];

const PREFERRED_WRITE = [
  MEMORYCARE_RX,
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '0000ff01-0000-1000-8000-00805f9b34fb',
  '0000ffe9-0000-1000-8000-00805f9b34fb',
];

const PREFERRED_NOTIFY = [
  MEMORYCARE_TX,
  '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  '0000ffe2-0000-1000-8000-00805f9b34fb',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ffea-0000-1000-8000-00805f9b34fb',
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const bluetoothSupported = () => typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
export const serialSupported = () => typeof navigator !== 'undefined' && Boolean(navigator.serial);

export class PagerLink {
  constructor({ onLine, onLog, onDisconnect, onProgress } = {}) {
    this.onLine = onLine || (() => {});
    this.onLog = onLog || (() => {});
    this.onDisconnect = onDisconnect || (() => {});
    this.onProgress = onProgress || (() => {});
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.readCharacteristic = null;
    this.serialPort = null;
    this.serialWriter = null;
    this.serialReader = null;
    this.mode = null; // 'ble' | 'serial'
    this.writeMode = 'unknown';
    this.assembler = new LineAssembler(line => this.onLine(line));
    this.services = [];
    this.busy = false;
    this.lastError = '';
  }

  get connected() {
    if (this.mode === 'ble') return Boolean(this.server?.connected && this.writeCharacteristic);
    if (this.mode === 'serial') return Boolean(this.serialWriter);
    return false;
  }

  get statusLabel() {
    if (this.mode === 'ble') return this.device?.name ? `BLE · ${this.device.name}` : 'BLE';
    if (this.mode === 'serial') return 'USB serial';
    return 'disconnected';
  }

  log(kind, text) {
    this.onLog({ kind, text, at: Date.now() });
  }

  onNotify = event => {
    const text = decodeChunk(event.target.value);
    this.onLog({ kind: 'in', text: text.trim() || '(binary data)', at: Date.now() });
    this.assembler.push(text);
  };

  handleDisconnected = () => {
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.readCharacteristic = null;
    this.server = null;
    this.log('warn', 'Bluetooth connection was lost.');
    this.onDisconnect?.();
  };

  async requestDevice({ showAll = true } = {}) {
    if (!bluetoothSupported()) throw new Error('BT_UNSUPPORTED');
    const options = showAll
      ? { acceptAllDevices: true, optionalServices: COMMON_SERVICES }
      : {
          filters: [{ namePrefix: 'MemoryCare' }, { services: [MEMORYCARE_SERVICE] }],
          optionalServices: COMMON_SERVICES,
        };
    return navigator.bluetooth.requestDevice(options);
  }

  async connectBle(options = {}) {
    const device = options.device || (await this.requestDevice(options));
    this.log('info', `Requesting ${device.name || 'unnamed device'} …`);
    const server = await device.gatt.connect();
    this.device = device;
    this.server = server;
    this.mode = 'ble';
    device.removeEventListener?.('gattserverdisconnected', this.handleDisconnected);
    device.addEventListener('gattserverdisconnected', this.handleDisconnected);

    await this.discover(server);
    return { device, services: this.services };
  }

  async discover(server) {
    this.services = [];
    const services = await server.getPrimaryServices();
    let fallbackWrite = null;
    let fallbackNotify = null;
    let fallbackRead = null;

    for (const service of services) {
      let characteristics = [];
      try {
        characteristics = await service.getCharacteristics();
      } catch (error) {
        this.log('warn', `Could not inspect service ${service.uuid}: ${error.message}`);
        continue;
      }
      this.services.push({
        uuid: service.uuid,
        characteristics: characteristics.map(c => ({
          uuid: c.uuid,
          write: Boolean(c.properties?.write),
          writeWithoutResponse: Boolean(c.properties?.writeWithoutResponse),
          notify: Boolean(c.properties?.notify),
          read: Boolean(c.properties?.read),
        })),
      });

      for (const characteristic of characteristics) {
        const uuid = characteristic.uuid.toLowerCase();
        const props = characteristic.properties || {};
        const writable = props.write || props.writeWithoutResponse;
        if (writable) {
          if (PREFERRED_WRITE.includes(uuid)) this.writeCharacteristic = characteristic;
          else if (!fallbackWrite) fallbackWrite = characteristic;
        }
        if (props.notify || props.indicate) {
          if (PREFERRED_NOTIFY.includes(uuid)) this.notifyCharacteristic = characteristic;
          else if (!fallbackNotify) fallbackNotify = characteristic;
        }
        if (props.read && !fallbackRead) fallbackRead = characteristic;
      }
    }

    if (!this.writeCharacteristic) this.writeCharacteristic = fallbackWrite;
    if (!this.notifyCharacteristic) this.notifyCharacteristic = fallbackNotify;
    this.readCharacteristic = this.notifyCharacteristic && this.notifyCharacteristic.properties?.read
      ? this.notifyCharacteristic
      : fallbackRead;

    if (!this.writeCharacteristic) throw new Error('NO_WRITABLE_CHARACTERISTIC');

    const props = this.writeCharacteristic.properties || {};
    this.writeMode = props.write ? 'response' : 'without-response';
    if (props.write) this.writeMode = 'response';

    this.log('ok', `Writable characteristic: ${this.writeCharacteristic.uuid} (${this.writeMode})`);

    if (this.notifyCharacteristic) {
      try {
        await this.notifyCharacteristic.startNotifications();
        this.notifyCharacteristic.removeEventListener?.('characteristicvaluechanged', this.onNotify);
        this.notifyCharacteristic.addEventListener('characteristicvaluechanged', this.onNotify);
        this.log('ok', `Listening for pager replies on ${this.notifyCharacteristic.uuid}`);
      } catch (error) {
        this.log('warn', `Could not subscribe to notifications: ${error.message}`);
      }
    } else {
      this.log('warn', 'No notify characteristic found — replies from the pager cannot be shown.');
    }
  }

  async connectSerial() {
    if (!serialSupported()) throw new Error('SERIAL_UNSUPPORTED');
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    this.serialPort = port;
    this.mode = 'serial';
    this.serialWriter = port.writable.getWriter();
    this.writeMode = 'serial';
    this.log('ok', 'USB serial port open at 115200 baud.');
    this.readSerialLoop();
    return { port };
  }

  async readSerialLoop() {
    try {
      while (this.serialPort?.readable) {
        this.serialReader = this.serialPort.readable.getReader();
        try {
          while (true) {
            const { value, done } = await this.serialReader.read();
            if (done) break;
            const text = decodeChunk(value);
            this.onLog({ kind: 'in', text: text.trim() || '(data)', at: Date.now() });
            this.assembler.push(text);
          }
        } finally {
          this.serialReader.releaseLock();
          this.serialReader = null;
        }
      }
    } catch (error) {
      if (this.serialPort) this.log('warn', `USB read stopped: ${error.message}`);
    }
  }

  /** Writes one protocol line, chunked and with a gap between chunks. */
  async writeLine(line, { gapMs = CHUNK_GAP_MS } = {}) {
    if (!this.connected) throw new Error('NOT_CONNECTED');
    const chunks = chunkLine(line, CHUNK_SIZE);
    this.onLog({ kind: 'out', text: line, at: Date.now() });
    for (const chunk of chunks) {
      await this.writeChunk(chunk);
      await sleep(gapMs);
    }
  }

  async writeChunk(bytes) {
    if (this.mode === 'serial') {
      await this.serialWriter.write(bytes);
      return;
    }
    const characteristic = this.writeCharacteristic;
    const props = characteristic.properties || {};
    const order = [];
    if (this.writeMode === 'without-response') order.push('without-response', 'response');
    else order.push('response', 'without-response');

    for (const mode of order) {
      if (mode === 'response' && !props.write) continue;
      if (mode === 'without-response' && !props.writeWithoutResponse) continue;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          if (mode === 'response') await characteristic.writeValueWithResponse(bytes);
          else await characteristic.writeValueWithoutResponse(bytes);
          this.writeMode = mode;
          return;
        } catch (error) {
          const message = error?.message || String(error);
          this.lastError = message;
          if (/already in progress|busy/i.test(message)) {
            await sleep(120);
            continue;
          }
          if (/not supported|no longer|invalid state|disconnected|gatt server is disconnected/i.test(message)) {
            break; // try the other write mode, then give up
          }
          if (attempt === 2) throw error;
          await sleep(80);
        }
      }
    }
    throw new Error(this.lastError || 'Bluetooth write failed');
  }

  /** Sends the whole payload, reporting progress as it goes. */
  async sendLines(lines, { gapMs = CHUNK_GAP_MS } = {}) {
    const total = lines.length;
    for (let index = 0; index < total; index += 1) {
      await this.writeLine(lines[index], { gapMs });
      this.onProgress({ sent: index + 1, total });
    }
    return total;
  }

  async readFromDevice() {
    if (this.mode !== 'ble' || !this.readCharacteristic) return null;
    try {
      const value = await this.readCharacteristic.readValue();
      const text = decodeChunk(value);
      this.onLog({ kind: 'in', text: text.trim() || '(empty read)', at: Date.now() });
      return text;
    } catch (error) {
      this.log('warn', `Read failed: ${error.message}`);
      return null;
    }
  }

  async disconnect() {
    try {
      if (this.mode === 'ble' && this.device?.gatt?.connected) {
        this.notifyCharacteristic?.stopNotifications?.().catch(() => {});
        this.device.gatt.disconnect();
      }
      if (this.mode === 'serial') {
        try {
          this.serialReader?.cancel?.();
        } catch {}
        try {
          this.serialWriter?.releaseLock?.();
        } catch {}
        this.serialWriter = null;
        await this.serialPort?.close?.();
        this.serialPort = null;
      }
    } catch (error) {
      this.log('warn', `Disconnect issue: ${error.message}`);
    } finally {
      this.device = null;
      this.server = null;
      this.writeCharacteristic = null;
      this.notifyCharacteristic = null;
      this.readCharacteristic = null;
      this.mode = null;
    }
  }
}
