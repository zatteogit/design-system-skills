# Component parity: does the Figma component match the code component?

Token and geometry drift are measurable with the recipes in
`census-recipes.md`. Component *API* drift is the category most teams are blind
to: the Button in Figma has a `Ghost` variant that the code has never had, the
code has a `loading` prop no board can show, and both sides look fine in
isolation.

Nothing here is expensive. The reason it goes unmeasured is that there is no
obvious join key between the two sides — which is what Code Connect provides.

## Code Connect is the anchor

Without it, matching is name-guessing: `Button` ⇄ `Button`, and everything
ambiguous is dropped silently. With it, each Figma component has a declared
source component, and every census below becomes exact.

Start with the high-impact components rather than attempting coverage. Ten mapped
components produce a real parity report; a hundred half-mapped ones produce a
report nobody trusts. `figma-code-connect` has the mechanics; use
`get_code_connect_map` to read existing mappings before assuming there are none.

### Check first, and expect zero

`get_code_connect_map` takes a **file key and a node id** — it answers "what is
this component mapped to", not "what is mapped". So the check is:

```
1. figma-census.js CENSUS="graph" on the components page
      → `declaredIds`: { componentName: nodeId } — this is the input
2. get_code_connect_map(fileKey, nodeId) for the components you care about
3. an empty object {} means no mapping exists for that node
```

Run it before writing a word about parity. On a production library of dozens of
components, in daily use for years, the answer was `{}` — **no mappings at all**. That is the normal state, and it has a consequence worth stating in the
report rather than leaving implicit:

> **Every parity finding in this repository is currently matched by name, which
> this skill calls guessing.** The findings are still worth acting on; they are
> not worth automating against until the mapping exists.

Two failure modes a name match cannot see, both present in that file: a Figma
component named with slash *folders* (`card-icon/medium/64`) is a different
component from `card-icon`, and a name match will happily fold them
together; and a component whose main is remote reports the name published by the
*library*, not the one the consuming file shows.

Going from zero is a code-repo task, not a Figma one: `figma connect create` in
the repo that owns the components, then `figma connect publish`. Until that
lands, say "name-matched" in the report header. A parity number whose join key is
undeclared is a number with an asterisk, and the asterisk belongs next to it.

## The four censuses

Run them together — the interesting findings are in how they disagree.

### 1 · Property parity

The Figma side. `componentPropertyDefinitions` covers all four property kinds;
VARIANT properties carry their options, the others carry a default.

```js
const page = await figma.getNodeByIdAsync(PAGE_ID)
await figma.setCurrentPageAsync(page)
const out = []
for (const n of page.findAllWithCriteria({ types: ["COMPONENT_SET", "COMPONENT"] })) {
  // a COMPONENT inside a set is described by the set, not by itself
  if (n.type === "COMPONENT" && n.parent?.type === "COMPONENT_SET") continue
  let defs = {}
  try { defs = n.componentPropertyDefinitions ?? {} } catch { /* not a top-level component */ }
  out.push({
    name: n.name,
    type: n.type,
    variantCount: n.type === "COMPONENT_SET" ? n.children.length : 1,
    props: Object.entries(defs).map(([raw, d]) => ({
      // BOOLEAN/TEXT/INSTANCE_SWAP names carry a "#id" suffix; VARIANT names do not
      name: raw.split("#")[0],
      kind: d.type,
      options: d.variantOptions ?? null,
      default: d.defaultValue,
    })),
  })
}
return out
```

**`componentPropertyDefinitions` includes `'SLOT'` entries**, and they are a
parity axis of their own — a slot is the Figma equivalent of `children` or a
named slot prop, and it is invisible to a census that only looks at variants and
booleans. Record them, and see [slots.md](slots.md) for the full mapping and the
asymmetries worth flagging.

The code side: read the component's prop type — the union members of a variant
prop, the boolean props, the slot props. Then compare, per component:

| Asymmetry | What it means | Fix |
|---|---|---|
| variant option in Figma, not in the code union | **design fiction** — a state that cannot ship | remove from Figma, or build it |
| prop in code, no property in Figma | **design blindness** — nobody can compose it | add the variant/property |
| same concept, different names (`kind` / `Type`) | Code Connect will map it wrong, silently | rename; code wins |
| same name, different option spelling (`sm` / `Small`) | the mapping needs an explicit value map | declare it in the Code Connect mapping |
| variant axis with one option | a leftover from a removed axis | delete the axis |

**Multiplied variant count is the smell to look for.** A set with 48 variants is
almost always three axes that should have been one axis plus two boolean
properties, or — more often — variants placed on the shell instead of the atom
(§3 of `SKILL.md` — the component ladder). Report `variantCount` next to the axis
count; the ratio tells you immediately.

### 2 · Override census — the missing-variant detector

The most useful and least run. What are people actually overriding on instances?

**Get the denominator right, or the numbers are nonsense.** `instance.overrides`
returns one entry per overridden *node inside* the instance, not one per
instance. Summing them and dividing by the instance count yields ratios above 1,
which is how the bug announces itself. Count **distinct instances** per field,
and keep the node count as a separate, genuinely useful second dimension.

```js
figma.skipInvisibleInstanceChildren = true
const page = await figma.getNodeByIdAsync(PAGE_ID)
await figma.setCurrentPageAsync(page)
const safe = (fn, d = null) => { try { return fn() } catch { return d } }

const instances = page.findAllWithCriteria({ types: ["INSTANCE"] })
const mains = await Promise.all(instances.map(i => i.getMainComponentAsync().catch(() => null)))

const byComponent = {}
for (let i = 0; i < instances.length; i++) {
  const main = mains[i]; if (!main) continue
  const key = safe(() => main.parent?.type === "COMPONENT_SET" ? main.parent.name : main.name, main.name)
  const e = (byComponent[key] ??= { instances: 0, instancesWithField: {}, entryCount: {} })
  e.instances++
  const fieldsHere = new Set()          // dedupe within this instance
  for (const o of (safe(() => instances[i].overrides, []) || []))
    for (const f of (o.overriddenFields || [])) {
      fieldsHere.add(f)
      e.entryCount[f] = (e.entryCount[f] || 0) + 1
    }
  for (const f of fieldsHere) e.instancesWithField[f] = (e.instancesWithField[f] || 0) + 1
}
// share = instancesWithField / instances   (≤ 1)
// avgNodesTouched = entryCount / instancesWithField
```

Read the two numbers together:

- **`share` near 1 is a missing variant or property** — the component's default is
  wrong and *everyone* is correcting it by hand. Real examples from one page:
  a site header had `gridStyleId` overridden on **every one of its instances**,
  and an icon had `fills` overridden on **every one of its own**. Neither is a per-instance decision; both
  are a default that should not exist.
- **`avgNodesTouched` separates a tweak from a rebuild.** Share 1.0 across one
  node is a wrong default; share 1.0 across seventeen nodes
  (a card-set module) is a component being reassembled at every use.
- **Exclude `characters` *and* `styledTextSegments`** before reading. Both are
  what text layers are for, and both sit at 100% on any content-bearing
  component — they will otherwise dominate the ranking and hide everything else.
- **`width`/`height` at share 1.0 is a sizing-model defect, not a missing
  variant.** Four atoms in one real library had both overridden on *every*
  instance — 11/11, 12/12, 18/18, 22/22. No property would fix that: the
  components are `FIXED` where they should be `FILL`/`HUG`, so every consumer
  resizes them by hand. Read it as "this atom does not know how to size itself"
  and fix the layout, not the API.
- **A `*StyleId` override at high share is its own category**: the instance is
  swapping a *style*, not a property. That belongs in a variant or a mode.
- An override rate near zero on a component with many instances is a healthy
  component, and worth saying so in the report.
- **Ignore components with few instances.** A floor of ~10 keeps single-use noise
  out of the ranking.

This is the census that turns "the design system feels rigid" into a list.

**Check `main.remote` before drawing conclusions about the file.** A consumer
file can be 100% remote — one real page returned **thousands of instances, every
single one of them with a remote main component**. That is not a finding, it is a fact about the
file's role: the components live in a library elsewhere, so this file can be
audited for *how* it consumes them but tells you nothing about how they are
built. Report the share; a mixed file (some local, some remote) is the one where
you must be careful not to compare the two halves as if they were the same
system.

### 3 · Detached instances

The main drift vector, and the hardest to see because nothing about a detached
frame looks wrong. Recipe in `census-recipes.md`; two refinements when you have
Code Connect:

- restrict the name-matching to components that are actually mapped — a detached
  copy of an unmapped experiment is not the same finding;
- report detached frames **per board**, not per file. One board with nine is a
  board someone rebuilt by hand; nine boards with one each is normal decay.

### 4 · Instance-to-frame ratio per board

```js
const t = {}
for (const n of page.findAllWithCriteria({ types: ["FRAME", "INSTANCE"] }))
  t[n.type] = (t[n.type] || 0) + 1
return t
```

**A board built mostly of raw frames will never receive a future component fix.**
That is the whole finding. It does not matter how correct it looks today; it has
opted out of the system. Rank boards by ratio and fix from the worst.

## Reading the combined report

Order of interpretation, because the censuses explain each other:

1. **High override rate + low variant count** → the component is under-specified.
   Add properties. Cheapest win available.
2. **High variant count + low instance count** → the component is
   over-specified. Variants were built speculatively; delete the unused ones.
3. **Low instance:frame ratio + many detached** → the board was rebuilt by hand,
   probably because using the component was harder than not using it. Fix the
   component's ergonomics, then rebuild the board from instances. Fixing the
   board alone guarantees a repeat.
4. **Prop present in code, absent in Figma, and the board shows it anyway** →
   somebody drew the state manually. This is the worst case: it looks like
   coverage and it is a picture.

## Fix direction

Code is the source of truth, so: **the code's prop surface defines the
component's API, and Figma follows** — unless the census exposes that the code's
API is what is wrong, which happens most often in case 1 above, where designers
have been compensating for a missing prop with overrides for months.

Either way, fix the **main component**, never the instances: they inherit what
they have not overridden, so template boards often correct themselves for free.
Re-run census 2 afterwards — the override counts falling is the proof, and if
they do not fall the fix did not land.

## Wiring it into the loop

Parity is a *periodic* census, not a per-change one: run it when a component's
API changes, before a design-system review, and after any wave of board work.

The per-change equivalent is Code Connect itself — a mapping that fails to
resolve is an immediate signal that one side moved. Keep the mappings in CI, and
treat an unresolvable mapping as a build failure rather than a warning: it is the
only automatic notification you get that the two sides have parted.
