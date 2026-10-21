const EOCD_SIG = 0x06054b50;
const EOCD64_LOCATOR_SIG = 0x07064b50;
const EOCD64_SIG = 0x06064b50;
const CD_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;
const ZIP64_EXTRA_ID = 0x0001;

const utf8 = new TextDecoder('utf-8');

function findEndOfCentralDirectory(view) {
  const minOffset = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let i = view.byteLength - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) return i;
  }
  return -1;
}

function readZip64Records(view, eocdOffset) {
  const locatorOffset = eocdOffset - 20;
  if (locatorOffset < 0) return null;
  if (view.getUint32(locatorOffset, true) !== EOCD64_LOCATOR_SIG) return null;

  const recordOffset = Number(view.getBigUint64(locatorOffset + 8, true));
  if (recordOffset + 56 > view.byteLength) return null;
  if (view.getUint32(recordOffset, true) !== EOCD64_SIG) return null;

  return {
    entryCount: Number(view.getBigUint64(recordOffset + 32, true)),
    cdOffset: Number(view.getBigUint64(recordOffset + 48, true))
  };
}

function readZip64Extra(extraView, extraOffset, extraLength, entry) {
  let cursor = extraOffset;
  const end = extraOffset + extraLength;

  while (cursor + 4 <= end) {
    const id = extraView.getUint16(cursor, true);
    const size = extraView.getUint16(cursor + 2, true);
    if (id === ZIP64_EXTRA_ID) {
      let field = cursor + 4;
      if (entry.size === 0xffffffff && field + 8 <= end) {
        entry.size = Number(extraView.getBigUint64(field, true));
        field += 8;
      }
      if (entry.compressedSize === 0xffffffff && field + 8 <= end) {
        entry.compressedSize = Number(extraView.getBigUint64(field, true));
        field += 8;
      }
      if (entry.localOffset === 0xffffffff && field + 8 <= end) {
        entry.localOffset = Number(extraView.getBigUint64(field, true));
      }
      return;
    }
    cursor += 4 + size;
  }
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'This browser cannot unzip compressed archives. Update to a current browser or upload a ZIP stored without compression.'
    );
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const out = await new Response(stream).arrayBuffer();
  return new Uint8Array(out);
}

async function readEntryBytes(view, entry) {
  const headerOffset = entry.localOffset;
  if (headerOffset + 30 > view.byteLength) {
    throw new Error('Corrupt archive entry: ' + entry.path);
  }
  if (view.getUint32(headerOffset, true) !== LFH_SIG) {
    throw new Error('Corrupt archive entry: ' + entry.path);
  }

  const nameLength = view.getUint16(headerOffset + 26, true);
  const extraLength = view.getUint16(headerOffset + 28, true);
  const dataStart = headerOffset + 30 + nameLength + extraLength;
  const raw = new Uint8Array(
    view.buffer,
    view.byteOffset + dataStart,
    Math.min(entry.compressedSize, view.byteLength - dataStart)
  );

  if (entry.method === 0) return raw.slice();
  if (entry.method === 8) return inflateRaw(raw);
  throw new Error('Unsupported compression method (' + entry.method + ') for ' + entry.path);
}

function decodeName(bytes, isUtf8) {
  if (isUtf8) return utf8.decode(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  try {
    return decodeURIComponent(escape(out));
  } catch {
    return out;
  }
}

/**
 * Reads a ZIP archive without any third party dependency.
 * Only the central directory is parsed up front, so file contents are
 * decompressed lazily through `entry.readText()`.
 */
export async function readZipArchive(file) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  const eocdOffset = findEndOfCentralDirectory(view);
  if (eocdOffset < 0) {
    throw new Error('That file is not a readable ZIP archive.');
  }

  let entryCount = view.getUint16(eocdOffset + 10, true);
  let cdOffset = view.getUint32(eocdOffset + 16, true);

  if (entryCount === 0xffff || cdOffset === 0xffffffff) {
    const zip64 = readZip64Records(view, eocdOffset);
    if (zip64) {
      entryCount = zip64.entryCount;
      cdOffset = zip64.cdOffset;
    }
  }

  const entries = [];
  let pointer = cdOffset;

  for (let i = 0; i < entryCount && pointer + 46 <= view.byteLength; i++) {
    if (view.getUint32(pointer, true) !== CD_SIG) break;

    const flags = view.getUint16(pointer + 8, true);
    const method = view.getUint16(pointer + 10, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);

    const entry = {
      path: decodeName(new Uint8Array(buffer, pointer + 46, nameLength), (flags & 0x800) !== 0),
      method,
      flags,
      size: view.getUint32(pointer + 24, true),
      compressedSize: view.getUint32(pointer + 20, true),
      localOffset: view.getUint32(pointer + 42, true),
      externalAttributes: view.getUint32(pointer + 38, true),
      isDirectory: false
    };

    if (extraLength > 0) {
      readZip64Extra(view, pointer + 46 + nameLength, extraLength, entry);
    }

    entry.isDirectory = entry.path.endsWith('/') || (entry.size === 0 && (entry.externalAttributes & 0x10) !== 0);
    if (entry.path.endsWith('/')) entry.size = 0;

    entry.readBytes = async () => readEntryBytes(view, entry);
    entry.readText = async () => utf8.decode(await entry.readBytes());

    entries.push(entry);
    pointer += 46 + nameLength + extraLength + commentLength;
  }

  if (entries.length === 0) {
    throw new Error('That ZIP archive is empty.');
  }

  return { entries };
}
