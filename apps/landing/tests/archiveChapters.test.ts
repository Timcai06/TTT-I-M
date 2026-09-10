import test from 'node:test'
import assert from 'node:assert/strict'
import { chapterHandoffPose, chapterPose, chapterTracks, type ArchiveTrack } from '../src/components/personal-archive/chapterTracks.ts'
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

void test('every spatial handoff keeps a finite reversible screen-space contract', () => {
  for (const track of Object.keys(chapterTracks) as ArchiveTrack[]) {
    const forward = chapterHandoffPose(track, .58)
    const reverse = chapterHandoffPose(track, .58)
    assert.deepEqual(reverse, forward)
    for (const p of [0, .04, .16, .36, .58, .78, .9, .97, 1, Number.NaN]) {
      for (const value of Object.values(chapterHandoffPose(track, p))) {
        assert.ok(Number.isFinite(value), `${track} emitted a non-finite handoff value at ${p}`)
      }
    }
  }
})

void test('Contact owns a desk reading plane instead of reusing the Work archive', () => {
  assert.equal(chapterTracks['stack-work'].surface, 'WorkReading')
  assert.equal(chapterTracks['work-contact'].surface, 'ContactReading')
})

void test('reading begins only after travel and alignment have finished', () => {
  for (const track of Object.keys(chapterTracks) as ArchiveTrack[]) {
    assert.equal(chapterPose(track, .8).travel, 1)
    assert.equal(chapterPose(track, .8).approach, 1)
    assert.equal(chapterPose(track, .8).flatten, 0)
    assert.ok(chapterPose(track, .9).flatten > 0 && chapterPose(track, .9).flatten < 1)
    assert.equal(chapterHandoffPose(track, 0).roomOpacity, 1)
    assert.equal(chapterHandoffPose(track, 1).roomOpacity, 1)
  }
})

void test('every pinned bridge retains at least two viewports of physical scroll travel', () => {
  for (const [track, config] of Object.entries(chapterTracks)) {
    assert.ok(Number.parseFloat(config.height) - 100 >= 200, `${track} is too short after its sticky viewport is removed`)
  }
})

void test('case links preserve unrelated URL state and safely resolve invalid project identifiers', () => {
  const opened = projectLocation('https://example.test/?scene=archive#frame', 'test-project')
  assert.equal(opened, '/?scene=archive&project=test-project#projects')
  assert.equal(readProjectLocation(`https://example.test${opened}`, ['test-project']), 'test-project')
  assert.equal(projectLocation(`https://example.test${opened}`, null), '/?scene=archive#projects')
  assert.equal(readProjectLocation('https://example.test/?project=unknown', ['test-project']), null)
})
