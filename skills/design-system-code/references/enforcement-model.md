# The enforcement model

How to choose, combine and retire the four instruments. Distilled from two
independent implementations — one mid-migration, one at rest — which is what
makes the *trajectory* between them observable rather than theoretical.

## Choosing the instrument

One question, asked per pattern: **does a correct replacement exist right now,
for every occurrence, without a visual change that needs verification?**

| Answer | Instrument |
|---|---|
| Yes, and violating it breaks a contract | **hard rule** |
| Yes, but the debt is large outside the product surface | **perimeter** |
| Yes, and these files are already done | **clean-list** |
| No — fixing it is a visual change across the app | **ratchet** |
| No, and no stricter form exists at all | **ratchet as approval workflow** |

The failure mode of getting this wrong is asymmetric. Too strict → red build →
the guard is disabled or `--report` becomes permanent → you have nothing. Too
loose → debt grows slowly → you notice. **Bias toward the ratchet on anything
you have not personally counted.**

## Hard rules

Absolute, everywhere in scope, never absorbed by a baseline. Reserve them for:

- **Contracts**: token reachability, reference cycles, unresolved references,
  incomplete token families, contrast AA, generated-artifact integrity.
- **Traps**: patterns that are silently wrong rather than visibly ugly — an alpha
  suffix concatenated onto a token string, a tonal surface paired with a
  non-container foreground, a raw motion-driven control.
- **Boundaries**: upward imports between tiers, a domain module importing a
  presentation framework.

Run them **first**, and exit before the ratchet logic. Two reasons: a foundation
failure makes every downstream count meaningless, and it keeps the failure
message about the actual problem.

## The perimeter

Zero tolerance on the set of files reachable from the product routes (§3 of
SKILL.md). Everything else — DevTools, admin, playground — stays on the ratchet.

The perimeter is what makes enforcement *honest* during a long migration: the
part users see is already clean, and the remaining number is real debt in places
that do not ship.

**Exempt individual patterns from the perimeter, not individual files.** If one
pattern is too big to zero out inside the perimeter, it stays perimeter-exempt
and lives on the global ratchet. Carving out a *file* instead punches a hole in
the product surface that never closes.

## The clean-list

A named set of files that must contain zero occurrences of a named subset of
patterns, regardless of baseline.

Its only job is to plug the hole in a **totals-based** ratchet: without it, an
occurrence can move from a dirty file into a finished one and the total does not
rise. If your ratchet is per-file, you do not need a clean-list — the per-file
baseline already forbids exactly this, structurally and without maintenance.

If you have one: it must be checked in baseline-regeneration mode too, and the
subset of patterns it enforces should be the unambiguous ones (hardcoded colour,
arbitrary size) rather than everything.

## The ratchet

```
current > baseline  → fail, and print the per-file diff of what rose
current = baseline  → pass
current < baseline  → pass, and say the baseline can be lowered
```

**Per-file, not per-total.** Store `{ total, byFile }` and compare by file. A new
file starts at 0, so debt cannot be relocated. The cost is a noisier baseline
file; the benefit is that the clean-list becomes unnecessary and the guard stops
depending on a hand-maintained list.

**Do not auto-lower the baseline.** Report the improvement and let a human run
the update command. Auto-lowering makes the baseline diff invisible in review,
and the diff is the only place a deliberate exception is visible.

**Regeneration must not absorb strict-zone regressions.** Order inside the
update path:

```
1. clean-list violations   → exit, even in --update
2. perimeter violations    → exit, even in --update
3. foundation contracts    → exit, never baselined
4. hard rules              → exit, never baselined
5. only now: write the new baseline
```

Skipping this is how a baseline becomes a place where regressions go to hide.

### The ratchet as an approval workflow

When no stricter form of an expression exists, prohibition is not available and
the ratchet becomes the control:

> Arbitrary spacing (`mt-[2px]`) is a hard rule at zero. The half-step utility
> (`mt-0.5`) is therefore the *only* way to express a genuine optical alignment
> fix. It cannot be banned. So it sits on a ratchet: every new use fails the
> build, and a necessary one is approved by regenerating the baseline — which
> makes it a one-line diff that a reviewer sees and can challenge.

Read the general shape: **"needs an explicit approving commit" is a distinct
enforcement level**, weaker than a ban and much stronger than a lint warning. Use
it for anything legitimate-but-rare.

## Exceptions

At rest, exceptions replace baselines entirely. The policy that keeps them from
metastasising:

- **File-exact.** A key is one repo-relative path. Never a directory, never a
  glob, never a count.
- **A durable human reason**, not a ticket reference. "Print preview: the
  exported sheet keeps absolute reproducible colours" still explains itself in
  two years; "see DS-4471" does not.
- **Grouped by rule**, so an exception is narrow: this file is exempt from
  *inline styles*, not from the design system.
- **Empty by default and code-reviewed.** An empty exceptions object that is
  visibly part of the guard invites scrutiny of every addition.
- **Stale exceptions fail the guard.** If the file no longer exists, or the
  reserved token was deleted, that is a finding. Otherwise the list only grows.

Two things that are *not* exceptions, however they are labelled: a tolerated
count, and the exclusion of a user-facing directory.

## The trajectory

A system in migration and a system at rest have different guards. Knowing which
one you are looking at prevents both classic mistakes — demanding zero from a
codebase with 2700 violations, and leaving a baseline in place years after the
debt hit zero.

| Stage | Shape | Signal to move on |
|---|---|---|
| **0. Blind** | no counts | — write the counter, enforce nothing |
| **1. Ratcheted** | totals baseline, everything on it | the count stops rising on its own |
| **2. Perimetered** | product surface at zero; rest ratcheted | the perimeter holds for a few weeks |
| **3. Consolidating** | clean-list grows wave by wave, or per-file ratchet | most patterns are near zero |
| **4. At rest** | no baseline; hard rules + file-exact exceptions | — delete the baseline file |

**Step 4 is a deletion, and it is the goal** — *for the product surface*. A
baseline file that has not changed in a year is either a system at rest that
nobody has cleaned up, or a guard nobody runs. Check which.

### The rung the ladder was missing: at rest with a baseline

Read literally, step 4 contradicts the perimeter. §3 scopes zero tolerance to
what is reachable from product routes and deliberately leaves DevTools, admin
and internal panels outside — and then the trajectory says the goal is no
baseline at all, which can only be reached by cleaning exactly the code the
perimeter said did not matter.

> **A permanently non-zero baseline confined to non-product surfaces is a
> legitimate resting state, not an unfinished migration.**

The state to aim at is: **product surface at zero and held there by the
perimeter, with a small stable baseline covering internal tooling.** Read with
the ladder alone that looks like "stage 3, incomplete", and the signal above
says to push — which is how a session ends up migrating hundreds of occurrences
in DevTools that nobody wanted touched. So before treating a stable baseline as
debt, **check where its entries live**: if they are all outside the perimeter,
the system is at rest and the correct action is none.

Two compositions that follow from the same reasoning, and that are easy to miss
because each ingredient is documented separately:

- **Check whether the residual debt is inside the perimeter before choosing an
  instrument.** A ratchet planned over a pattern whose survivors all sit *inside*
  the perimeter is a ratchet that never applies — the perimeter already forbids
  them. And if the migration can reach zero, prefer the hard rule from the
  start: a ratchet over debt that is already closed is an invitation to reopen it.
- **Retiring a clean-list has a precondition.** The clean-list is checked in
  `--update` as well as in check mode; a per-file ratchet protects in check mode
  and `--update` can absorb. So retiring it moves every entry from "protected
  during regeneration" to "absorbable during regeneration". Before retiring,
  verify that **every entry falls in a zone that is also enforced in `--update`**
  — the perimeter, or a strict zone. Entries outside those zones lose their
  protection silently.

### A new project starts at stage 4

This ladder exists to climb out of debt. A greenfield repo has none, so it begins
at the top and the entire apparatus below stage 4 is machinery it should never
acquire. Concretely: no baseline file, every pattern a hard rule everywhere, the
perimeter degenerate because everything is product.

The direction of risk is therefore **inverted**. A migration's danger is being
too strict too early; a new project's danger is *sliding down the ladder* — a
deadline arrives, someone records a baseline to unblock it, and the project is
permanently at stage 1 with debt it never had to have.

Two guards against that slide:

- **Prefer a file-exact exception to a first baseline.** One file with a durable
  reason is reviewable and stays visible; a baseline is a number that stops being
  read after a week.
- **Make acquiring a baseline a deliberate, named decision.** If it happens,
  say out loud that the project has become a migration, and put the deletion back
  on the roadmap. A baseline created "temporarily" and never discussed again is
  the normal outcome.

Migrating debt happens in **waves**, not continuously: pick a coherent set of
files, clean them, verify visually, lower the baseline, add them to the
clean-list. A wave has a diff a reviewer can read. Continuous cleanup mixed into
feature work has none.

## Reporting

The guard's output is read by someone whose build just failed. It should answer
"what do I do now" without opening the source.

- **Scope line first**: how many files were scanned, and how the set was derived.
  This is also the tripwire for a broken resolver — a perimeter that suddenly
  covers 12 files instead of 180 is the number that reveals it.
- **A table of rule × baseline × current × verdict.** The verdict word matters:
  `unchanged` / `improved (-4)` / `REGRESSION (+2)`.
- **On failure, the per-file diff of what rose**, sorted by delta, not the raw
  finding list. `Checkout.tsx 3 → 7 (+4)` is actionable; 400 lines of findings is
  not.
- **Cap the finding list** (~80) with a `… N more` line, and put the full list
  behind `--verbose` or `--json`.
- **Say how to accept it.** The last line of a ratchet failure names the command
  that regenerates the baseline and states plainly that doing so accepts the
  debt rather than fixing it.

Exit codes: `0` pass, `1` any gate failure. `--report` prints and exits `0`; make
the script header say it is for migration and not a gate bypass, because that is
what it will be used as.

## Wiring

- `ds:check` — the gate. Pre-commit hook **and** CI. A guard that only runs in CI
  is advisory; developers learn to push and see.
- `ds:baseline` — regeneration, run deliberately by a human.
- `ds:report` — read-only inventory for migration work.

Keep the static gate separable from the expensive one (production build, visual
matrix, browser accessibility). The static guard must stay fast enough to run on
every commit — that is the property that makes it real.
