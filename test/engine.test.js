// Layering (override > pinned > computed), tagging, conversions, overrides API.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../src/index.js';

const engine = new Engine();

test('pinned year serves the printed date, marked confirmed with source', () => {
  const events = engine.eventsForYear(557);
  const sa = events.find(e => e.id === 'shaheedi-guru-arjan');
  assert.equal(sa.date, '2025-05-30');
  assert.equal(sa.ns, '17 Jeth');
  assert.equal(sa.status, 'confirmed');
  assert.match(sa.detail, /Jantri 557/);
});

test('unpinned year computes events, marked estimated with rule detail', () => {
  const events = engine.eventsForYear(559);
  const gn = events.find(e => e.id === 'parkash-guru-nanak');
  assert.equal(gn.status, 'estimated');
  assert.equal(gn.date, '2027-11-14'); // Kartik purnima 2027
  assert.match(gn.detail, /Katak purnmashi/);
});

test('pinned-only events are absent in unpinned years (never guessed)', () => {
  const events = engine.eventsForYear(559);
  for (const id of ['sirjana-akal-takht', 'janam-ajit-singh', 'sees-saskar-guru-tegh-bahadur']) {
    assert.equal(events.find(e => e.id === id), undefined, id);
  }
});

test('pinned years reproduce exactly the printed event set', () => {
  for (const [nsYear, pin] of engine.pinned) {
    const events = engine.eventsForYear(nsYear);
    assert.equal(events.length, Object.keys(pin.events).length, `NS ${nsYear} count`);
    for (const e of events) {
      assert.equal(e.status, 'confirmed');
      assert.equal(e.date, pin.events[e.id].date, `${e.id} ${nsYear}`);
    }
  }
});

test('gregorian <-> nanakshahi conversion round-trips', () => {
  const table = engine.yearTable(557);
  assert.equal(engine.nsToGregorian('Jeth', 32, table), '2025-06-14'); // 32-day Jeth
  assert.equal(engine.nsToGregorian('Sawan', 32, table), null);       // no 32 Sawan in 557
  assert.deepEqual(engine.gregorianToNs('2025-06-14', table), { month: 'Jeth', day: 32, label: '32 Jeth' });
});

test('overrides can be injected by the consumer (add, hide, rename)', () => {
  const e2 = new Engine({
    overrides: {
      add: [{ id: 'my-barsi', en: 'My local barsi', category: 'historical', rule: { type: 'fixedSolar', month: 'Magh', day: 5 } }],
      hide: ['azadi-divas'],
      rename: { 'punjabi-suba-divas': { en: 'Punjabi Suba Day (renamed)' } },
    },
  });
  const events = e2.eventsForYear(557);
  assert.equal(events.find(e => e.id === 'my-barsi')?.date, '2026-01-18'); // 5 Magh 557
  assert.equal(events.find(e => e.id === 'azadi-divas'), undefined);
  assert.equal(events.find(e => e.id === 'punjabi-suba-divas').en, 'Punjabi Suba Day (renamed)');
});
