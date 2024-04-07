import { bytesToHex } from '../utils.js'
import { ByteReader } from './byteReader.js'

export function decode (buffer: ArrayBuffer): Array<{ type: string, data: Uint8Array, crc: number }> {
  const reader = new ByteReader(new Uint8Array(buffer))
  const chunks: Array<{ type: string, data: Uint8Array, crc: number }> = []
  const signature = bytesToHex(reader.Uint8Array(8)).toUpperCase() // reader.string(8)

  if (signature !== '89504E470D0A1A0A') {
    throw new Error('Invalid PNG signature')
  }

  while (reader.remaining > 0) {
    const length = reader.uint32(reader.bigEndian)
    const type = reader.string(4)
    const data = reader.Uint8Array(length)
    const crc = reader.uint32(reader.bigEndian)
    chunks.push({ type, data, crc })
    if (type === 'IEND') break
  }

  return chunks
}