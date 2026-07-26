# The component ladder

Tokens have tiers. **Components have tiers too, and there are more than three** —
because components consume each other: an icon button consumes an icon, a field
consumes a label and an input, a card consumes a field and a button.

Getting this wrong is upstream of almost every other problem in this skill. A
file with no component ladder produces variant explosion, raw-frame pages, and
fixes that land in the wrong place — and none of those look like a tiering
problem when you meet them.

## The tier is defined by what a component may consume

Not by size, not by how "atomic" it feels. The atom / molecule / organism
vocabulary is a size metaphor and it gives you no test — which is exactly why
teams argue about whether a search field is a molecule. Replace it with a
question that has an answer: **what is this allowed to instance?**

| Tier | Consumes | Examples |
|---|---|---|
| **0 · Elements** | tokens only — instances nothing | icon, avatar, divider, spinner, logo mark |
| **1 · Atoms** | tokens + elements | button, icon button, input, chip, checkbox, badge |
| **2 · Composites** | tokens + atoms + own tier | field (label + input + help), list row, card, toolbar, menu item |
| **3 · Patterns** | composites + atoms | domain things: recipe card, plan row, filter bar, empty state |
| **4 · Templates** | patterns + composites | page shells, regions, slots — see [template-composition.md](template-composition.md) |

**The rule, and it is the whole contract:**

> A component may instance components of its own tier or below. **Never above.**
> Within a tier, the dependency graph must be **acyclic**.

The second half is the precise version of "atoms consume atoms". Same-tier
consumption is legitimate — an icon button instancing an icon, a field instancing
a label — and it stops being legitimate the moment it closes a loop. Acyclicity
is what keeps "same tier" from meaning "no rule at all".

Five tiers is the common shape; use as many as you can *enforce*. The count
matters less than the fact that each one has a written answer to "what may this
consume".

## Two ladders, and where they meet

Do not conflate them. They are independent, and they touch at exactly one point:

```
COMPONENTS   templates → patterns → composites → atoms → elements
                                                            ↓
TOKENS                     component → semantic → primitive
```

A component consumes **component-tier or semantic** tokens. Reaching past them to
a primitive is the token-tier bypass from `token-architecture.md`, and it is a
separate violation from a component-tier bypass. A file can be perfectly tiered
on one ladder and flat on the other — measure both.

## Marking the tier so it can be checked

Figma has no tier field. Pick a convention a script can read, exactly as you
would for the private-token prefix. **Use both of these together** — they do
different jobs:

- **pages carry the tier** — `0 Elements`, `1 Atoms`, `2 Composites`,
  `3 Patterns`, `4 Templates`, or the domain equivalent. Visible while working,
  makes the ladder the file's actual structure, and a component in the wrong
  place is obvious before any census runs.
- **a `.` or `_` name prefix carries privacy** — Figma hides such components from
  the assets panel, which is the component-level twin of prefixing a variable
  collection to make primitives private. It is stronger than a convention because
  the tool enforces the consequence.

A library that does both puts its internal parts on a dedicated hidden-components
page AND names them `.content`, `.items`, `.atoms/progress-bar/…` — parts that
compose the public components and never appear in anyone's picker. That is the
elements tier, marked twice.

Whichever you choose, **the convention is load-bearing** — a tier you cannot
classify is a tier you cannot enforce.

### The ladder often spans files

A mature system splits into a **tokens** file, a **components** file and an
**assets** file, each published as its own library. The ladder is unchanged; only
the census plumbing differs:

- run the graph per file, then merge — cross-file edges appear as instances whose
  `main.remote` is true;
- a pattern in the components file legitimately consumes icons from the assets
  file, so a remote edge is *not* a tier violation. Classify by the **source
  file's** role before judging direction;
- and remember the consumer-file trap: the components file has zero local
  variables and is still fully tokenised
  ([census-recipes.md](census-recipes.md)).

## Creation: build bottom-up, and this is why pages end up as raw frames

The order follows the graph: **you cannot build a card before the button inside
it.** You can, of course — and then you draw a rectangle that looks like a
button, and the card is born detached from a component that appears next week.

**This is the link between the two most common complaints.** Raw frames in
templates are usually not laziness at assembly time; they are the residue of
building top-down. When the atom does not exist at the moment you need it, the
only thing you can do is draw it.

So the sequence is a topological sort of the ladder:

1. **Tokens first** — including the layout tier (`template-composition.md` Part A).
2. **Elements** — icons and marks, sized on the grid, bound to tokens.
3. **Atoms** — with their variants and component properties, consuming elements.
4. **Composites** — instancing atoms, never redrawing them.
5. **Patterns**, then **templates** — assembled from instances only.

At each level, everything the level below provides must already be an instance.
If you find yourself drawing at level *n*, the thing you need at level *n−1* does
not exist yet: **stop and build it.** That decision costs ten minutes now and is
the difference between a system and a set of pictures.

## Maintenance: fix at the lowest tier that governs

The generalisation of *source before instances*. A change belongs at the lowest
tier where it is true — fix the icon, not the twelve buttons that contain it —
and everything above inherits for free.

Two consequences worth stating:

- **Measure the upper tiers *after* the lower ones are clean.** Composites and
  templates often correct themselves; measuring first means doing the work twice.
- **A fix that must be repeated per consumer is a mis-tiered fix.** If you are
  editing the same thing in nine places, the decision belongs one level down —
  or in a token.

## The census: the component dependency graph

The measurement nothing else gives you. Build the graph of which component
instances which, then read the violations off it.

```js
figma.skipInvisibleInstanceChildren = true

// TIER_OF: classify by page name, or swap in a name-prefix rule.
const TIER_OF = { "0 Elements": 0, "1 Atoms": 1, "2 Composites": 2, "3 Patterns": 3, "4 Templates": 4 }

const page = await figma.getNodeByIdAsync(PAGE_ID)
await figma.setCurrentPageAsync(page)
const tier = TIER_OF[page.name]

// `.parent` can THROW ("get_parent: Unknown node type"), not just return null.
// Nodes from a remote library are the usual trigger, and `p && p.type !== "PAGE"`
// does not protect you: it evaluates `p.parent` first. Guard every hop, cap depth.
const owner = n => {
  let c = n
  for (let i = 0; i < 60; i++) {
    try {
      if (c.type === "COMPONENT_SET") return c.name
      if (c.type === "COMPONENT") return c.parent?.type === "COMPONENT_SET" ? c.parent.name : c.name
      const next = c.parent
      if (!next || next.type === "PAGE" || next.type === "DOCUMENT") return null
      c = next
    } catch { return null }
  }
  return null
}

const edges = []
for (const inst of page.findAllWithCriteria({ types: ["INSTANCE"] })) {
  const from = owner(inst)
  if (!from) continue                      // an instance sitting loose on the page, not inside a component
  const main = await inst.getMainComponentAsync()
  if (!main) continue
  const to = main.parent?.type === "COMPONENT_SET" ? main.parent.name : main.name
  // The main component's page tells us the callee's tier.
  const toTier = TIER_OF[main.parent?.type === "COMPONENT_SET"
    ? main.parent.parent?.name : main.parent?.name]
  edges.push({ from, to, fromTier: tier, toTier: toTier ?? null })
}
return { page: page.name, tier, edges }
```

Run one call per tier page in parallel, then merge the edge lists and analyse the
whole graph in plain code:

| Finding | Rule | What it means |
|---|---|---|
| **upward nesting** | `toTier > fromTier` | a composite instanced inside an atom — the Figma analogue of an upward import; the atom is not an atom |
| **cycle** | any cycle in the graph | usually two "atoms" that each contain the other's wrapper; one of them is a composite |
| **tier skip** | `toTier < fromTier - 1` | not a violation by itself — a template using an atom directly is fine — but a *pattern* of skips means the middle tier is nominal |
| **orphan** | no incoming edges, not a template | nobody consumes it — **but only if you scanned every page**; see the trap below |
| **fan-in = 1** | exactly one consumer | probably not a component — inline it, or find its second consumer |
| **fan-in very high** | many consumers | a real atom. Changing it is high-leverage and high-risk: this is the list to regression-test |
| **depth > 4–5** | longest path | over-nesting; each level costs an override hop and makes instances harder to reason about |

**Read the fan-in distribution before anything else.** A healthy library has a
few components with very high fan-in (the real atoms) and a long tail of ones and
twos. If nothing has high fan-in, the atoms are not being consumed — the pages are
built from raw frames, and the ladder exists only on paper.

For calibration, a healthy library measured with this script has **no cycles** and
a fan-in head that falls away steeply: one dominant atom consumed by dozens of
components, a couple of icons behind it, then a long tail of twos and ones. That
shape — one dominant atom, a couple of icons, then a long tail — is what healthy
looks like. The singletons at the end of the tail are the list to review, not to
delete on sight.

### Two traps this census sets for you

- **Orphans are meaningless per page.** Run it on the components page alone and
  every top-tier component reads as an orphan, because its consumers live on the
  template and example pages. In the real run above, more than half the components looked
  orphaned — and the "orphans" were headers, footers and cards, i.e. exactly the
  things the templates consume. **Merge the edge lists from every page**,
  including template and example pages, before computing orphans at all.
- **Remote components truncate the graph.** That same file had hundreds of instances
  whose main component lives in an external library. Their edges point at names
  you cannot expand, so depth and fan-out are lower bounds. Count them
  (`main.remote`) and report the number next to the graph, or the picture reads
  as flatter than it is.

## Parity with code

The ladder is the same on both sides, which makes it directly comparable — and
it is the cheapest structural parity check available, because it needs no Code
Connect mapping to be useful:

| Figma | Code (see `design-system-code`, tier-contract.md) |
|---|---|
| Elements | icon components / asset layer |
| Atoms | context-free components (`components/ds/`) |
| Composites | context-free components composing atoms |
| Patterns | product patterns / feature UI |
| Templates | page templates and routes |

If the two ladders have different depths, one side has a layer the other lacks —
usually Figma missing the composite tier, which shows up in code as atoms being
recombined identically in twelve places. Compare the **shape of the graph**, not
just the names: fan-in in Figma should broadly track import counts in code, and a
component with high fan-in on one side and one consumer on the other is a real
divergence worth explaining.
