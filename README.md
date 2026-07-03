# nanakshahi-jantri

[![CI](https://github.com/janpreet/nanakshahi-jantri/actions/workflows/ci.yml/badge.svg)](https://github.com/janpreet/nanakshahi-jantri/actions/workflows/ci.yml)

Calendar engine for the **Nanakshahi calendar as actually practised** — the official printed
Jantri (Amritsar): sangrands, massia/purnmashi, and every Gurpurab, itihasik dihada and bhagat
sahiban da dihada. Pure JavaScript (Node ≥18), one dependency
([astronomy-engine](https://github.com/cosinekitty/astronomy)), no network access ever.

Use it for anything that needs Nanakshahi dates: apps, bots, widgets, ICS feeds
(see [nanakshahi-ical](https://github.com/janpreet/nanakshahi-ical) for the reference consumer),
gurdwara displays, research.

## Why this exists

The Jantri in current practice is the Bikrami calendar under Nanakshahi labels. Month starts are
true sidereal **sankrantis**, so month lengths change every year (Jeth had 32 days in NS 557,
Sawan has 32 in NS 558), and the Guru parkash/gurgaddi/joti-jot days move on **Bikrami tithis**
(Parkash Guru Nanak Dev Ji = Katak purnmashi). Fixed date tables are wrong within a year or two.
This engine instead layers:

1. **Pinned data** (always wins) — dates extracted digit-by-digit from published Jantris, with
   source page citations. Bundled: **NS 549 (2017-18), 557 (2025-26), 558 (2026-27)**.
2. **Computed fallback** — a drik astronomical model for any other year, calibrated against every
   pinned data point: **36/36 sangrands, 25/25 massia+purnmashi, 132/132 tithi events**. Every
   computed value is tagged `estimated`; events with no reliable rule are never guessed.
3. **User overrides** — consumer-supplied additions/hides/renames, applied last.

## Install

```bash
npm install nanakshahi-jantri        # once published
npm install janpreet/nanakshahi-jantri   # or straight from GitHub
```

## API

```js
import { Engine } from 'nanakshahi-jantri';

const engine = new Engine();

// Full year: months, massia/purnmashi, events — each tagged confirmed | estimated
const year = engine.buildYear(558);
year.months;              // [{ name:'Chet', start:'2026-03-14', days:31 }, ...]
year.events[0];           // { id, en, pa, category, date, ns, status, detail, ... }

// Solar table for any year (computed if unpinned)
engine.yearTable(560).sangrands;      // { Chet:'2028-03-14', ... }  (estimated)

// Date conversion (handles the varying month lengths)
const t = engine.yearTable(557);
engine.gregorianToNs('2025-05-30', t);   // { month:'Jeth', day:17, label:'17 Jeth' }
engine.nsToGregorian('Jeth', 32, t);     // '2025-06-14'  (32-day Jeth exists in 557)

// Events only
engine.eventsForYear(559);            // sorted, estimated-tagged

// Consumer overrides (object or path to JSON)
new Engine({ overrides: { add:[...], hide:['azadi-divas'], rename:{...} } });
```

Lower-level building blocks are exported too (`Bikrami`, `sunriseUTC`, `tithiAt`,
`findSankranti`, …) for panchang-style use cases.

## The model (what "estimated" means)

- **Solar**: sun's sidereal longitude entering each rashi (Lahiri-type ayanamsa, 23.8532° at
  J2000); the sangrand is the **sunrise-to-sunrise day at Amritsar** containing the sankranti —
  a sankranti after midnight but before sunrise belongs to the previous civil day. This rule was
  forced by the data: 11 of the 36 pinned sangrands fall in that pre-dawn window.
- **Lunar**: sunrise (udaya) tithi at Amritsar; purnimanta labels over amanta months; the amanta
  month containing the Mesha sankranti is Chet; a sankranti-less month is adhik and skipped;
  kshaya tithi → the day the tithi runs; vridhi tithi → the first day.
- **Festival rules**: Bandi Chhor Divas = amavasya prevailing at pradosh (later evening when both
  qualify — the Jantri's own choice in the split-Diwali year 2025); Darbar Khalsa (Dussehra) =
  dashami overlapping aparahna (first day when both qualify). Estimated entries for these two
  carry a ±1-day note because panchang authorities genuinely disagree in split years.
- Everything tunable lives in [`data/calibration.json`](data/calibration.json); per-event rules
  in [`data/events.json`](data/events.json). No code changes needed to recalibrate.

## Adding a new Jantri year

When a new Jantri is published, add one file — `data/pinned/ns<year>.json` (copy the shape of
`ns558.json`): 12 sangrands, massia/purnmashi days, and each event's printed date with a source
page note. Run `npm test` — the suite validates the model against every pinned data point, so a
misread Gurmukhi digit (the look-alikes ੨/੭, ੫/੬/੯, ੮/੯ are the classic trap) shows up as a test
failure to investigate before shipping.

## Related work

- [drik-panchanga](https://github.com/webresh/drik-panchanga) — general-purpose drik panchang in
  Python (Swiss Ephemeris). Same astronomy family; this package differs in being specialised to
  the Jantri's specific conventions and carrying pinned printed-Jantri data as ground truth.
- [nanakshahi-js](https://github.com/Sarabveer/nanakshahi-js) — the *original 2003* fixed
  arithmetic Nanakshahi calendar, which current Jantris no longer follow.

## License

MIT
