import oozFactory from './grounded-ooz.js';

const OOZ_SAFE_SPACE = 64;

let oozInst = null;
let oozInitPromise = null;
let lastDecompressionPtr_ = 0;

async function ensureOoz() {
  if (oozInst) return oozInst;
  if (!oozInitPromise) {
    oozInitPromise = oozFactory().then((inst) => {
      oozInst = inst;
      return inst;
    }).catch((err) => {
      oozInitPromise = null;
      throw err;
    });
  }
  return oozInitPromise;
}

/**
 * @param {Uint8Array} data
 * @param {number} rawSize
 * @returns {Promise<Uint8Array>}
 */
export async function decompressUnsafe(data, rawSize) {
  const inst = await ensureOoz();

  if (lastDecompressionPtr_) {
    inst._free(lastDecompressionPtr_);
    lastDecompressionPtr_ = 0;
  }

  const compressedPtr = inst._malloc(data.byteLength);
  inst.HEAPU8.set(data, compressedPtr);

  const decompressedPtr = inst._malloc(rawSize + OOZ_SAFE_SPACE);
  lastDecompressionPtr_ = decompressedPtr;

  const res = inst._Kraken_Decompress(
    compressedPtr, data.byteLength,
    decompressedPtr, rawSize
  );

  inst._free(compressedPtr);

  if (res < 0) {
    throw new Error('Failed to decode');
  }
  if (res !== rawSize) {
    throw new Error('Decompresed size is different from expected');
  }

  return inst.HEAPU8.subarray(decompressedPtr, decompressedPtr + rawSize);
}

/**
 * @param {Uint8Array} data
 * @param {number} rawSize
 * @returns {Promise<Uint8Array>}
 */
export async function decompress(data, rawSize) {
  const decompressed = await decompressUnsafe(data, rawSize);
  const decompressedCopy = new Uint8Array(decompressed.byteLength);
  decompressedCopy.set(decompressed);
  return decompressedCopy;
}
