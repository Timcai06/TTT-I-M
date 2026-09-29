import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readArchiveModel } from '../src/lib/resources/readArchiveModel.ts'

void test('streams decoded GLB bytes without Content-Length and reports monotonic progress', async () => {
  const source = new Uint8Array([1, 2, 3, 4, 5, 6])
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(source.slice(0, 2))
      controller.enqueue(source.slice(2, 5))
      controller.enqueue(source.slice(5))
      controller.close()
    },
  })
  const response = new Response(body, { headers: { 'content-encoding': 'br' } })
  const progress: number[] = []
  const bytes = await readArchiveModel(response, source.byteLength, (received, expected) => {
    assert.equal(expected, source.byteLength)
    progress.push(received)
  })

  assert.deepEqual([...new Uint8Array(bytes)], [...source])
  assert.deepEqual(progress, [0, 2, 5, 6])
  assert.ok(progress.every((value, index) => index === 0 || value >= progress[index - 1]))
})

void test('rejects a response without a stream', async () => {
  await assert.rejects(readArchiveModel(new Response(null), 6, () => {}), /readable body/)
})
