import assert from 'node:assert/strict'
import test from 'node:test'
import type { ProjectShot } from '../src/content/index.ts'
import { toLightboxItems } from '../src/chapters/projects/lightbox.ts'

void test('project lightbox items preserve intrinsic dimensions and accessible descriptions', () => {
  const shots: ProjectShot[] = [
    {
      src: '/projects/example.webp',
      label: 'Evidence view',
      alt: 'A project evidence dashboard',
      width: 1600,
      height: 1000,
    },
  ]

  assert.deepEqual(toLightboxItems(shots), [
    {
      src: '/projects/example.webp',
      label: 'Evidence view',
      alt: 'A project evidence dashboard',
      width: 1600,
      height: 1000,
    },
  ])
})

