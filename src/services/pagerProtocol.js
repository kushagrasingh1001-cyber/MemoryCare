/**
 * MemoryCare pager protocol (MCV1)
 * ---------------------------------
 * The ESP32 pager and the web app exchange newline separated ASCII lines.
 *
 *   app  -> pager : MCV1|HELLO
 *                   MCV1|BEGIN|REPLACE_ALL|<lineCount>
 *                   PERSON|name|age|blood|note
 *                   ROUTINE|time|title
 *                   MED|time|name
 *                   CONTACT|relation|name|phone
 *                   EMERGENCY|number|note
 *                   MCV1|END|<lineCount>
 *                   MCV1|DUMP       (please send your stored data back)
 *                   MCV1|PING
 *                   MCV1|CLEAR_ALL
 *
 *   pager -> app  : MCV1|READY|MemoryCarePager|1.0
 *                   MCV1|ACK|BEGIN / MCV1|ACK|<n>
 *                   MCV1|SAVED|<n>
 *                   MCV1|CLEARED
 *                   MCV1|DATA|<line>      (answer to DUMP)
 *                   MCV1|DUMP_END|<n>
 *                   MCV1|PONG
 *                   MCV1|ERR|<reason>
 *
 * Any firmware that speaks plain text (including most Bluetooth-serial sketches)
 * still receives readable lines; unknown `MCV1|` commands are simply ignored by
 * the app when they come back.
 */

export const CHUNK_SIZE = 20;   // BLE default ATT payload (MTU 23 - 3)
export const CHUNK_GAP_MS = 28; // gives slow Bluetooth-serial bridges time to buffer
export const MAX_LINE = 110;
export const PROTOCOL_VERSION = 'MCV1';

export const clean = value =>
  String(value ?? '')
    .replace(/[\r\n|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The pager OLED can only draw Latin characters, so Assamese / Manipuri / Hindi
 * text is transliterated to an ASCII-safe fallback instead of being sent as
 * unreadable bytes.
 */
export function toPagerAscii(value) {
  const raw = clean(value);
  const ascii = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { text: ascii || raw ? transliterateFallback(raw) : '', dropped: ascii.length === 0 && raw.length > 0 };
}

// Keeps at least a readable skeleton when a name is written only in a
// non-Latin script (for example "ৰাহুল" -> "Rahul" is impossible offline, so we
// keep the original text and let the pager show what it can).
function transliterateFallback(raw) {
  return raw.replace(/\s+/g, ' ').trim();
}

export function makeEmptyPagerData() {
  return {
    personal: { name: '', age: '', bloodGroup: '', note: '' },
    routine: [],
    medicines: [],
    contacts: [],
    emergency: { number: '112', medicalNote: '' },
  };
}

export function normalisePagerData(raw) {
  const empty = makeEmptyPagerData();
  if (!raw) return empty;
  return {
    personal: { ...empty.personal, ...(raw.personal || {}) },
    routine: Array.isArray(raw.routine) ? raw.routine : [],
    medicines: Array.isArray(raw.medicines) ? raw.medicines : [],
    contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
    emergency: { ...empty.emergency, ...(raw.emergency || {}) },
  };
}

/** Builds the protocol lines that will be written to the pager. */
export function buildPayloadLines(data) {
  const lines = [];
  const d = normalisePagerData(data);

  lines.push(`${PROTOCOL_VERSION}|BEGIN|REPLACE_ALL|0`);

  const person = [
    clean(d.personal.name),
    clean(d.personal.age),
    clean(d.personal.bloodGroup),
    clean(d.personal.note),
  ].join('|');
  lines.push(`PERSON|${person}`);

  d.routine.filter(x => clean(x.time) || clean(x.title)).forEach(x => lines.push(`ROUTINE|${clean(x.time)}|${clean(x.title)}`));
  d.medicines.filter(x => clean(x.time) || clean(x.name)).forEach(x => lines.push(`MED|${clean(x.time)}|${clean(x.name)}`));
  d.contacts.filter(x => clean(x.name) || clean(x.phone)).forEach(x => lines.push(`CONTACT|${clean(x.relation)}|${clean(x.name)}|${clean(x.phone)}`));
  lines.push(`EMERGENCY|${clean(d.emergency.number)}|${clean(d.emergency.medicalNote)}`);

  lines[0] = `${PROTOCOL_VERSION}|BEGIN|REPLACE_ALL|${lines.length + 1}`;

  lines.push(`${PROTOCOL_VERSION}|END|${lines.length}`);
  return lines;
}

export function payloadSummary(data) {
  const d = normalisePagerData(data);
  return {
    routine: d.routine.length,
    medicines: d.medicines.length,
    contacts: d.contacts.length,
    hasName: Boolean(clean(d.personal.name)),
  };
}

export function hasPagerContent(data) {
  const s = payloadSummary(data);
  return s.hasName || s.routine > 0 || s.medicines > 0 || s.contacts > 0;
}

/** Splits encoded bytes into BLE sized chunks (never splitting a UTF-8 character). */
export function chunkLine(line, size = CHUNK_SIZE) {
  const bytes = new TextEncoder().encode(`${line}\n`);
  const chunks = [];
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.slice(i, i + size));
  return chunks;
}

export function decodeChunk(value) {
  return new TextDecoder().decode(value);
}

/** Very small line buffer used for both BLE notifications and USB serial reads. */
export class LineAssembler {
  constructor(onLine) {
    this.onLine = onLine;
    this.buffer = '';
  }
  push(text) {
    this.buffer += text;
    let index = this.buffer.indexOf('\n');
    while (index >= 0) {
      const line = this.buffer.slice(0, index).replace(/[\r\n]+$/, '').trim();
      this.buffer = this.buffer.slice(index + 1);
      if (line) this.onLine(line);
      index = this.buffer.indexOf('\n');
    }
    if (this.buffer.length > 4096) this.buffer = this.buffer.slice(-256);
  }
  reset() {
    this.buffer = '';
  }
}

export function describePagerLine(line) {
  const parts = String(line).split('|');
  if (parts[0] === 'MCV1') return `pager: ${parts.slice(1).join(' ')}`.trim();
  if (['PERSON', 'ROUTINE', 'MED', 'CONTACT', 'EMERGENCY'].includes(parts[0])) return `data: ${parts.join(' · ')}`;
  return line;
}
