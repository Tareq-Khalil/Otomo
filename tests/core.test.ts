import test from 'node:test'
import assert from 'node:assert/strict'
import {
  JAPANESE_PHRASES,
  localDateKey,
  pickBonusPhrase,
  pickDailyPhrase,
  type JapanesePracticeState
} from '../src/lib/japanese/dailyPhrase.ts'
import { threeWay, type Fields } from '../src/lib/merge.ts'
import { addDays, clock, dur, iso, mins, secsOf, weekStart } from '../src/lib/time.ts'
import { getGroups, getSections, isSupported } from '../src/lib/faculties.ts'

test('Japanese Daily Phrase catalog integrity', () => {
  assert.ok(JAPANESE_PHRASES.length >= 24)
  const ids = new Set<string>()
  for (const p of JAPANESE_PHRASES) {
    assert.ok(!ids.has(p.id), `Duplicate phrase id: ${p.id}`)
    ids.add(p.id)
    assert.ok(p.japanese.trim().length > 0)
    assert.ok(p.kana.trim().length > 0)
    assert.ok(p.romaji.trim().length > 0)
    assert.ok(p.english.trim().length > 0)
    assert.ok(p.arabic.trim().length > 0)
    assert.ok(p.dialogue.length >= 1)
    if (p.challenge.type === 'reply') {
      assert.ok(p.challenge.answerIndex >= 0 && p.challenge.answerIndex < p.challenge.choices.length)
    } else {
      assert.ok(p.challenge.choices.includes(p.challenge.answer), `Missing answer in choices for ${p.id}`)
    }
  }
})

test('Daily & bonus phrase selection avoids recent repetition', () => {
  const state: JapanesePracticeState = {
    streak: 3,
    lastCompleted: '2026-11-25',
    completedIds: ['naruhodo'],
    recentIds: ['naruhodo', 'otsukaresama', 'chotto-matte'],
    totalCompleted: 3
  }
  const daily = pickDailyPhrase(new Date('2026-11-26T10:00:00Z'), state)
  assert.ok(!state.recentIds.includes(daily.id))

  const bonus = pickBonusPhrase(daily.id, state)
  assert.notEqual(bonus.id, daily.id)
  assert.ok(!state.recentIds.includes(bonus.id))
  assert.equal(localDateKey(new Date(2026, 10, 26)), '2026-11-26')
})

test('Three-way task merge resolves clean edits and flags true conflicts', () => {
  const base: Fields = {
    title: 'Lab report',
    notes: '',
    priority: 'normal',
    category: 'PHY',
    status: 'todo',
    completedAt: null,
    dueDate: '2026-11-30',
    dueTime: '17:00',
    startDate: null,
    startTime: null,
    estMin: 60,
    remindMin: 30,
    deletedAt: null
  }
  const local: Fields = { ...base, status: 'done', completedAt: 1000 }
  const server: Fields = { ...base, priority: 'high' }
  const clean = threeWay(local, server, base)
  assert.deepEqual(clean.conflicts, [])
  assert.equal(clean.merged.status, 'done')
  assert.equal(clean.merged.priority, 'high')
  assert.equal(clean.merged.completedAt, 1000)

  const conflict = threeWay(
    { ...base, title: 'Local title' },
    { ...base, title: 'Server title' },
    base
  )
  assert.deepEqual(conflict.conflicts, ['title'])
})

test('Time and faculty helpers', () => {
  assert.equal(mins('09:30'), 570)
  assert.equal(clock('00:05'), '12:05 AM')
  assert.equal(clock('14:00'), '2:00 PM')
  assert.equal(dur(90), '1h 30m')
  assert.equal(iso(addDays(new Date(2026, 10, 25), 1)), '2026-11-26')
  assert.equal(weekStart(new Date(2026, 10, 25)).getDay(), 6) // Saturday start for E-JUST week
  assert.deepEqual(secsOf(2), [4, 5, 6])
  assert.equal(isSupported('foe', 1), true)
  assert.equal(isSupported('foe', 2), false)
  assert.equal(getGroups('foe').length, 8)
  assert.deepEqual(getSections('foe', 2), [4, 5, 6])
})
