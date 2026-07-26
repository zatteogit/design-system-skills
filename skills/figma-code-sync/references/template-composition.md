# Building pages and templates: instances by construction, layout by token

Two failures that always arrive together, because both come from the same
pressure — drawing is one call and doing it properly is four.

1. **The page is built from raw frames** instead of instances of the components
   that already exist. It looks identical on the day it is made, and it is dead:
   no future component fix will ever reach it.
2. **The template's own layout is hardcoded** — margins, gutters, column counts,
   section rhythm, content width as bare numbers. The components inside are
   perfectly tokenised and the frame holding them is not.

Neither is caught by looking at the result. Both are cheap to prevent and
expensive to retrofit, so the whole point of this document is that the rules
apply **while building**, with a gate at the end that makes them verifiable.

`figma-generate-design` covers the assembly workflow; this adds the discipline
that makes the outcome checkable rather than aspirational.

---

# Part A — the template is a tier, and it has tokens

A page shell is not "the space around the components". It is a design-system
layer with its own decisions, and every one of them should be a variable.

## What belongs to the layout tier

| Decision | Typical token |
|---|---|
| page margin / safe area | `layout/page/margin` |
| grid columns, gutter, offset | `layout/grid/count`, `layout/grid/gutter`, `layout/grid/margin` |
| content max width | `layout/page/content-max` |
| rhythm between sections | `layout/section/gap` |
| shell dimensions — header height, sidebar width | `layout/shell/header-h`, `layout/shell/sidebar-w` |
| gap inside a section's own stack | `layout/stack/gap` |

These are **semantic tokens**, not primitives: they say *page margin*, not
*space/24*. They alias primitives, exactly like colour semantics, and they are
the tokens that most often get skipped because a number typed into a padding
field feels like layout rather than design.

**They are the natural home of the breakpoint modes.** A margin that is 16 on
mobile and 64 on desktop is one token with two mode values — not two boards with
different numbers typed in. This is where a breakpoint collection stops being
bookkeeping and starts paying: set the mode on the board, and margins, gutters,
column counts and section rhythm all resolve at once. See §7 of `SKILL.md` for
the threshold-versus-canvas-width distinction, and `token-architecture.md` for
why the breakpoint axis belongs in its own collection.

## Binding the frame's own layout

Same rule as any component: **no literal numbers on a template frame.**

```js
board.setBoundVariable("paddingLeft",  vars["layout/page/margin"])
board.setBoundVariable("paddingRight", vars["layout/page/margin"])
board.setBoundVariable("itemSpacing",  vars["layout/section/gap"])
board.setBoundVariable("maxWidth",     vars["layout/page/content-max"])
```

`maxWidth` binds fine on a **main component or a plain frame**; on an *instance*
it silently does nothing (§6 of `SKILL.md`). Template boards are usually frames,
so this works — but if your shell is an instance, the binding belongs on its main
component.

## Binding the layout grid

Less known, and it is the piece that makes "the grid is a token" literally true
rather than a convention. Bindable fields are `sectionSize`, `count`, `offset`
and `gutterSize` — with restrictions that depend on alignment:

| Pattern / alignment | Bindable |
|---|---|
| `ROWS`/`COLUMNS` + `MIN` or `MAX` | all four |
| `ROWS`/`COLUMNS` + `CENTER` | all except `offset` |
| `ROWS`/`COLUMNS` + `STRETCH` | all except `sectionSize` |
| `GRID` | `sectionSize` only |

`layoutGrids` is a **read-only array** — the same trap as `fills`. Clone, bind,
reassign:

```js
const grid = { ...board.layoutGrids[0] }          // clone: the array is read-only
let bound = figma.variables.setBoundVariableForLayoutGrid(grid, "count",      vars["layout/grid/count"])
bound     = figma.variables.setBoundVariableForLayoutGrid(bound, "gutterSize", vars["layout/grid/gutter"])
bound     = figma.variables.setBoundVariableForLayoutGrid(bound, "offset",     vars["layout/grid/margin"])
board.layoutGrids = [bound]                        // reassign the whole array
```

Treat the return value as a **new object you must capture**, as with
`setBoundVariableForPaint` and `setBoundVariableForEffect`. Verify once by
reading `board.layoutGrids[0].boundVariables` back after the call — if the
binding is absent, you discarded the return value.

A `STRETCH` column grid with bound `count` and `gutterSize` is the Figma
expression of a fluid CSS grid, and it is what makes a breakpoint mode actually
reflow the board instead of just relabelling it.

---

# Part B — assembly: instances by construction

The rule is simple and the discipline is in refusing to start without step 0.

## Step 0 — inventory first. No inventory, no assembly.

You cannot use components you do not know exist, and this is the actual cause of
most raw-frame pages. Build the lookup **before creating a single node**:

```js
figma.skipInvisibleInstanceChildren = true
const page = await figma.getNodeByIdAsync(LIBRARY_PAGE_ID)
await figma.setCurrentPageAsync(page)
const out = {}
for (const n of page.findAllWithCriteria({ types: ["COMPONENT_SET", "COMPONENT"] })) {
  if (n.type === "COMPONENT" && n.parent?.type === "COMPONENT_SET") continue
  out[n.name] = {
    id: n.id,
    variants: n.type === "COMPONENT_SET" ? n.children.map(c => c.name) : null,
    props: Object.keys(n.componentPropertyDefinitions ?? {}),
  }
}
return out
```

Also check `search_design_system` for published library components — a file can
consume components it does not contain, and those are invisible to a page scan.

## Step 1 — map regions to components on paper, before building

Write the plan out and keep it. One line per region:

```
header      → Shell/AppBar          Type=Compact          title="Recipes"
filter row  → Filter/Chip           ×4, State=Default
card grid   → Card/Recipe           ×6, slot: media
empty state → Feedback/EmptyState   Variant=NoResults
footer      → — no component —      DECISION NEEDED
```

**Every "no component" line is a decision, not a licence to draw.** There are
exactly three legitimate resolutions, and "I'll just make a frame" is not one of
them:

- **promote** — build the component first, then instance it (right whenever the
  thing will appear more than once);
- **extend** — the component nearly fits, so add the variant or property it is
  missing (right when you are tempted to detach);
- **declare one-off** — genuinely unique to this board; name it `_oneoff/…` so
  the gate in Part D can tell it from an accident.

## Step 2 — assemble from instances only

```js
const main = await figma.getNodeByIdAsync(COMPONENT_ID)
const inst = (main.type === "COMPONENT_SET" ? main.defaultVariant : main).createInstance()
inst.setProperties({ "Type": "Compact", "Title#2:0": "Recipes" })
section.appendChild(inst)
inst.layoutSizingHorizontal = "FILL"      // AFTER appendChild — see figma-use rule 12
```

Three mechanics that prevent the usual reach for a detach:

- **Text goes through `setProperties`**, never `characters`, whenever the text is
  a component property. Read `instance.componentProperties` first; the property
  system will otherwise overwrite a direct edit on render.
- **Size with `FILL`/`HUG`**, not `resize()`. Resizing an instance to fit is the
  step immediately before detaching it.
- **Creating an instance resets paint overrides** — recheck colours after every
  swap, and prefer fixing the main component over re-overriding.

## Step 3 — wrappers are the only legitimate raw frames

A page needs containers: a section stack, a two-column split, a scroll area.
Those are auto-layout frames with no paint of their own, and they are fine.
**A raw frame that renders something — a fill, a stroke, a shadow, text — is the
finding.** That distinction is what Part D encodes.

---

# Part C — why it fails, and the counter-move

Honest list. Each excuse is reasonable in the moment and wrong by the next sprint.

| In the moment | What it costs | Counter-move |
|---|---|---|
| "I didn't know a component existed" | a duplicate that diverges immediately | step 0, always — it is one read call |
| "the component almost fits" | a detached copy that no fix reaches | extend the component; the second consumer justifies it |
| "I need different text" | overrides that the property system may discard | `setProperties`, after reading `componentProperties` |
| "it needs to be wider" | resize → detach, in two steps | `FILL`/`HUG`, or a size variant |
| "it's faster to draw it" | true today, and the board opts out of the system forever | the gate below makes the cost visible the same day |
| "the spacing here is special" | a literal that survives every future token change | if it is really special it is a token nobody has named yet |

The through-line: **every shortcut converts a live board into a picture.** A
picture is not wrong, it is *inert* — and inert boards are exactly what makes a
design system feel like it is not working, because the fixes land and nothing
changes.

---

# Part D — the acceptance gate

Run it on the board you just built, before saying it is done. It answers one
question: is this board wired into the system, or is it a drawing?

**"A raw frame that renders something is the finding" is too blunt — do not
implement it literally.** Taken literally it fires on every grid row and
breakpoint container that carries a background (`row`, `md`, `sm`,
`section-wrapper`), and a clean board comes back full of false positives. A
section container with a background is normal; it is not a hand-drawn shape.

The distinction that works is **leaf versus container**:

```js
figma.skipInvisibleInstanceChildren = true
const board = await figma.getNodeByIdAsync(BOARD_ID)

const safe = (fn, d = null) => { try { return fn() } catch { return d } }
const vis = a => Array.isArray(a) && a.some(x => x && x.visible !== false)
const paints  = n => safe(() => vis(n.fills) || vis(n.strokes) || vis(n.effects), false)
const bound   = n => safe(() => Array.isArray(n.boundVariables?.fills) && n.boundVariables.fills.length > 0, false)
const hasKids = n => safe(() => Array.isArray(n.children) && n.children.length > 0, false)
// `.parent` can throw — guard every hop and cap the depth.
const insideInstance = n => {
  let c = n
  for (let i = 0; i < 60; i++) {
    const p = safe(() => c.parent); if (!p) return false
    const t = safe(() => p.type); if (!t || t === "PAGE" || t === "DOCUMENT") return false
    if (t === "INSTANCE") return true
    c = p
  }
  return false
}

const r = { instances: 0, plainWrappers: 0, surfaceContainers: 0,
            surfaceUnbound: [], rawMarks: [], rawText: 0, oneoffs: 0, unboundLayout: [] }
for (const n of board.findAll(() => true)) {
  const t = safe(() => n.type); if (!t) continue
  if (t === "INSTANCE") { r.instances++; continue }
  if (insideInstance(n)) continue                    // instance internals are not findings
  if (n.name.startsWith("_oneoff/")) { r.oneoffs++; continue }
  if (t === "TEXT") { r.rawText++; continue }        // page copy — reported separately
  if (hasKids(n)) {
    if (!paints(n)) { r.plainWrappers++; continue }  // pure structure
    r.surfaceContainers++                            // container WITH a background: legitimate…
    if (!bound(n) && r.surfaceUnbound.length < 10) r.surfaceUnbound.push(n.name)  // …but the fill must be a token
    continue
  }
  if (paints(n) && r.rawMarks.length < 20) r.rawMarks.push(`${t}:${n.name}`)      // leaf that renders
}

const bv = safe(() => board.boundVariables, {}) || {}
for (const p of ["paddingLeft","paddingRight","paddingTop","paddingBottom","itemSpacing"]) {
  const v = safe(() => board[p])
  if (typeof v === "number" && v !== 0 && !bv[p]) r.unboundLayout.push(`${p}=${v}`)
}
for (const g of (safe(() => board.layoutGrids, []) || []))
  if (!g.boundVariables || !Object.keys(g.boundVariables).length) r.unboundLayout.push(`grid:${g.pattern}`)

return r
```

**Reading it:**

- **`rawMarks` is the list to fix.** A leaf that renders and belongs to no
  component: a rectangle, an ellipse, a vector drawn by hand. On the real run
  this isolated 17 items on one board — `Rectangle 1`, `Rectangle 2`,
  `separator` — while three sibling template boards came back at **zero**. The
  default Figma name is the tell: nobody names a deliberate shape `Rectangle 2`.
- **`surfaceUnbound` is the subtler finding.** These containers are legitimate,
  but their background is a literal instead of a token, so they will not follow a
  theme or a breakpoint mode. Eight frames named `row` on the real board.
- **`rawText` is reported, not judged.** A template legitimately contains copy;
  a spike relative to sibling boards is what matters (6, 6, 6 on the templates
  versus 36 on the modal).
- `unboundLayout` is Part A's failure, itemised. A non-empty list means the shell
  will not follow a breakpoint mode or a token change.
- `instances` versus `plainWrappers` is the health ratio. Many wrappers is fine —
  that is structure.
- `oneoffs` should be small and each one defensible. A board with nine is a board
  that needed components nobody built.

**Compare sibling boards, not absolute numbers.** When four sibling boards report
zero raw leaves and the fifth reports seventeen, the fifth *is* the report. A
threshold would need tuning and would tell you less.

**Make it a precondition, not a report.** Run it before declaring a board done,
and treat a non-empty `rawLeaves` the way a failing test is treated: fix it, or
say out loud why this one is an exception. The census in
[census-recipes.md](census-recipes.md) is the same measurement applied to a whole
file later — but by then the raw frames are someone else's problem, which is
precisely how they survive.
