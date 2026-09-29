import { MeshoptDecoder } from 'meshoptimizer'

await MeshoptDecoder.ready

type Accessor = { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string; normalized?: boolean }
type View = { buffer?: number; byteOffset?: number; byteStride?: number; extensions?: { EXT_meshopt_compression?: { byteOffset: number; byteLength: number; byteStride: number; count: number; mode: 'ATTRIBUTES' | 'TRIANGLES' | 'INDICES'; filter?: 'NONE' | 'OCTAHEDRAL' | 'QUATERNION' | 'EXPONENTIAL' } } }

// Decode production accessors through the same Meshopt extension as GLTFLoader.
// The fallback buffer in a compressed GLB does not contain usable geometry.
export function glbAccessor(bytes: Buffer, doc: { accessors: Accessor[]; bufferViews: View[] }, index: number): number[] {
  const accessor = doc.accessors[index]
  const view = doc.bufferViews[accessor.bufferView]
  const jsonLength = bytes.readUInt32LE(12)
  const binaryOffset = 28 + jsonLength
  const ext = view.extensions?.EXT_meshopt_compression
  const storage = ext
    ? new Uint8Array(ext.count * ext.byteStride)
    : bytes.subarray(binaryOffset + (view.byteOffset ?? 0))
  if (ext) MeshoptDecoder.decodeGltfBuffer(storage, ext.count, ext.byteStride, bytes.subarray(binaryOffset + ext.byteOffset, binaryOffset + ext.byteOffset + ext.byteLength), ext.mode, ext.filter ?? 'NONE')
  const data = new DataView(storage.buffer, storage.byteOffset, storage.byteLength)
  const width = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 } as Record<string, number>)[accessor.type]
  const size = ({ 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 } as Record<number, number>)[accessor.componentType]
  const stride = view.byteStride ?? ext?.byteStride ?? width * size
  const values: number[] = []
  for (let item = 0; item < accessor.count; item++) for (let component = 0; component < width; component++) {
    const offset = (accessor.byteOffset ?? 0) + item * stride + component * size
    let value = accessor.componentType === 5120 ? data.getInt8(offset)
      : accessor.componentType === 5121 ? data.getUint8(offset)
      : accessor.componentType === 5122 ? data.getInt16(offset, true)
      : accessor.componentType === 5123 ? data.getUint16(offset, true)
      : accessor.componentType === 5125 ? data.getUint32(offset, true)
      : data.getFloat32(offset, true)
    if (accessor.normalized) {
      const divisor = ({ 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 } as Record<number, number>)[accessor.componentType]
      value = Math.max(-1, value / divisor)
    }
    values.push(value)
  }
  return values
}
