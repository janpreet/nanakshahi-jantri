#!/usr/bin/env node
// Compare the computed model against a pinned Jantri year — the yearly-refresh helper.
//
//   npm run compare -- 557     pinned year: diff every pinned value vs the model
//   npm run compare -- 559     unpinned year: print the full estimate sheet
//
// When transcribing a new Jantri, add data/pinned/ns<year>.json and run this:
// any DIFF is either a misread Gurmukhi digit (੨/੭, ੫/੬/੯, ੮/੯ are the traps)
// or a real editorial change in the Jantri — both worth a second look.
import { Engine } from '../src/index.js';
import { MONTHS } from '../src/bikrami.js';

const nsYear = parseInt(process.argv[2], 10);
if (!nsYear) {
  console.error('usage: npm run compare -- <nsYear>   (e.g. npm run compare -- 559)');
  process.exit(2);
}

const engine = new Engine();
const pin = engine.pinned.get(nsYear);
const table = engine.yearTable(nsYear);

if (!pin) {
  console.log(`NS ${nsYear} — no pinned data; everything below is ESTIMATED (computed).`);
  console.log('Hold this against the printed Jantri when it appears, then pin any differences.\n');
  console.log('Sangrands:');
  for (const m of table.months) console.log(`  1 ${m.name.padEnd(8)} = ${m.start}  (${m.days} days)`);
  const lunar = engine.lunarDays(nsYear);
  console.log(`\nMassia:    ${lunar.massia.join(', ')}`);
  console.log(`Purnmashi: ${lunar.purnmashi.join(', ')}`);
  console.log('\nEvents:');
  for (const ev of engine.eventsForYear(nsYear)) {
    const flag = ev.confidence === 'plus-minus-1-day' ? '  [±1 day]' : '';
    console.log(`  ${ev.date}  ${(ev.ns ?? '').padEnd(12)} ${ev.en}${flag}`);
  }
  console.log('\n(Events with no reliable rule — e.g. Sirjana Divas Sri Akal Takht — are not listed;');
  console.log(' they appear only once the year is pinned.)');
  process.exit(0);
}

console.log(`NS ${nsYear} — comparing the computed model against pinned Jantri data`);
console.log(`source: ${pin.source}\n`);
let diffs = 0, warns = 0;

// sangrands
const computed = engine.bikrami.computeSangrands(nsYear);
let ok = 0;
for (const m of MONTHS) {
  if (computed[m] === pin.sangrands[m]) { ok++; continue; }
  diffs++;
  console.log(`DIFF sangrand ${m}: pinned ${pin.sangrands[m]}, computed ${computed[m]}`);
}
if (pin.nextChet && computed._nextChet !== pin.nextChet) {
  diffs++;
  console.log(`DIFF next Chet: pinned ${pin.nextChet}, computed ${computed._nextChet}`);
}
console.log(`sangrands: ${ok}/12 match`);

// massia / purnmashi (if the pinned file has them)
for (const [label, tithi] of [['massia', 30], ['purnmashi', 15]]) {
  if (!pin[label]) continue;
  const comp = engine.bikrami.lunarDaysInRange(table.sangrands.Chet, table.nextChet, tithi);
  const missing = pin[label].filter(d => !comp.includes(d) && engine.bikrami.sunriseTithi(d) !== tithi - 1);
  // (a kshaya day prints with sunrise tithi one short — the engine's event logic handles it)
  const kshaya = pin[label].filter(d => !comp.includes(d)).length - missing.length;
  console.log(`${label}: ${pin[label].length - missing.length}/${pin[label].length} match${kshaya ? ` (${kshaya} kshaya, expected)` : ''}`);
  for (const d of missing) { diffs++; console.log(`DIFF ${label}: pinned ${d} is not a computed ${label} day`); }
}

// events
let exact = 0, ruleless = 0, offByOne = 0;
for (const [id, pe] of Object.entries(pin.events)) {
  const ev = engine.catalogById.get(id);
  if (!ev) { diffs++; console.log(`DIFF event ${id}: pinned but missing from data/events.json`); continue; }
  if (ev.rule.type === 'pinnedOnly') { ruleless++; continue; }
  const res = engine.computeRuleDate(ev.rule, nsYear, table);
  if (!res) { diffs++; console.log(`DIFF ${id}: pinned ${pe.date}, rule computed nothing`); continue; }
  if (res.date === pe.date) { exact++; continue; }
  const d = Math.abs(Date.parse(res.date) - Date.parse(pe.date)) / 86400000;
  if (pe.divergence) {
    warns++;
    console.log(`WARN ${id}: pinned ${pe.date}, computed ${res.date} — documented divergence: ${pe.divergence}`);
  } else if (ev.confidence === 'est1day' && d === 1) {
    warns++; offByOne++;
    console.log(`WARN ${id}: pinned ${pe.date}, computed ${res.date} — ±1-day festival tiebreak (${res.detail})`);
  } else {
    diffs++;
    console.log(`DIFF ${id}: pinned ${pe.date} [${pe.ns}], computed ${res.date} (${res.detail}) — check the printed digit`);
  }
}
console.log(`events: ${exact} exact, ${offByOne} festival ±1-day, ${ruleless} pinned-only (no rule), of ${Object.keys(pin.events).length} pinned`);

console.log(diffs ? `\n${diffs} difference(s) — investigate before shipping.` : `\nAll good — the model reproduces the pinned Jantri${warns ? ` (${warns} known festival warning(s))` : ''}.`);
process.exit(diffs ? 1 : 0);
