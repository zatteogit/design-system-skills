---
name: figma-code-sync
description: Keep an existing Figma design system aligned with the codebase as the code changes over time — propagating token, spacing, icon, colour or breakpoint changes into Figma and proving nothing broke. Use when code and Figma have drifted, when a design-system change in code must reach Figma (or the reverse), when auditing a Figma file against the code that ships, when deciding between variable modes and component variants, when a per-instance fix in Figma "succeeds" but nothing changes on canvas, when checking whether a Figma component's variants and props still match the code component, when checking contrast on token pairs inside the Figma file, when a Figma page or template is built from raw frames instead of component instances, when deciding which tier a component belongs to or in what order to build a component library, when a template's grid, margins or spacing need to come from tokens, or when building a DTCG token pipeline so the two sides cannot diverge. Complements figma-generate-library (which builds a system once) and design-system-code (the code-side enforcement); this one is about maintaining the alignment.
---

# Figma ⇄ code sync

`figma-generate-library` teaches how to **build** a design system in Figma from a
codebase. This skill is about the part after that: the code keeps changing, and
Figma has to follow without silently rotting.

**Requires the Figma MCP server**, which is what provides `use_figma`,
`get_metadata`, `get_code_connect_map` and the rest. That server also ships its
own guidance — `figma-use` for the Plugin API mechanics, `figma-generate-library`
for building a system, `figma-code-connect` for the mapping — served as MCP
resources, so any MCP-capable agent can load them. **Load `figma-use` too**: this
skill assumes its mechanics and adds only what it does not cover.

## 0. The premise: code is the source of truth

Figma is a *representation* of the system, not a second original. Not because
design matters less — because code is what ships. Two consequences that decide
almost every judgement call below:

- When code and Figma disagree, **read the code and fix Figma**, unless the code
  is what's wrong — in which case fix the code first and let Figma follow.
- **Treat token changes like code changes**: versioned, reviewed, documented.

Drift does not arrive through malice. It arrives through detaching, overriding
and one-off fixes made under time pressure. Governance documents do not stop it;
ratchets and censuses do — make the right way the path of least resistance.

## 1. Never edit blind: measure → change → re-measure

The one practice that makes the rest work. Every change gets a number before and
after, so "it looks fine" is never the evidence.

0. **Read the code's token source first** — which framework, which version, where
   the values live, and crucially **which values are legal-but-unlisted**. A
   multiplier-based scale (Tailwind, MUI) has infinitely many valid steps, so a
   value missing from the token list is not automatically debt.
   → [framework-map.md](references/framework-map.md)
1. **Census** what you are about to change, in Figma *and* in code. Counts, not
   impressions. Do not write the script from scratch —
   [assets/figma-census.js](assets/figma-census.js) is the whole read-only suite
   in one file, and every guard in it is there because it failed against a real
   file first.
2. **Change** the smallest unit that propagates furthest (§2).
3. **Re-census** identically. The delta is the report.
4. **Prove nothing broke** with a geometry signature
   ([verification.md](references/verification.md)), not a glance at a screenshot.

Write the census script first; you will run it at least twice.

> **If a fix "worked" but the census does not move, the fix did not land.**
> Believe the census. This is how silent no-ops get caught (§6).

And the rule that protects the census itself:

> **A check that cannot run must report, not skip.** If a comparison is missing an
> input — the token is absent from the snapshot, the value will not resolve, the
> name is not in the map — emit a finding. A bare `continue` on missing data makes
> the check *indistinguishable from a check that passes*.

This is the single most common way a guard dies, and it does not look like
failure. Three instances in one session on the same file: a `.dark` block
extracted by a loose `indexOf` (so every dark-mode contract silently re-validated
light, for 13 days); self-test scripts declared in `package.json` but never
implemented, with a green CI step over them; and — in a drift guard written that
same afternoon *by the author of the first two findings* — five comparisons that
looked up `tracking/*` where the snapshot had `type/tracking/*`, got `undefined`,
and `continue`d. It printed "no drift" with zero coverage on that axis.

Only mutation testing finds these: **change the input so the check must fail, and
watch it fail.** A probe you have never seen go red is not evidence. The asset
already practises the discipline in `dtcg` mode (`refusals`) and in the scale
checks (`skipped: "names carry no ordinal…"`) — copy that shape everywhere.

**Validate the census against a second, independent method before trusting it to
drive a large change.** Compute at least one number two ways: the real guard
against your model of it, the browser's computed styles against your CSS parser,
a mutation against an assertion. In the session above every wrong number was
caught by a cross-check and none by re-reading the code.

## 2. Where to intervene — three rules, in order

Getting the *level* right is worth more than any amount of scripting. All three
say the same thing: act at the smallest place that governs the most.

**Source before instances.** Fix the component, not its instances. Instances
inherit whatever they have not overridden, so the template pages often correct
themselves for free. Measure them *after* the components are clean, or you will
do the work twice.

**Lowest tier that governs.** Fix the icon, not the twelve buttons containing
it. The special case worth naming: if a component set has N variants differing
only in which child is in a different state, the variant axis is at the wrong
level — put the variant on the child (`State=Default|Active`) and keep **one**
parent holding instances. N near-identical shells drift; one does not. The full
ladder is §3.

**Mode before slot before variant.** Three mechanisms, three kinds of difference.
Picking the wrong one is the usual cause of variant explosion.

| The difference is | Use | Cost |
|---|---|---|
| a **value** — width, gap, cap, colour, visibility | **mode** | set one on a frame; everything inside resolves |
| the **content placed inside** — arbitrary children | **slot** | per-instance, no new component |
| the **structure** — different layout direction, a node present in one form and not the other | **variant** | swapped instance by instance; creating an instance resets paint overrides |

Read them in that order. Before adding a variant axis, ask whether the variants
differ only in *what is inside them* — that is a slot, and modelling it as a
variant produces a component set that multiplies and still cannot express the
case nobody anticipated. Reach for a variant only when neither of the other two
can express it.

**Slots are fully supported by the Plugin API**, and `figma-use` documents them
in `component-patterns.md` — but its SKILL.md index does not list them, so an
agent that trusts the index concludes they do not exist. See
[slots.md](references/slots.md) for the decision hierarchy, the constraints that
do not enforce themselves, and the slot ⇄ `children` parity mapping.

## 3. Components have tiers too, and there are more than three

Tokens have tiers; so do components, because **components consume each other** —
an icon button consumes an icon, a field consumes a label and an input, a card
consumes a field and a button.

The tier is defined by **what a component may consume**, not by how atomic it
feels. That replaces an argument ("is a search field a molecule?") with a test:

```
0 Elements → 1 Atoms → 2 Composites → 3 Patterns → 4 Templates
```

> A component may instance components of its own tier or below. **Never above.**
> Within a tier, the dependency graph must be **acyclic**.

Same-tier consumption is legitimate — that is the "atoms consume atoms" case —
and acyclicity is what stops it from meaning "no rule at all".

**Two ladders, not one.** Components and tokens are independent and meet at one
point: a component consumes component-tier or semantic tokens, never primitives.
A file can be perfectly tiered on one ladder and flat on the other; measure both.

Figma has no tier field, so **mark it with pages** (`1 Atoms`, `2 Composites`, …)
— the convention is load-bearing, because a tier you cannot classify is a tier
you cannot enforce. The census that reads it builds the component dependency
graph and reports upward nesting, cycles, orphans and the fan-in distribution.
**Read fan-in first**: if nothing has high fan-in, the atoms are not being
consumed and the ladder exists only on paper.

**The graph must be merged across every page before any of it means anything**,
and there are **two kinds of in-edge**: a component consumed by another component
(a graph edge) and a component placed directly on a page (no owning component, so
no edge at all). A template page yields *zero* edges and thousands of the second
kind. Count only the first and the entire library reports as orphaned. Run
`CENSUS="graph"` on every page and merge with
[assets/merge-component-graph.mjs](assets/merge-component-graph.mjs), which
refuses to compute orphans from a single page.
→ [component-tiers.md](references/component-tiers.md)

## 4. Building pages and templates

Two failures that always arrive together, because both come from the same
pressure — drawing is one call, doing it properly is four.

**Everything with a component must be an instance of it.** A page of raw frames
looks identical the day it is made and is inert: no future fix reaches it. The
cause is usually not laziness at assembly time but **building top-down** — when
the atom does not exist at the moment you need it, drawing it is the only option.
So build bottom-up (§3), and start every assembly with a component inventory: you
cannot use what you do not know exists.

Frames that only hold structure — a section stack, a two-column split — are
fine. **A raw frame that renders something (fill, stroke, shadow, text) is the
finding.**

**The template's own layout is a token layer.** Page margin, gutters, column
count, content max-width, section rhythm, header height — all semantic tokens,
all driven by the breakpoint modes, and all routinely typed in as bare numbers
while the components inside are perfectly tokenised. Figma layout grids *are*
bindable (`count`, `gutterSize`, `offset`, `sectionSize`), which is what makes
"the grid is a token" literal rather than a convention.

Close with an acceptance gate rather than a report: run the classifier before
declaring a board done, and treat a non-empty raw-leaf list the way you would a
failing test. → [template-composition.md](references/template-composition.md)

## 5. Tokens — the short version

Full detail in [token-architecture.md](references/token-architecture.md). The
headlines:

- **Three tiers**: primitive → semantic → component. Component tokens reference
  semantic ones, never primitives. Semantic tokens reference primitives
  **directly — do not chain aliases**.
- **A tier is only real if nothing skips it.** Count direct bindings from nodes
  to the primitive collection. Make primitives private (prefix the Figma
  collection with `.` or `_`), scope everything, never `ALL_SCOPES`.
- **Name for what it does, not what it is.** `color/brand/green` fails the moment
  the brand turns blue. Ordinal names (`radius/sm`, `space/2`) are primitives, not
  semantics — do not promote them for reading like design words.
- **Primitives are absolute; the theme lives in the semantic tier.** A primitive
  whose value changes per theme is the anti-pattern.
- **Theme ≠ mode**, and they are orthogonal. **Figma mode limits are
  plan-dependent** (Free 1, Professional 4, Enterprise 40+) — split orthogonal
  axes into separate collections rather than multiplying modes in one.
- **`$description` is part of the token.** An undocumented token is a token
  someone will duplicate.
- **Typography and motion need the semantic tier too.** Both normally end up as
  primitives consumed directly (`text-sm`, `duration-200`), which leaves the
  system with semantics for colour and ordinals for everything else. Roles, not
  sizes; interaction intent, not curves. And **a Figma text style has no modes** —
  the distinction between styles and variables is a chapter of its own.

## 6. API traps that cost real time

Not in `figma-use` or `figma-generate-library`. The first is the worst: the other
skills document the call as if it always works.

| Trap | What actually happens |
|---|---|
| **`maxWidth`/`minWidth` on an instance** | Cannot be overridden. `setBoundVariable("maxWidth", v)` **returns success and leaves `maxWidth: null`.** Silent no-op — fix the main component. |
| **`letterSpacing` on TEXT** | `boundVariables.letterSpacing` is an **ARRAY**, and `setBoundVariable` **appends to it instead of replacing**. The authoritative binding is the per-**range** one: the call succeeds, the segment keeps pointing at the old variable, and the node ends up with two entries. Use `setRangeBoundVariable(0, node.characters.length, "letterSpacing", v)`, which replaces the segment *and* collapses the array. Repointing 537 nodes the wrong way produced 537 duplicates that read as "success". |
| `fills`/`strokes` binding | `node.setBoundVariable("fills", v)` throws; bindings go on the *paint*: `figma.variables.setBoundVariableForPaint(paint, "color", v)` returns a **new** paint you must reassign. |
| Bound paints and tint | A bound paint carries the variable's colour, so it cannot also carry an opacity tint. Move alpha to the node's `opacity` (only if it has no children) or use a gradient with alpha in the stops. |
| Creating an instance | Resets paint overrides. Re-check colours after every swap. |
| **Reading back anything you just mutated** | State read in the *same* call that wrote it is unreliable — this is not only `resize()`. Inner layout is not recomputed after a resize, and `boundVariables` after a repoint reports partially-stale entries: an in-call check said "537 left", a separate call over the same nodes found 0, and **both were wrong**. **Mutate in one call, verify in the next.** A verification sharing a call with its mutation is not evidence. |
| `FILL` in a horizontal multi-child parent | Distributes *remaining* space among FILL children — a row can collapse to a fraction of the parent. Worst inside a wrap container. |
| `FILL` on text in a tight parent | Squeezes it to one character per line. Constrain the container; let the text reflow. |
| `resize()` on a VECTOR after `vectorPaths` | Stretches the geometry. Size the node first, then set paths. |
| Removing nodes from an instance | Impossible — hide them (`visible = false`). Visibility is bindable to a boolean, which is how variable-length content is done properly. |
| Slot constraints | `minChildren`/`maxChildren`/`allowPreferredValuesOnly` **never throw and never block an edit** — a violation is only reported in `slot.limitViolations`. Census them or they are decoration. |
| `slot.clone()` | Returns a **`FrameNode`**, not a `SlotNode` — a slot only means something inside its parent component. Cloning a subtree silently loses its slot-ness. |
| Setting slot content | `instance.setProperties({[slotKey]: …})` **throws**. Slot content is set by appending children to the `SLOT` node, not through the property system. |
| Walking up with `.parent` | The getter **throws** on some nodes (`get_parent: Unknown node type`) rather than returning null — so `while (p && p.type !== "PAGE")` does not protect you, because it evaluates `p.parent` first. Wrap every hop in its own `try` and cap the depth. Hit on the first run against a real file. |
| `get_metadata` with no `nodeId` | Documented as listing "the top-level pages of the document". On a 14-page file it returned **one**. Get the page list from `use_figma` (`figma.root.children`) before fanning out, or the fan-out silently covers a fraction of the file — and a merged graph built on a fraction reports orphans that are not. |
| "The API doesn't support X" | Never conclude that from a skill's index. Slots are absent from `figma-use`'s SKILL.md yet fully documented in its own `component-patterns.md`. Open the reference, or grep `plugin-api-standalone.d.ts` — it is generated, so it cannot lag. |

## 7. Breakpoints: two numbers, not one

A responsive mode carries two values that are easy to conflate:

- **the framework threshold** — the media query the mode represents (Tailwind
  `md` = 768). This is the *contract with the code*; if the code's breakpoints
  change, it must follow. Give it **empty scopes**: it is a contract value, not a
  dimension, and must never reach a width picker.
- **the canvas width** — the width the board is drawn at, chosen for realistic
  prototyping (390, 1440…). Free to change; means nothing to the code.

They coincide at some breakpoints by accident, which is exactly why the confusion
survives. Name them distinctly.

**Find the breakpoint that matters by reading the code, not by inferring it from
existing boards.** A sidebar that is `fixed lg:static` switches at `lg`, so a 768
board with a static sidebar shows a state the app never renders. Verify at the
boundary: measure at threshold−1 and threshold.

**A breakpoint name is not a width, and it differs per framework.** 768px is `md`
in Tailwind and Bootstrap but still `sm` in MUI; Bootstrap's `lg` is 992 while
Tailwind's is 1024. Never name a board after a device. See
[framework-map.md](references/framework-map.md).

## 8. Reflow: what to fix and what to leave

After a spacing or sizing change, fixed-height containers overflow.

- **It cascades in levels.** Inner containers grow first, then the frames holding
  them. One refit pass is never enough; loop until stable.
- **Not every overflow is a bug.** A deliberately clipped instance —
  `clipsContent` used to show only a slice of a component — looks identical to an
  overflow, and "fixing" it reveals content hidden on purpose. Suspect any
  container needing to be several times taller, and look before resizing.

## 9. Component parity: the drift you are blind to

Token and geometry drift are measurable. *"Does the Figma Button have the same
variants and props as the code Button?"* usually is not — and it is a whole
category of divergence where both sides look fine in isolation.

Four censuses, run together because they explain each other: property parity,
**override rate** (a field overridden on most instances is a missing variant),
detached instances, and the instance-to-raw-frame ratio per board. Code Connect
is what makes the join exact instead of name-guessing.

**Check for mappings before writing the report, and expect none.**
`get_code_connect_map` is per node, so feed it the `declaredIds` from
`CENSUS="graph"`. On a production library in use since 2024 it returned `{}` —
so every parity finding there is name-matched, and the report has to say so.

The one to run first is the override census. It turns "the design system feels
rigid" into a list. → [component-parity.md](references/component-parity.md)

**And the sibling of the detached instance: the deleted-but-still-bound
variable.** A deleted variable keeps resolving by id for as long as something
references it, while being absent from `getLocalVariablesAsync()` *and* from every
`collection.variableIds`. So it is reachable from **no picker** — nobody can find
it, retarget it or notice it — and nothing on canvas looks wrong. It is strictly
worse than a detached instance, and it is invisible to the obvious question:
asking only "is this id local?" files it under *remote*, the bucket you skim past.

`CENSUS="page"` now reports `bindingTargets`, which separates **local / remote /
deleted-still-bound / dangling** and follows the alias chains — because a deleted
variable usually aliases another deleted one, and recreating only the layer the
nodes touch fixes nothing. Measured on a production library: **1.796 live
bindings onto 16 deleted variables across three layers**, one carrying the
`letterSpacing` of 539 text nodes.

Recovering them is usually the right call rather than rebinding away, because they
encode intent nothing else in the file expresses (control heights, state opacity).
Do it **before** any large repointing pass, or you repoint the same nodes twice.

## 10. Accessibility, on both sides

Contrast is typically verified in code and **never in the Figma file** — which is
backwards, since Figma is where the pair is chosen. Checking it there costs
seconds and moves the finding from "design conversation" to "typo".

- Declare the background/foreground pairs **once** and feed the same list to both
  checkers; **diff the two lists in CI**, or one side is quietly checking fewer.
- Check every mode. Light passes and dark fails is the usual shape.
- An unresolved pair is a finding, not a skip. An alpha surface is *not
  statically verifiable* — report it rather than producing a confident number.
- The alpha-surface trap (`bg-primary/10` + `text-primary`) defeats every
  checker on both sides. The fix is a real container pair — and in Figma the
  workaround exists because a bound paint cannot also carry a tint (§6).

Behaviour — focus, keyboard, names and roles, reduced motion — needs a browser
pass; `design:accessibility-review` covers it.
→ [accessibility.md](references/accessibility.md)

## 11. From detecting drift to preventing it

Everything above *detects* divergence. A token pipeline *prevents* it: one
generated DTCG file, applied into Figma, and a CI step that regenerates and
diffs. That is the step that turns "aligned today" into "cannot diverge".

Before building it, enumerate what the round-trip loses — Figma floats carry no
unit, DTCG has no mode concept, composites are styles rather than variables — and
decide per line whether to record it or refuse it. **Refuse rather than
approximate.** → [dtcg-pipeline.md](references/dtcg-pipeline.md)

Two of the three programs ship here and run today, before any pipeline exists:
`CENSUS="dtcg"` is the audit read (Figma → DTCG, one mode per run, refusing the
cross-file aliases DTCG cannot express) and
[assets/dtcg-verify.mjs](assets/dtcg-verify.mjs) is the gate. Only `apply` is
per-project, because it writes to a specific file.

**Run the verify before building anything else** — it takes a minute and it tells
you which class you are in. It also **indexes by value, not only by name**, which
is the only way to see the two classes a name diff is blind to: a shared value
under different words, and an ordinal that means different things on each side.
On a real pair it reported `ultramarine-blue/25 ≡ $color_primary_20` and 19 more,
while the name diff reported zero matches at all.

## 12. Keeping the code side from regressing

Propagating a change once is worth little if the debt regrows on the code side.
That is a skill of its own — **`design-system-code`** — covering token tiers in
code, the ratchet/perimeter/clean-list/hard-rule model, and the guards that
enforce them. Three things worth knowing from here:

- **Do not put a large legacy pattern in a zero-tolerance perimeter.** Zero
  tolerance is for things with an immediate correct replacement; everything else
  goes on a ratchet, or the build is red and the guard gets disabled.
- **A guard asserting a literal class string will break** when you snap spacing
  or rename a scale. Fix the assertion only after checking whether the literal
  *is* the invariant — often it is not.
- **Count detached instances.** They are the main drift vector and the easiest to
  miss, because nothing about them looks wrong.
- **Count deleted-but-still-bound variables**, which are the sibling and are
  worse. A deleted variable still resolves by id and stays bound to every node
  that used it, while being absent from `getLocalVariablesAsync()` *and* from
  every `collection.variableIds` — so no picker can reach it and nobody can fix
  it by accident. Ask `collection.variableIds` for membership, not the local
  variable list: the two answer different questions, and conflating them files a
  live finding under "remote library", where nobody reads it.
  `figma-census.js` reports these as `variableHealth.deletedStillBound`.

## 13. Reference docs

| Doc | When |
|---|---|
| [assets/figma-census.js](assets/figma-census.js) | **Start here for any audit.** One read-only script, five modes (`file` / `page` / `graph` / `board` / `dtcg`), carrying every fix in this skill. Paste into `use_figma`, set `CENSUS` and `PAGE_ID`, run |
| [assets/merge-component-graph.mjs](assets/merge-component-graph.mjs) | After running `CENSUS="graph"` on **every** page. Unions the per-page graphs, then reports orphans, ghost mains, cycles and upward nesting — none of which mean anything per page. Node, no dependencies |
| [assets/dtcg-verify.mjs](assets/dtcg-verify.mjs) | The pipeline's CI gate. Diffs a DTCG export against the code's own token file (`.json` / `.scss` / `.css`) and separates the four divergence classes. Node, no dependencies |
| [component-tiers.md](references/component-tiers.md) | The component ladder, the consume-only-downward rule, tier marking, bottom-up creation order, the dependency-graph census, parity with the code ladder |
| [template-composition.md](references/template-composition.md) | The layout token tier, binding layout grids to variables, the assembly procedure that yields instances, why it fails, the acceptance gate |
| [framework-map.md](references/framework-map.md) | Where tokens live per framework (Tailwind v3/v4, Bootstrap, MUI, plain CSS, CSS-in-JS), the breakpoint cross-reference, and each one's characteristic friction with Figma |
| [token-architecture.md](references/token-architecture.md) | Tiers, the naming taxonomy, theming, typography and motion semantics, text styles vs variables, Figma plan limits, DTCG conformance, governance |
| [verification.md](references/verification.md) | Geometry-signature probes, before/after via stash, overflow and clipping detection, proving a zero-shift refactor |
| [census-recipes.md](references/census-recipes.md) | Ready-made read-only `use_figma` scripts: off-grid spacing, tier-skipping bindings, detached instances, token inventory, shell audit |
| [component-parity.md](references/component-parity.md) | Variant/prop parity, the override census, detached-instance and instance:frame ratios, reading the combined report |
| [slots.md](references/slots.md) | Mode vs slot vs variant, `SlotSettings` and its non-enforcing constraints, the slot ⇄ `children` parity mapping |
| [benchmarks.md](references/benchmarks.md) | Measured numbers from real files — the official Material 3 kit, a stale community fork, a production system — to situate a census result instead of guessing |
| [api-coverage.md](references/api-coverage.md) | Audit of the Plugin API against what `figma-use` surfaces: `figma.mixed`, styles as a second token carrier, `skipInvisibleInstanceChildren`, version checkpoints, the Dev Mode surface, publish status |
| [accessibility.md](references/accessibility.md) | Contrast on token pairs in Figma per mode, the alpha-surface trap, target size, what static checking cannot reach |
| [dtcg-pipeline.md](references/dtcg-pipeline.md) | Generate / apply / verify, the lossy mappings to decide up front, composites, build-vs-buy |

**Related skills**: `design-system-code` for the code side of the same contract;
`figma-generate-library` for building the Figma system; `figma-use` for Plugin
API mechanics; `figma-code-connect` for the mapping that makes parity exact.
