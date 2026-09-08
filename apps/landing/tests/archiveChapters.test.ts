import test from 'node:test'
import assert from 'node:assert/strict'
import { chapterPose, chapterTracks, type ArchiveTrack } from '../src/components/personal-archive/chapterTracks.ts'
import { projectLocation, readProjectLocation } from '../src/chapters/projects/projectLocation.ts'

void test('every spatial chapter can seek backward, jump to reading, and return to its exact pose', () => {
  for (const track of Object.keys(chapterTracks) as ArchiveTrack[]) {
    const middle = chapterPose(track, .65)
    assert.equal(chapterPose(track, 1).reading, true)
    assert.equal(chapterPose(track, 1).flatten, 1)
    assert.deepEqual(chapterPose(track, .65), middle)
    assert.equal(chapterPose(track, -2).reading, false)
    for (const p of [0, .12, .38, .65, .92, 1, Number.NaN]) {
      for (const value of Object.values(chapterPose(track, p))) if (typeof value === 'number') assert.ok(Number.isFinite(value) && value >= 0 && value <= 1)
    }
  }
})

void test('the archive drawer opens before the folder is lifted and retraction returns both independently', () => {
  assert.equal(chapterPose('stack-work', .38).folder, 0)
  assert.ok(chapterPose('stack-work', .38).drawer > .5)
  assert.equal(chapterPose('stack-work', .74).drawer, 1)
  assert.equal(chapterPose('stack-work', .74).folder, 1)
  assert.equal(chapterPose('work-contact', 0).folder, 1)
  assert.equal(chapterPose('work-contact', 1).folder, 0)
})

void test('case links preserve unrelated URL state and safely resolve invalid project identifiers', () => {
  const opened = projectLocation('https://example.test/?scene=archive#frame', 'test-project')
  assert.equal(opened, '/?scene=archive&project=test-project#projects')
  assert.equal(readProjectLocation(`https://example.test${opened}`, ['test-project']), 'test-project')
  assert.equal(projectLocation(`https://example.test${opened}`, null), '/?scene=archive#projects')
  assert.equal(readProjectLocation('https://example.test/?project=unknown', ['test-project']), null)
})
