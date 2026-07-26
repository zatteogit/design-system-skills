# The DTCG pipeline: making drift impossible instead of detectable

Censuses *detect* drift. A pipeline *prevents* it. This is the difference between
"aligned today" and "cannot diverge".

The goal is one source of truth, a lossless interchange file, and a CI check that
fails when the two sides disagree. Everything here assumes the skill's premise:
**code is the source of truth**, so the authoritative direction is
code → tokens → Figma, and Figma → tokens is an *audit* read, not a write-back.

## The shape

```
code token source ──generate──▶  *.tokens.json  ──apply──▶  Figma variables
       ▲                          (DTCG)                          │
       └──────────── CI: regenerate and diff ◀──────audit read────┘
```

Three programs, each independently testable:

1. **generate** — read the code's token source, emit DTCG. Deterministic; same
   input, byte-identical output.
2. **apply** — read DTCG, create/update Figma variables and collections. Never
   deletes; reports what it *would* delete.
3. **verify** — read Figma back, normalise to DTCG, diff against the generated
   file. This is the CI gate and it is the only one that must be fast.

Keep the generated `.tokens.json` **committed**. It is the artifact a reviewer
reads, the thing a token PR diffs, and the input to `apply`. A pipeline that
regenerates it invisibly has no review surface.

## Before writing any of it: the round-trip is lossy

Every failure of a token pipeline is a lossy mapping discovered late. Enumerate
the losses first and decide, per line, whether to record or refuse.

| Figma | DTCG | Loss and what to do |
|---|---|---|
| `FLOAT` variable | `dimension: {value, unit}` | **Figma floats carry no unit.** `spacing/2 = 8` is 8 what? Record the unit per collection or per group in `$extensions`, or the export is lossy and the re-import is a guess. |
| `COLOR` (RGBA 0–1) | `color` | Precision and colour space. Round consistently — decide 6-digit hex or full float once, and make `verify` compare *parsed* values, never strings. |
| collection **modes** | *nothing native* | DTCG has no mode concept. Pick one: a file per mode (simple, diffable, duplicative) or one file with modes in `$extensions` (compact, non-portable). File-per-mode wins unless you have many modes. |
| `scopes`, `codeSyntax`, `hiddenFromPublishing` | — | `$extensions` only. These are real design decisions; dropping them silently means `apply` resets them on the next run. |
| variable name `a/b/c` | group nesting `a.b.c` | Mechanical, but **names may not contain `.` `{` `}` nor start with `$`** — validate on the way out, not on the way in. |
| `VARIABLE_ALIAS` (by id) | `{group.token}` (by path) | Build the id→path map before serialising. An alias to a variable in another *file* (a library) cannot be expressed — refuse it loudly. |
| text styles, effect styles | `typography`, `shadow` composites | **These are not variables in Figma.** Composite DTCG types have no variable equivalent; they map to styles, which have a different API and no modes. See §"Composites". |
| `BOOLEAN`, `STRING` | `boolean` is not a DTCG type | Keep them, mark them in `$extensions`, and do not pretend they are portable. |

**Two rules that keep the pipeline honest:**

- **Refuse rather than approximate.** A mapping you cannot express should fail
  the generator with a named error. Silent approximation is how a pipeline
  produces confident, wrong output for a year.
- **Round-trip test from day one.** `apply` then `verify` on an untouched file
  must produce an empty diff. If it does not, the loss is in your mapping, and
  you want to find that on a fixture, not on the real file.

## Generate: code → DTCG

Read the same source the framework reads (see `framework-map.md`), not a
hand-maintained copy. The tier structure maps directly:

```
primitives  → a private top-level group, or a separate file
semantic    → aliases: { "$value": "{color.blue.500}" }
component   → aliases to semantic, never to primitives
```

Carry `$description` — in DTCG it is part of the token, and it is what stops the
same value being redefined by someone who could not tell what the token was for.
`$deprecated` marks retirement without deletion, which is almost always better
than removing a token people still use.

Declare `$type` on the **group** where a whole group shares one type; resolution
is explicit → resolved reference → nearest parent group. Never infer type from
the value shape, and do not let your generator do so either.

## Apply: DTCG → Figma

Mechanics belong to `figma-use`; what matters here is policy.

- **Create and update; never delete.** Report the set of Figma variables absent
  from the token file as a separate "orphans" list for a human to act on. A
  deleting pipeline will eventually run against a stale file.
- **Idempotent.** Running twice changes nothing the second time. Assert it in a
  test — it is the cheapest proof that `apply` reads before it writes.
- **Apply scopes and privacy every run**, from `$extensions`. If they are only
  set at creation they will drift back to `ALL_SCOPES` the first time someone
  recreates a collection.
- **One collection per orthogonal axis**, not one collection with the product of
  modes — Figma's mode limit is plan-dependent (Free 1, Professional 4,
  Enterprise 40+). Check the plan before designing the mode matrix; see
  `token-architecture.md`.
- **Order matters**: collections, then modes, then primitive values, then
  aliases. An alias whose target does not exist yet fails, and a partial run
  leaves the file in a state where the *next* run's diff is meaningless.

## Verify: the CI gate

The check that makes the whole thing worth building.

```
generate  →  tokens.expected.json
read Figma → normalise → tokens.actual.json
diff       →  non-empty = fail, and print the diff
```

Three properties that decide whether it survives contact with a team:

- **Compare normalised values, not text.** `#0FB478` and `#0fb478` and
  `rgb(15,180,120)` are the same token. Parse, then compare.
- **Report the diff as tokens, not as JSON lines.** `color.action.primary: code
  #0fb478 → figma #0eb377` is actionable; a JSON patch is not.
- **Fail on missing, extra and changed, separately.** They have different causes:
  missing = `apply` was not run; extra = someone added a variable by hand; changed
  = someone edited a value in Figma. Only the third is interesting, and only the
  third should ever be a conversation.

**Reading Figma from CI has a plan constraint worth checking before you plan
around it.** The Plugin API always works (a plugin running in the file), but it
needs the file open; the REST endpoint for variables is gated to higher plans.
Verify what your organisation actually has before designing a headless gate — if
the REST read is unavailable, the honest fallback is a scheduled manual export
committed to the repo, with the CI gate comparing against *that*. Slower, still
prevents silent drift, and does not pretend to a capability you do not have.

## What `verify` actually finds — a worked diff

Before building the pipeline it is worth running the diff **once, by hand**, on
the tokens you already have. It takes an hour and it tells you which of the four
failure classes you are dealing with — they need different fixes, and only the
first is what people expect.

From a real comparison of a Figma library against the SCSS it ships as:

**1 · Same name, different value.** The boring case, and the rarest.
`colors/primary/50` was `#426fe4` in Figma and `#4270e4` in code — one hex digit,
invisible to everyone, caught in a second by a machine. `colors/neutral/40`
differed properly (`#646568` vs `#5d5e61`), and `colors/primary/60` was a
different colour entirely.

**2 · The ordinal means different things on each side.** Figma's
`colors/primary/25` held `#00297a`, which in the code is `$color_primary_20`;
the code's own `primary_25` was a third colour that Figma does not have. A
name-matched diff reports this as a value mismatch and you "fix" it by
overwriting one side. It is really the failure that
[token-architecture.md](token-architecture.md) warns about — **ordinal names are
not semantic names** — and the fix is a rename, not a value change.

**3 · One side's naming is ahead of the other's.** Figma had `colors/accent/*`,
`colors/subtle/97`, `colors/feedback/alert-40`; the code still had
`$color_secondary_*`, `$color_primary_97`, `$color_red_40` — identical values,
different vocabulary. Figma passes the rebrand test and the code does not. **A
value diff reports zero problems here**, which is exactly why it must also diff
the *name sets*, not only the values of names present on both sides. Every one
of these silently breaks automated mapping.

**4 · An axis exists on one side only.** The Figma file carried a theme
collection of over a hundred variables with light and dark modes. The code emitted **zero CSS custom
properties of its own** — the design-system layer compiles Sass variables to
literals, so there is no runtime hook to theme at all. Dark mode was fully
designed and structurally unshippable.

That last one is the finding worth looking for first, because it invalidates the
others: there is no point diffing dark-mode values against a codebase that cannot
express dark mode. **Check that both sides have the same axes before comparing
any values** — modes in Figma against the mechanism in code (custom properties, a
theme provider, a build flag). If the mechanism is missing, that is the whole
report.

It also explains a symptom on the other side. Contrast failures in the Figma
file's dark mode had gone unnoticed for a long time; nobody reviews a mode that
never ships.

## Composites: where the model runs out

DTCG has `typography`, `shadow`, `border`, `gradient`, `transition`. Figma has
**variables** (single values, with modes) and **styles** (composites, without
modes). They do not line up, and no amount of tooling fixes it.

The workable arrangement:

- Decompose each composite into variables for the parts that must be themeable
  (font size, line height, weight; shadow colour) and bind them.
- Keep the composite itself as a Figma **style** that references those variables.
- In DTCG, emit both: the parts as `dimension`/`color`/`fontWeight` tokens, and
  the composite referencing them by alias.
- Accept that the style has no modes. If a composite must change per theme, its
  *bound parts* carry the theme; the style does not.

Say this in the token documentation, because the first person to try to put a
text style in a mode will otherwise spend a day on it.

## Build it or buy it

The interoperability *is* the point of the format, so prefer existing tools
unless you have a reason:

- **Style Dictionary** — the mature choice for DTCG → platform outputs (CSS,
  iOS, Android, TS). Write the Figma read/write yourself, let it do the
  transforms. This is the usual right answer.
- **Tokens Studio** — designer-driven Figma ↔ git sync. Good when designers own
  the tokens; awkward when code is the source of truth, because the plugin wants
  to be the writer.
- **Your own scripts** — justified for the Figma side (the Plugin API is yours
  anyway) and rarely justified for the transform side.

Whatever you choose: the **verify** step is yours to own. It encodes your
definition of "the same", and no tool can guess that.

## Where this sits relative to the guards

The pipeline governs the *values*. The code-side guards (`design-system-code`)
govern the *consumption*. Neither substitutes for the other:

- a perfect pipeline with no guards → tokens that are correct and unused;
- perfect guards with no pipeline → disciplined consumption of values that have
  quietly diverged from the design file.

Run both. They fail for different reasons, and each failure names its own fix.
