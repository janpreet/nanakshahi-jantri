#!/usr/bin/env node
// Scaffold a pinned-year DRAFT from the computed model, for the yearly Jantri refresh.
//
//   npm run scaffold -- 559     writes data/pinned/ns559.draft.json
//
// The draft is prefilled with every computed estimate in the exact shape of a pinned
// file, so transcribing the printed Jantri becomes *correcting* instead of typing:
// check each line against the printed pages, fix any that differ, fill in the source
// page references, then rename the file to ns559.json and run:
//   npm run compare -- 559 && npm test
//
// The engine deliberately ignores *.draft.json — a draft can never ship as confirmed
// data. This is the intended amount of automation: the astronomy fills in everything
// it can predict, and a human verifies against the printed pages (the Gurmukhi
// numeral look-alikes ੨/੭, ੫/੬/੯, ੮/੯ are exactly why).
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from '../src/index.js';

const nsYear = parseInt(process.argv[2], 10);
if (!nsYear) {
  console.error('usage: npm run scaffold -- <nsYear>   (e.g. npm run scaffold -- 559)');
  process.exit(2);
}

const engine = new Engine();
if (engine.pinned.has(nsYear)) {
  console.error(`NS ${nsYear} is already pinned (data/pinned/ns${nsYear}.json) — nothing to scaffold.`);
  process.exit(1);
}

const year = engine.buildYear(nsYear);
const gy = nsYear + engine.calibration.nsEpochGregorianOffset;

const draft = {
  _DRAFT: `UNVERIFIED computed estimates for NS ${nsYear} (${gy}-${(gy + 1) % 100}). ` +
    'Verify EVERY value against the printed Jantri, fix differences, add page refs to "src", ' +
    `replace this _DRAFT key with a real "source" description, then rename to ns${nsYear}.json ` +
    `and run: npm run compare -- ${nsYear} && npm test`,
  nsYear,
  sangrands: Object.fromEntries(year.months.map(m => [m.name, m.start])),
  nextChet: year.nextChet,
  massia: year.lunar.massia,
  purnmashi: year.lunar.purnmashi,
  events: Object.fromEntries(year.events.map(ev => [ev.id, {
    date: ev.date,
    ns: ev.ns,
    src: 'p.?',
    _check: ev.confidence === 'plus-minus-1-day'
      ? 'ESTIMATE ±1 DAY (festival tiebreak) — verify with extra care'
      : `estimate: ${ev.detail}`,
  }])),
  _missing: 'Events with no computable rule are absent above and MUST be read from the printed pages: ' +
    engine.catalog.filter(e => e.rule.type === 'pinnedOnly').map(e => e.id).join(', '),
};

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'pinned', `ns${nsYear}.draft.json`);
if (existsSync(out)) {
  console.error(`${out} already exists — remove it first if you want a fresh draft.`);
  process.exit(1);
}
writeFileSync(out, JSON.stringify(draft, null, 2) + '\n');
console.log(`Wrote ${out}`);
console.log(`${year.events.length} events prefilled from the model; verify each against the printed Jantri.`);
console.log('The engine ignores *.draft.json — rename to ns' + nsYear + '.json only after verification.');
