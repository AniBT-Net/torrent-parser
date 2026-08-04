import bencode from 'bencode'

type Converted<T> = T extends Uint8Array
  ? string
  : T extends object
    ? { [K in keyof T]: Converted<T[K]> }
    : T

/** Binary fields that must stay as bytes (not UTF-8 text). */
const BINARY_KEYS = new Set(['pieces', 'pieces root'])

function convert_uint8_arrays<T>(obj: T): Converted<T> {
  if (obj instanceof Uint8Array) {
    return new TextDecoder('utf-8').decode(obj) as Converted<T>
  }

  if (Array.isArray(obj)) {
    return obj.map(convert_uint8_arrays) as Converted<T>
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
      // Keep piece hashes / roots binary; long keys are typically v2 piece layer digests
      if (BINARY_KEYS.has(key) || key.length >= 32) result[key] = (obj as Record<string, unknown>)[key]
      else result[key] = convert_uint8_arrays((obj as Record<string, unknown>)[key])
    }
    return result as Converted<T>
  }

  return obj as Converted<T>
}

function toUint8Array(data: ArrayBuffer | Uint8Array): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data)
}

/** Native SHA digest → lowercase hex (faster & smaller than crypto-js). */
async function digestHex(
  algorithm: 'SHA-1' | 'SHA-256',
  data: Uint8Array,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    algorithm,
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
  )
  const bytes = new Uint8Array(digest)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0')
  }
  return hex
}

export enum Torrent_format {
  v1 = 'BT v1',
  v2 = 'BT v2',
  hybrid = 'BT v2-Hybrid',
}

export class Torrent {
  filename: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any

  constructor(buffer: ArrayBuffer | Uint8Array, filename: string = '') {
    this.filename = filename
    this.data = convert_uint8_arrays(bencode.decode(toUint8Array(buffer)))
  }

  get_format(): Torrent_format {
    if (this.data.info['meta version'] === 2) {
      if (this.data.info?.files || this.data.info?.length) return Torrent_format.hybrid
      return Torrent_format.v2
    }
    return Torrent_format.v1
  }

  async get_hash_v1(): Promise<string> {
    if (this.get_format() === Torrent_format.v2) return ''
    const encodedInfo = bencode.encode(this.data.info)
    return digestHex('SHA-1', encodedInfo)
  }

  async get_hash_v2(): Promise<string> {
    if (this.get_format() === Torrent_format.v1) return ''
    const encodedInfo = bencode.encode(this.data.info)
    return digestHex('SHA-256', encodedInfo)
  }

  encode(): Uint8Array {
    return bencode.encode(this.data)
  }

  async generate_magnet(): Promise<string> {
    const parts: string[] = []

    switch (this.get_format()) {
      case Torrent_format.v1:
        parts.push('xt=urn:btih:' + (await this.get_hash_v1()))
        break
      case Torrent_format.v2:
        parts.push('xt=urn:btmh:1220' + (await this.get_hash_v2()))
        break
      case Torrent_format.hybrid:
        parts.push('xt=urn:btih:' + (await this.get_hash_v1()))
        parts.push('xt=urn:btmh:1220' + (await this.get_hash_v2()))
        break
    }

    return 'magnet:?' + parts.join('&')
  }
}
