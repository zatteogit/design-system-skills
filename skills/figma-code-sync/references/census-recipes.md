# Census recipes

Read-only `use_figma` scripts. Run each **before and after** a change; the delta
is the report. All of them take a page id — get it first with a discovery call,
and remember `setCurrentPageAsync` at most once per script (fan out across pages
in parallel calls instead).

## First: what is this file's role?

**In a consumer file, every `getLocal*Async()` returns an empty array — and the
file can still be 89% tokenised.** This is the single easiest way to produce a
confidently wrong report: the file returns `totalVariables: 0` and every style
count at zero, while its nodes carry overwhelmingly more bound fills than
literals — every bound variable resolving to a *remote* one.

Run this before any token census and branch on the answer:

```js
const localVars = (await figma.variables.getLocalVariablesAsync()).length
// sample some nodes to see whether anything is bound at all
let bound = 0, literal = 0
for (const n of figma.currentPage.findAll(() => true)) {
  const f = (() => { try { return n.fills } catch { return null } })()
  if (!Array.isArray(f) || !f.some(x => x && x.visible !== false)) continue
  const b = (() => { try { return n.boundVariables?.fills } catch { return null } })()
  if (Array.isArray(b) && b.length) bound++; else literal++
}
return { localVars, bound, literal }
```

| `localVars` | `bound` | Role | How to census it |
|---|---|---|---|
| many | any | **library / source of truth** | the recipes below, as written |
| 0 | many | **consumer** | ignore the local APIs entirely; read bindings off the nodes and resolve each id with `getVariableByIdAsync`, checking `variable.remote` |
| 0 | 0 | **not tokenised**, or you are on the wrong page | look before concluding |

A three-file design system — tokens, components, assets — has one file of the
first kind and two of the second. Reporting "no tokens" for the second two is not
a finding, it is a misread.

## Three things that make a census lie

Read these before trusting any number below. Each one produces a clean-looking
result that is wrong. Full audit in [api-coverage.md](api-coverage.md).

- **`figma.mixed` is not a number and not nothing.** A property with differing
  values — per-corner radii, a text node with mixed runs — returns the sentinel.
  Arithmetic on it yields `NaN`; a `typeof v === "number"` guard *silently skips*
  it. Count mixed separately: on a radius census it usually means geometry no
  token can express, which is a finding.
- **Styles are a second token carrier.** A node can take its paint, text or
  effect from `fillStyleId` / `textStyleId` / `effectStyleId` instead of a
  variable binding. A census reading only `boundVariables` calls all of those
  untokenised — and since shadows *cannot* be variables, effect styles are the
  correct practice, not debt. Report three columns: **bound / styled / literal**.
- **`figma.skipInvisibleInstanceChildren`** changes what traversal returns.
  Hidden instance children are usually the unused half of a boolean property, not
  debt. Set it deliberately and state which way in the report; two censuses that
  disagree on the flag are not comparable.

```js
figma.skipInvisibleInstanceChildren = true   // decide once, at the top
```

## Spacing off the grid

Finds gap/padding values that are not on the base grid, and separates bound from
literal. Adjust `GRID` to the project's unit.

```js
const page = await figma.getNodeByIdAsync(PAGE_ID)
await figma.setCurrentPageAsync(page)
const GRID = 4
const PROPS = ["itemSpacing", "paddingLeft", "paddingRight",
               "paddingTop", "paddingBottom", "counterAxisSpacing"]
let bound = 0, onGrid = 0, off = 0, mixed = 0
const values = {}
for (const n of page.findAllWithCriteria({ types: ["FRAME","COMPONENT","COMPONENT_SET","INSTANCE"] })) {
  if (!("layoutMode" in n) || n.layoutMode === "NONE") continue
  const bv = n.boundVariables || {}
  for (const p of PROPS) {
    const v = n[p]
    if (v === figma.mixed) { mixed++; continue }   // NOT skippable — it is a finding
    if (typeof v !== "number") continue
    if (bv[p]) { bound++; continue }
    if (Math.abs(v) % GRID === 0) { onGrid++; continue }
    off++; values[v] = (values[v] || 0) + 1
  }
}
return { bound, onGrid, off, mixed, values }
```

**Read it right:** values that are `grid/2` off (2, 6, 10, 14 on a 4px grid) are
usually half-steps mirrored from the code. Odd values (1, 3, 5, 7) usually come
from DOM capture rounding or manual nudging and exist nowhere in the code.
Multiples of the grid that are not in the token scale (20, 28, 40) are **not**
debt — check the framework's scale before "fixing" them.

## Is the reference tier actually private?

The tiering is real only if nothing binds the reference collection directly.

```js
const cols = await figma.variables.getLocalVariableCollectionsAsync()
const vars = await figma.variables.getLocalVariablesAsync()
const ref = cols.find(c => c.name === REFERENCE_COLLECTION_NAME)
const byId = Object.fromEntries(
  vars.filter(v => v.variableCollectionId === ref.id).map(v => [v.id, v.name]))

// aliased from the semantic tier = healthy
const aliased = {}
for (const v of vars) {
  if (v.variableCollectionId === ref.id) continue
  for (const mid of Object.keys(v.valuesByMode)) {
    const val = v.valuesByMode[mid]
    if (val && val.type === "VARIABLE_ALIAS" && byId[val.id])
      (aliased[byId[val.id]] ||= []).push(v.name)
  }
}
// bound straight from nodes = the tier is being skipped
const page = await figma.getNodeByIdAsync(PAGE_ID)
await figma.setCurrentPageAsync(page)
const direct = {}
for (const n of page.findAllWithCriteria({ types: ["FRAME","COMPONENT","COMPONENT_SET","INSTANCE","RECTANGLE"] })) {
  for (const [, entry] of Object.entries(n.boundVariables || {})) {
    for (const e of (Array.isArray(entry) ? entry : [entry]))
      if (e && byId[e.id]) direct[byId[e.id]] = (direct[byId[e.id]] || 0) + 1
  }
}
return { aliased, direct }
```

A large `direct` is the finding. Report it as a number, not an opinion.

## Token inventory (literals vs aliases, descriptions, scopes)

```js
const cols = await figma.variables.getLocalVariableCollectionsAsync()
const vars = await figma.variables.getLocalVariablesAsync()
return cols.map(c => {
  const mine = vars.filter(v => v.variableCollectionId === c.id)
  let alias = 0, literal = 0, noDescription = 0, openScope = 0
  const types = {}
  for (const v of mine) {
    types[v.resolvedType] = (types[v.resolvedType] || 0) + 1
    const val = v.valuesByMode[c.modes[0].modeId]
    if (val && val.type === "VARIABLE_ALIAS") alias++; else literal++
    if (!v.description?.trim()) noDescription++
    if (!v.scopes?.length || v.scopes.includes("ALL_SCOPES")) openScope++
  }
  return { collection: c.name, modes: c.modes.map(m => m.name),
           n: mine.length, types, alias, literal, noDescription, openScope }
})
```

**What the numbers mean:**
- a semantic collection with **0 aliases and all literals** is doing the job of
  both tiers — the primitive layer does not exist
- `openScope` counts variables that will pollute every picker
- `noDescription` — in DTCG `$description` is part of the token

## DTCG name conformance

Names may not contain `.` `{` `}` nor start with `$`.

```js
const vars = await figma.variables.getLocalVariablesAsync()
return vars.filter(v => /[.{}]/.test(v.name) || v.name.startsWith("$")).map(v => v.name)
```

## Which component owns a node

Needed constantly, because the fix belongs on the main component, not the
instance you are looking at.

```js
function ownerSet(n) {
  let c = n
  while (c && c.parent) { if (c.type === "COMPONENT_SET") return c.name; c = c.parent }
  c = n
  while (c && c.parent) { if (c.type === "COMPONENT") return c.name; c = c.parent }
  return ""
}
```

For an instance child, walk up to the `INSTANCE` and use
`await instance.getMainComponentAsync()` to reach the editable original.

## Detached instances — the main drift vector

Nothing about a detached instance looks wrong, which is why it is the debt that
survives longest. A frame that structurally mirrors a component but is not an
instance of it is the usual shape.

```js
const page = await figma.getNodeByIdAsync(PAGE_ID)
await figma.setCurrentPageAsync(page)
const comps = page.findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] })
const names = new Set(comps.map(c => c.name.replace(/\s*\/\s*/g, "/")))
// frames whose name matches a component but which are not instances
const suspect = page.findAllWithCriteria({ types: ["FRAME"] })
  .filter(n => names.has(n.name) || [...names].some(cn => cn.endsWith("/" + n.name)))
  .map(n => ({ name: n.name, id: n.id, w: Math.round(n.width) }))
return { components: comps.length, suspectedDetached: suspect.length, suspect: suspect.slice(0, 20) }
```

For the component-API side of the same question — variant/prop parity and the
**override census**, which is the one that finds missing variants — see
[component-parity.md](component-parity.md).

Also worth counting per page: instances vs raw frames inside template boards. A
board built mostly of raw frames is a board that will not receive any future
component fix.

```js
const t = {}
for (const n of page.findAllWithCriteria({ types: ["FRAME", "INSTANCE"] }))
  t[n.type] = (t[n.type] || 0) + 1
return t   // a low INSTANCE:FRAME ratio is the finding
```

## Shell / structure audit

Cheap way to catch boards that show a state the app never renders:

```js
const page = await figma.getNodeByIdAsync(PAGE_ID)
await figma.setCurrentPageAsync(page)
const rows = {}
for (const f of page.children) {
  if (!("children" in f)) continue
  const shell = f.children.map(c => c.name).join(" + ")
  ;(rows[shell] ||= []).push(f.name)
}
return rows
```

Group the boards by their top-level composition. Every board at the same
breakpoint must share one shell; a board whose shell differs from its row is
either a bug or an undocumented state.
