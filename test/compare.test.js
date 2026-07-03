// The compare tool must exit 0 (all-match) for every bundled pinned year.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'compare.js');

for (const year of [549, 557, 558]) {
  test(`compare reports a full match for pinned NS ${year}`, () => {
    const out = execFileSync(process.execPath, [bin, String(year)], { encoding: 'utf8' });
    assert.match(out, /All good/);
  });
}
