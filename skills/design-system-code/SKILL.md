---
name: design-system-code
description: Build and enforce a design system inside a codebase — token tiers that nothing can skip, and guards that stop the code from drifting off them. Works for both new and existing projects, which need different guards. Use when starting a project and setting up tokens and enforcement from the first commit, when installing design-system enforcement on an existing repo, when tokens exist but nobody uses them, when hardcoded colours/spacing/typography keep reappearing, when deciding between a ratchet and a hard rule, when a design-system guard needs writing, extending or debugging, when migrating a large codebase onto tokens without a red build from day one, or when a "we have tokens" system is not actually being consumed. The code-side counterpart of figma-generate-library and figma-code-sync.
---

# Design systems in code

A design system in code is **a consumption contract, not a token file**. Writing
the tokens is a day of work. Making it impossible to bypass them is the system.

This skill is the code-side half of the chain: `figma-generate-library` builds
the system in Figma, `figma-code-sync` keeps the two aligned, and this one makes
the code side worth aligning to.

## 0. The premise: a tier is only real if nothing skips it

The same rule as the Figma side, and it is the whole discipline. Naming a token
`semantic` does not make it a tier. **The test is consumption, not naming**: if
components bind primitives directly, the primitives *are* the public API,
whatever the folder is called.

So every rule in this skill is a *count*, and every count is enforced by a
program. Documents do not stop drift. Two independent codebases confirm the same
thing: the guard is the design system.

Three corollaries that decide most judgement calls:

- **Never enforce what you have not measured.** Write the counter first, run it,
  look at the number, then choose the instrument (§2). A rule chosen before the
  count is either noise or a permanently red build.
- **A guard with no tests is a guard that will silently stop working.** A regex
  that stops matching turns green forever and nobody notices. §6.
- **Enforcement is scoped by reachability, not by directory.** §3.

## 1. First: which of the two situations is this?

The single most consequential question, and the one that is easiest to answer
wrong by inertia. **A new project and an existing one need different guards**,
not the same guard tuned differently.

| | **New project** | **Existing codebase** |
|---|---|---|
| Debt | none | usually thousands of occurrences |
| Every rule is | a **hard rule**, from the first commit | chosen per pattern (§2) |
| Baseline file | **does not exist** | the central mechanism |
| Perimeter | degenerate — everything is product | a real subset, and the first thing to clean |
| Failure mode | over-engineering the tiers before there is code | a red build that gets disabled |
| Install path | §7a | §7b |

**A new project starts where a migration ends.** There is nothing to ratchet
against, so the whole ratchet/clean-list/perimeter apparatus is machinery you do
not need and should not carry. Installing it "for later" is how a greenfield
project acquires a baseline file on day one and never leaves stage 1.

The corollary matters just as much: **a new project that acquires a baseline has
silently become a migration project.** When the first unfixable-now pattern
appears — and it will — reach for a *file-exact exception* first. Add a baseline
only when the count is genuinely large, and know that you have changed category.

Read §2 either way: even on a greenfield repo you will eventually need to place
one pattern somewhere other than "hard", and the reasoning is the same.

## 2. The four instruments

Almost every failure of design-system enforcement on an **existing** codebase is
picking the wrong instrument, not writing the wrong rule. In increasing
strictness:

| Instrument | Fails when | For |
|---|---|---|
| **Ratchet** | the count rises above a recorded baseline | large pre-existing debt you cannot fix now |
| **Clean-list** | a named already-clean file has *any* occurrence | protecting finished migration work |
| **Perimeter** | any occurrence inside the user-facing reachable set | debt with an immediate correct replacement |
| **Hard rule** | any occurrence anywhere | contracts and traps; never baselined |

**Choose by asking one question: does a correct replacement exist right now?**
If yes, it is a hard rule or a perimeter rule. If no — if fixing it means a
visual change across the app that needs verification — it is a ratchet. Putting
a large legacy pattern in a zero-tolerance perimeter produces a red build that
gets disabled within a week, and then you have nothing.

### The ratchet, precisely

Record the current count per pattern; fail only on increase; lower the baseline
as it is cleaned. It lets you live with debt without letting it grow.

**Prefer a per-file ratchet to a per-total one.** A totals ratchet has a hole:
debt can *move* from a dirty file into a clean one without the total rising. Two
ways to close it, and you only need one:

- **per-file baseline** — a new file starts at 0 and any file that rises fails.
  Structurally airtight; this is the better default.
- **totals baseline + clean-list** — cheaper to build, but the clean-list is now
  load-bearing and has to be maintained by hand.

If you inherit the second, migrating to the first retires the clean-list.

### Two rules the baseline must obey

- **The strict zones are checked in `--update` mode too.** Otherwise regenerating
  the baseline silently absorbs a regression, which is the one thing a baseline
  must never do. Clean-list, perimeter and hard rules run *before* and
  *independently of* baseline regeneration.
- **Foundation contracts never enter a baseline.** Reachability, cycles, missing
  references, contrast — these are either true or the system is broken. Gate them
  first, exit before the ratchet ever runs.

### The ratchet is also an approval workflow

The underrated use. Consider a spacing scale where `mt-[2px]` is banned outright
but a half-step class `mt-0.5` is the only way to express a real optical
alignment fix. There is no stricter form available, so the control cannot be a
prohibition — it becomes procedural: **the ratchet blocks every new use, and a
genuinely necessary one is approved by regenerating the baseline, which makes it
a one-line deliberate diff in review.** "Requires an explicit approving commit"
is a real enforcement level, and it sits between ratchet and hard rule.

### The trajectory (this is the point)

The instruments are not a menu, they are a **sequence**. A system in migration
and a system at rest look completely different, and mistaking one for the other
is the usual error:

```
ratchet everywhere              →  large debt, nothing else is honest
  + perimeter on user-facing    →  the part that ships is already clean
  + clean-list grows            →  finished files cannot regress
  → per-file ratchet            →  debt can no longer move sideways
  → zero baseline + exceptions  →  at rest
```

**At rest there is no baseline at all.** Debt is zero, and the only tolerated
deviations are *file-exact exceptions with a durable human reason*, reviewed in
code. A tolerated count and an excluded user-facing directory are not exceptions.

Report mode (`--report`, `--tier-report`) exists for migration work and for
generating the first baseline. It is never a permanent gate bypass; say so in the
script header, because that is exactly what it will be used as otherwise.

→ [enforcement-model.md](references/enforcement-model.md)

## 3. Scope: the import graph, not the directory

Both reference implementations converged on this independently, and it is worth
more than any individual rule.

**Roots are the product routes.** Walk their imports (static, re-export, and
dynamic `import()`) transitively. A shared module pulled in by a product route is
in scope; DevTools, CMS, admin and playgrounds are not roots and stay out.

Why not directories: a "components/" directory contains both the checkout form
and a debug panel, and enforcing them equally either blocks nothing or blocks
everything. Reachability separates *what users see* from *what exists*.

Details that decide whether this works:

- **Resolve the framework's aliases.** Path aliases (`@/…`), extensionless
  imports, and `index` barrels. A naive resolver silently walks half the graph
  and reports a clean perimeter that is clean because it is empty. **Print the
  file count** — it is the cheapest way to notice.
- **A root whose imports must not be traversed.** The app shell is user-facing
  but imports the router, which registers *every* route including the technical
  ones. Include such a file directly, without walking it.
- **A gated import is not promoted by its loader.** A dev tool lazily imported
  from the shell stays out of scope; being wired to a root is not being reachable
  in product.
- **Exclude the design system itself, and vendored UI.** The DS is authorised to
  consume tokens and raw values directly — that is its job. Backups, workers and
  generated files too.

## 4. Tiers in code

The same three-tier idea as the Figma side, expanded because code has more places
to hide. Two published contracts, in two independent repos, agree on the
dependency direction and disagree only on how many names they give it:

```
templates / routes
  → product patterns
    → context-free components          the DS proper
      → component tokens & composites
        → semantic roles
          → primitives                 the only tier that owns raw values
```

Each level may consume its own tier or the one directly below. **No upward
dependencies, no jumps to the primitive tier, no raw visual values above the
bottom.**

Two contracts that make it enforceable rather than aspirational:

- **Reachability, both directions.** Every private primitive must be consumed by
  some public token (no orphan primitives); every public token must be exposed to
  the framework or mirrored to the runtime (no orphan public tokens). Anything
  legitimately neither goes in a small named `RESERVED` map *with its reason* —
  and the guard fails if a reserved entry becomes stale.
- **A token family must be complete across every surface it is consumed from.**
  If typography exists as CSS variables but two of the six roles are missing from
  the framework's theme block, those two are unreachable from a utility class and
  someone will hardcode them. Check the product of {family × role × surface}.

→ [tier-contract.md](references/tier-contract.md)

## 5. What to enforce

The rules are stack-independent in intent and stack-specific in detection. The
universal move is to **find your framework's escape hatch** — every framework has
exactly one or two, and that is where the debt goes:

| Stack | Escape hatch |
|---|---|
| Tailwind | arbitrary values `p-[13px]`, `text-[#abc]`; nominal palette `bg-blue-500` |
| CSS / CSS Modules | a literal in any visual declaration |
| CSS-in-JS | a literal in the template; the `style` prop |
| MUI | `sx` literals; reaching into `theme.palette.x[500]` |
| SwiftUI | `Color(red:…)`, `.font(.system(size:))`, magic `padding(13)` |
| Compose / Flutter | `Color(0xFF…)`, bare `.dp` / `fontSize:` literals |

The full catalog — 20-odd rules, each with what it actually catches, its correct
instrument, and its characteristic false positive — is in
[rule-catalog.md](references/rule-catalog.md). The five that repay the effort
fastest:

1. **Raw visual literals** outside the primitive tier. The baseline rule.
2. **Tier bypass** — a component consuming a primitive directly. This is the one
   that tells you whether the architecture is real.
3. **Owned-style override** — a DS atom whose presentation the consumer largely
   replaces. One override is a tweak; overriding background, radius, size,
   weight, border and shadow at once means the atom is decoration. Count
   *presentation groups* against a per-component threshold, don't count classes.
4. **Motion literals** — durations, easings and spring physics outside named
   preset modules. Consumers import an intent, not a number.
5. **Contrast AA on token pairs**, computed from the token graph, per mode. Cheap,
   static, and the one accessibility check that never runs in a browser test
   because dark mode is rarely screenshotted.

## 6. Guards need tests, and this is not optional

A guard is a program whose failure mode is *silence*. Refactor a class name,
change a build tool, and a regex quietly matches nothing — the build stays green
and the system rots while displaying a tick.

Every rule gets **two probes: one input that must be flagged and one that must
not.** The negative probe is the important half; it is what stops a rule from
being loosened into uselessness during a fight with a false positive.

Keep the guard's own fixtures next to it, and make the exception list itself
testable — a stale exception (naming a file that no longer exists, or a reserved
token that was deleted) must fail the guard, or exception lists only ever grow.

## 7a. Installing on a new project

The cheapest enforcement you will ever install, because there is nothing to
migrate. Set `mode: "greenfield"` in the starter: **no baseline file, every
pattern hard, everywhere.**

1. **Write the token source before the first screen.** One file, three tiers,
   primitives private by naming convention (`--_ref-*`), exposed to the framework
   in exactly one place. Three tiers, not seven — see the caution below.
2. **Turn on the foundation contracts immediately.** Reachability, cycles,
   unresolved references, family completeness, scale monotonicity, contrast AA. A
   fresh token file passes all of them, so there is no cost, and they are what
   keeps it passing as it grows. **Contrast AA from day one is nearly free and
   expensive to retrofit** — it is the single highest-value item on this list.
3. **Every consumer pattern is a hard rule at zero.** Literal colours, arbitrary
   values, nominal palette classes, inline styles, numeric z-index. There is no
   debt to grandfather, so the ratchet has nothing to do.
4. **Wire it before the second commit**: pre-commit hook and CI. Installing the
   guard after a month of code means you are already doing 7b.
5. **Add rules as the structure appears.** Motion literals once a preset module
   exists; owned-style override and raw controls once there are atoms; showcase
   coverage once there is a showcase. A rule for a thing that does not exist yet
   is untested, and untested rules are how a guard silently stops working (§6).

Three cautions specific to greenfield, all of them about doing too much:

- **Do not build the full tier ladder on day one.** Primitive → semantic →
  component is enough. Domain palettes, composite tiers and page-template tiers
  earn their existence later, and inventing them early produces tokens nobody can
  safely change. Promote a decision out of a component only when **three or more**
  unrelated consumers need it.
- **Do not write rules before there is code to validate them against.** Write the
  rule and its two probes together, and run it against real files the same day.
- **The first exception is the moment to write the exception policy** — file-exact,
  grouped by rule, with a durable human reason. Deciding it under pressure, with
  one file in front of you, is how directories end up excluded.

**The transition.** The day a pattern appears that cannot be fixed now, prefer a
file-exact exception. Add a baseline only when the count is genuinely large — and
recognise that you have moved to 7b (§1).

## 7b. Installing on an existing codebase

Phases, each independently valuable — do not skip to phase 4.

1. **Measure.** Count every candidate pattern across the repo, print totals and
   per-file. Do not enforce anything yet. Half the patterns you assumed matter
   will be at zero, and one you did not expect will be at 2700.
2. **Declare the token source of truth**, one file, tiered, with primitives made
   private by naming convention. Expose it to the framework in exactly one place.
   On an existing repo this usually means *consolidating* several sources, and
   the census from phase 1 tells you which values are actually in use.
3. **Foundation contracts first** — reachability, cycles, unresolved refs,
   family completeness, contrast. These are hard rules from minute one because a
   fresh token file passes them, and they are what keeps it passing.
4. **Ratchet everything else** at its measured value. The build is green on day
   one; this is the point.
5. **Draw the perimeter.** Compute the user-facing reachable set. Move to zero
   tolerance only the patterns with an immediate correct replacement.
6. **Wire it**: `check` and `baseline` scripts, pre-commit hook, CI. A guard that
   only runs in CI is advisory.
7. **Burn debt in waves**, lowering the baseline after each. Add finished files
   to the clean-list, or move to a per-file ratchet and skip the list.
8. **Delete the baseline** when it reaches zero. That is the goal, and it is a
   deletion — see the trajectory in `enforcement-model.md`.

## 7c. The starter

**Start from the runnable starter, not from a blank file.**
[`assets/ds-guard-starter.mjs`](assets/ds-guard-starter.mjs) is a dependency-free
guard covering foundation contracts, the per-file ratchet, the perimeter, baseline
I/O and reporting. Copy it into `scripts/`, set `CONFIG.mode`, edit the rest of the
block, and run it.

```
mode: "greenfield"   every pattern hard everywhere; no baseline; --update refuses
mode: "migration"    perimeter at zero + per-file ratchet elsewhere
```

Greenfield: run it, fix what it finds, done — there should be nothing.
Migration: `--report` first, then `--update` to record the baseline, then wire
`check`.

**It needs Node 18 and nothing else** — no install step, no dependencies. Each
further capability adds exactly one package (`ts-morph` for the AST rules,
`culori` if your tokens use `oklch()`, `style-dictionary` for DTCG,
`@figma/code-connect` for parity). Hooks, CI wiring, non-JS stacks and a
verification checklist whose every step has an expected result:
→ [install.md](references/install.md)

It has been run against two real codebases in both modes. The rules that need an
AST or a framework model (tier bypass, owned-style override, motion literals, raw
controls) are deliberately left out and documented in the catalog; working code
for those, and for guard tests, is in
[guard-implementation.md](references/guard-implementation.md).

## 8. Cautions paid for in real time

- **Do not assert a literal class string in a guard.** It breaks the first time
  spacing is snapped or a scale renamed. Before updating the assertion, check
  whether the literal *is* the invariant — usually it is not (the invariant was
  "one fluid column", not `gap-6`).
- **A rule with a common false positive gets deleted, not refined.** Build the
  legitimate case into the rule from the start: a raw `<button>` carrying
  `type="submit"` or `aria-expanded` is specialised native semantics, not a
  bypassed DS atom; `<input type="range">` has no atom. Without those carve-outs
  the rule is noise and dies.
- **Downstream tokens may own composites.** A shadow, gradient or typography
  recipe legitimately lives above the primitive tier. Only a *bare* colour,
  dimension or duration is a primitive that must be promoted. Miss this and the
  raw-value rule fights the architecture.
- **Scan the pre-stylesheet bootstrap.** The inline `<style>` and splash markup
  that render before CSS loads are user-facing; running early is not an
  exemption.
- **An exception is file-exact and carries a reason.** Not a directory, not a
  count, not a ticket number. Reasons age visibly; ticket numbers do not.

## 9. Record the decisions, not just the rules

The guard enforces *what*; nothing records *why* — why a pattern is ratcheted and
its neighbour is hard, how a threshold was derived, what the numbers were before
the last cleanup.

**Derive it, do not duplicate it.** Most of the record is already in the guard:
the config is the rule list, `exceptions` and `reserved` hold their reasons as
their values, the baseline is the current debt, `--json` is the token graph. So
the constraint is: *anything that can be a commented value in the config does not
belong in a document* — prose that duplicates the config is prose that will
contradict it.

That leaves two gaps, and filling only those keeps this to about a minute of
upkeep:

1. **One markdown file** — instrument choices with the count at the time,
   how each numeric threshold was derived, and the wave log. Three short
   sections. Put it wherever the project's docs already live.
2. **An appended census** — `--log docs/ds-census.jsonl` writes one line per run.
   A metrics line is a snapshot; the series is the only thing that answers "is
   this actually improving". Run it once per release, never rewrite a past line.

Two triggers keep it alive, and there is deliberately no process beyond them: a
baseline regeneration needs a reason in the same commit, and **a new exception
needs its reason written before the config entry** — if you cannot write a
durable one, you have discovered it should be a fix.

→ [decision-log.md](references/decision-log.md)

## 10. Reference docs

| Doc | When |
|---|---|
| [install.md](references/install.md) | Prerequisites, wiring (scripts, hooks, CI), the one-package-per-capability table, non-JS stacks, verification checklist |
| [assets/ds-guard-starter.mjs](assets/ds-guard-starter.mjs) | The runnable starting point: foundation contracts, per-file ratchet, perimeter, baseline, reporting. Zero dependencies; edit `CONFIG` and go |
| [enforcement-model.md](references/enforcement-model.md) | Choosing and combining ratchet / clean-list / perimeter / hard rule; baseline semantics; the migration trajectory; exception policy |
| [tier-contract.md](references/tier-contract.md) | Tier definitions and ownership in code, dependency direction, reachability in both directions, family completeness, how to place new code |
| [rule-catalog.md](references/rule-catalog.md) | Every rule: what it catches, why it is real debt, its instrument, its false positives, and its form in other stacks |
| [decision-log.md](references/decision-log.md) | The minimum record worth keeping: what the config already documents, the one markdown file, the appended census, the two triggers |
| [guard-implementation.md](references/guard-implementation.md) | Working code: reachability walker, AST class extraction, token graph parsing, cycles, contrast AA, baseline I/O, reporting, guard tests |

**Related skills**: `figma-code-sync` for propagating any of this into Figma and
proving it landed; `figma-generate-library` for building the Figma side;
`design:accessibility-review` for the parts of accessibility a static guard
cannot reach.
