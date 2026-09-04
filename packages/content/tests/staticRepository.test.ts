import assert from 'node:assert/strict'
import test from 'node:test'

import { createKeyedStaticRepository, createStaticRepository } from '../src/index.ts'

void test('static repositories reject ambiguous slugs and expose an immutable collection snapshot', async () => {
  assert.throws(
    () => createStaticRepository([{ slug: 'same' }, { slug: 'same' }]),
    /Duplicate static repository slug/,
  )
  assert.throws(
    () => createStaticRepository([{ slug: ' not-normalized ' }]),
    /non-empty and normalized/,
  )

  const source = [{ slug: 'alpha', value: 1 }]
  const repository = createStaticRepository(source)
  source.push({ slug: 'later', value: 2 })

  assert.deepEqual(repository.all(), [{ slug: 'alpha', value: 1 }])
  assert.equal(repository.get('later'), undefined)
  assert.equal(await repository.list(), repository.all())
  assert.equal(Object.isFrozen(repository.all()), true)
})

void test('keyed repositories reject duplicate ids and detach from their source array', async () => {
  assert.throws(
    () => createKeyedStaticRepository([{ id: 'same' }, { id: 'same' }], (item) => item.id),
    /Duplicate static repository id/,
  )

  const source = [{ id: 'alpha', value: 1 }]
  const repository = createKeyedStaticRepository(source, (item) => item.id)
  source.push({ id: 'later', value: 2 })

  assert.deepEqual(repository.all(), [{ id: 'alpha', value: 1 }])
  assert.equal(await repository.get('later'), undefined)
  assert.equal(Object.isFrozen(await repository.list()), true)
})
