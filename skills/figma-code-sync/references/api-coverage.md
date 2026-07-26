# API surface audit — what is easy to miss

Result of checking the Plugin API index against what `figma-use` surfaces, filtered
to what matters for **maintaining** a design system. Not a list of everything the
API can do; a list of things whose absence quietly produces a wrong answer.

**Method, and the correction that produced it.** The first pass of this audit
concluded that slots were undocumented, based on `figma-use`'s SKILL.md. They are
in fact covered thoroughly in its own `component-patterns.md`. So: *check the
reference files, not the index*, and prefer grepping
`plugin-api-standalone.d.ts` — it is generated and cannot lag. Every verdict
below was checked against the reference files, and says where each thing is
already documented.

## Tier 1 — these change census results

### `figma.mixed`

A sentinel returned when a property has more than one value across the thing you
are reading: `cornerRadius` on a node with differing corners, `fontName` or
`fills` on a text node with mixed runs.

**Why it matters here:** a census that does arithmetic on it produces `NaN`; one
that guards with `typeof v === "number"` — as the recipes in
[census-recipes.md](census-recipes.md) do — silently *skips* those nodes. Both
outcomes are wrong, and the second looks like a clean result. **Count them
separately:**

```js
if (v === figma.mixed) { mixedCount++; continue }
```

A non-zero `mixed` count on a radius census usually means per-corner radii that
no token can express — a real finding, not noise.

*Documented in figma-use:* named in the API index only. Its consequences are
implicit in the text-edit recipe (which is why that recipe says to read
`getStyledTextSegments` rather than `fontName`), never stated for censuses.

### Styles are a second token carrier

A node can take its paint, text or effect from a **style** (`fillStyleId`,
`textStyleId`, `effectStyleId`) instead of a variable binding.

**Why it matters here:** every census that reads only `boundVariables` reports
those nodes as untokenised. In a file that predates variables, or that uses
effect styles for shadows — which is the *recommended* practice, since shadows
cannot be variables — that is most of the file. The number is not just wrong, it
is wrong in the pessimistic direction, which sends you fixing things that are
already correct.

Read both, and report them as separate columns: bound / styled / literal.

*Documented in figma-use:* the style APIs are covered
(`effect-style-patterns.md`, `text-style-patterns.md`, and effect styles in
`variable-patterns.md`). The census implication is not — it falls between the
two documents.

### `figma.skipInvisibleInstanceChildren`

A global flag that excludes hidden children of instances from traversal. Off by
default.

**Why it matters here:** it changes both speed and meaning. Hidden instance
children are usually *not* debt — they are the unused half of a boolean property —
so counting them inflates every per-page number. Set it deliberately and **say
which way you set it in the report**, because two censuses that disagree on this
flag are not comparable.

*Documented in figma-use:* listed in the API index, not discussed.

## Tier 2 — these change how you work

### `figma.saveVersionHistoryAsync(title, description?)`

Creates a named point in the file's version history.

**Why it matters here:** the skill's core loop is measure → change → re-measure,
and until now the "undo" half of it was the user's problem. Call this **before**
a migration wave, with the census numbers in the description. It costs one call
and turns a risky bulk edit into a revertible one.

```js
await figma.saveVersionHistoryAsync(
  "Before spacing snap — wave 3",
  "off-grid: 410 → target 0; 60 boards touched"
)
```

*Documented in figma-use:* listed under Plugin Lifecycle in the index. Never
suggested as practice, and it is the single most useful unmentioned call for this
skill's workflow.

### Dev Mode surface — `DevResourcesMixin`, `AnnotationsMixin`, `DevStatusMixin`

Three separate node-level capabilities, none covered by any `figma-use`
reference:

- **dev resources** — links from a node to source. A second, cheaper anchor
  between Figma and code alongside Code Connect: worth auditing for coverage the
  same way, and a node with neither is a node no developer can trace.
- **annotations** — structured notes attached to a node in Dev Mode. The natural
  home for the "why" that otherwise lives in a Slack thread.
- **dev status** — "ready for dev" as machine-readable state. A governance signal
  a census can read: boards marked ready that still contain detached instances
  are the interesting set.

### `PublishableMixin.getPublishStatusAsync()`

Whether a component or style is published, and whether it has unpublished
changes. **A component that is not published cannot be consumed by another
file** — so in a multi-file system this is a parity precondition that no amount
of prop comparison will reveal. Add it as a column to the parity census when the
system spans files.

### `figma.util` — `solidPaint(hex)`, `rgb()`, `rgba()`, `colorToHex()`

`figma-use` warns repeatedly about the 0–1 versus 0–255 trap but never mentions
the helpers that make the class of bug impossible. `figma.util.solidPaint("#0a6e4b")`
instead of dividing by 255 by hand; `colorToHex()` for the reverse when building
a report a human will read.

## Tier 3 — exists, relevant, lower priority

| API | Use here |
|---|---|
| `ReactionMixin.reactions` | interaction parity — prototype flows versus what the app actually does |
| `GridLayoutMixin` / `GridChildrenMixin` | Figma's CSS-grid layout; the counterpart to a code grid system, and distinct from layout grids |
| `node.exportAsync()` | the Figma-side half of asset-family parity (icon sizes, marks) |
| `variable.remote` / `ExtendedVariableCollection` | tells a local token from a library one — a census in a consumer file that reads only `getLocalVariablesAsync` reports zero |
| `figma.viewport.scrollAndZoomIntoView(nodes)` | put the reviewer's screen on the findings; cheap and makes a report actionable |

## The habit this audit is really about

Three sources, in increasing authority: the skill's index, the skill's reference
files, the generated typings. **Never conclude "the API cannot do X" from the
first.** The index is a summary written once; reference files grow past their
summaries; the typings are generated from the API itself.

```bash
grep -n "SymbolName" plugin-api-standalone.d.ts
```

One call, and it is the only one of the three that cannot be out of date.
