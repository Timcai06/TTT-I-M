/** Fetch bodies are decoded by the browser before a reader sees them. */
export async function readArchiveModel(
  response: Response,
  decodedBytes: number,
  onProgress: (received: number, expected: number) => void,
): Promise<ArrayBuffer> {
  if (!response.body) throw new Error('Archive model response has no readable body')
  if (!Number.isSafeInteger(decodedBytes) || decodedBytes <= 0) throw new Error('Invalid archive model byte count')

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  onProgress(0, decodedBytes)
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value?.byteLength) continue
      chunks.push(value)
      received += value.byteLength
      onProgress(received, decodedBytes)
    }
  } finally {
    reader.releaseLock()
  }

  const joined = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength }
  return joined.buffer
}
