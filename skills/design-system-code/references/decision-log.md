# The decision log

The guard records *what* is enforced. Nothing records *why* — why this token is
scoped that way, why one pattern is ratcheted and its neighbour is a hard rule,
what the numbers were before the last cleanup. That knowledge is needed to change
the system safely and by default it lives in one person's head.

The temptation is to build a knowledge base for it. Resist: a documentation
system with personas, workflow menus and a state machine is a second thing to
maintain, and it will fall behind the guard within a month.

## The principle: derive, don't duplicate

**Most of the record already exists inside the guard.** Look at what the config
holds before writing a single chapter:

| Question | Already answered by |
|---|---|
| which rules are enforced | `CONFIG.patterns` |
| what is excluded from scope, and where the perimeter starts | `CONFIG.exclude`, `CONFIG.entries` |
| which files are exempt and **why** | `CONFIG.exceptions` — the value *is* the reason |
| which public tokens are intentionally unconsumed and why | `CONFIG.reserved` — same |
| what the current debt is, per pattern and per file | the baseline file |
| what the token graph looks like right now | `--json` |

So the config is the primary record, and keeping it that way is a design
constraint: **anything that can be a commented value in the config does not
belong in a document.** Prose duplicating the config is prose that will contradict
it.

That leaves exactly two gaps. Fill those two, and nothing else.

## Gap 1 — one markdown file

A single file. Not a directory, not chapters, not an index. Put it where the
project's docs already are; if the project has a knowledge base
(`core-knowledge/`, `knowledge/core_knowledge/`, `docs/`), put it in there rather
than creating a parallel home.

```markdown
# Design system — decisions

## Instruments
Why each pattern sits where it does. One line each; the count at the time
is what makes it re-decidable later.

- `arbitrary-value` — hard, 0. A correct alternative always exists.
- `nominal-palette` — ratchet, 780 at 2026-01-15. Snapping the palette is an
  app-wide visual change; needs a pixel pass, so it burns in waves.
- `half-step-spacing` — ratchet as approval workflow. `mt-[2px]` is banned, so
  the half-step class is the only form left for a real optical fix; each new one
  goes through an explicit baseline commit.

## Thresholds
- Button owned-style override = 7 groups. Measured: the bulk of call sites
  override 2–3; 7 is above every legitimate case in the histogram.

## Waves
- 2026-07-26 — profile/*: 41 files to zero on inline-hex. Verified with the
  geometry signature; 0 elements moved.
```

Three sections, and they are all things the config genuinely cannot express: the
*reasoning* behind an instrument choice, how a numeric threshold was derived, and
what a cleanup wave actually did. Everything else stays in the config.

**Write the reason before the config entry, not after.** For an exception this is
the whole control: if you cannot write a durable reason, you have discovered that
it should be a fix. "Print preview keeps absolute reproducible colours" still
explains itself in two years; "temporary, see DS-4471" does not.

## Gap 2 — the census, appended by a script

The one piece with real compounding value, and it needs no human input at all.
The guard's metrics are a snapshot; a *series* of them is the only thing that
answers "is this actually getting better".

```bash
node scripts/ds-guard.mjs --log docs/ds-census.jsonl
```

Appends one line per run:

```json
{"date":"2026-01-15","mode":"migration","files":300,"perimeter":260,
 "tokens":{"primitives":160,"consumed":160,"public":180},
 "contrast":{"pairs":15},"foundationFindings":0,"zoneFindings":0,
 "ratchet":{"inline-hex":200,"arbitrary-value":840,"nominal-palette":780}}
```

JSONL because it is append-only and diffs cleanly. **Never rewrite a past line** —
a wrong historical number is itself information; correct it with a new line and a
note in the markdown file.

Run it in CI on the default branch, or in the release script. Once a release is
plenty; once per commit produces noise nobody reads.

Reading it is a one-liner, and the trend is the point:

```bash
node -e "require('fs').readFileSync('docs/ds-census.jsonl','utf8').trim().split('\n')
  .map(JSON.parse).forEach(e=>console.log(e.date, JSON.stringify(e.ratchet)))"
```

## Keeping it alive

Two triggers, and deliberately no process beyond them:

- **A baseline regeneration needs a reason in the same commit.** `ds:baseline`
  either accepts new debt or records a cleanup, and the number alone does not say
  which. One line in the markdown file, in the same diff as the baseline.
- **A new exception needs its reason written first**, as described above.

That is the entire protocol. No workflow codes, no state file — the baseline file
*is* the state, and the guard already knows how to read it. If maintaining this
ever takes more than a minute, something has been added that should not have
been.
