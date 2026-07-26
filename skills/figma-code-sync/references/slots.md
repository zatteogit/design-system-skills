# Slots — the third axis

**Verdict first: slots are fully supported by the Plugin API, and `figma-use`
documents them.** If a slot task seemed impossible through `use_figma`, it was
not an API limit and not an undocumented feature — `component-patterns.md` has a
full section on `createSlot`, manual `SLOT` binding, populating slots in
instances, and the restrictions.

**The gap is discoverability, and it is narrow but real.** `figma-use`'s
SKILL.md — the file an agent reads first, and the table it uses to decide which
reference to load — summarises `component-patterns.md` as *"combineAsVariants,
component properties, INSTANCE_SWAP, variant layout, discovering existing
components, metadata traversal"*. Slots are not in that list, nor anywhere else
in the SKILL.md. An agent that trusts the index and does not open the reference
concludes the capability does not exist.

Slots came out of public beta with a GA launch that added `'SLOT'` as a component
property type and `slotSettings` to `addComponentProperty()` /
`editComponentProperty()`. The Plugin API supported them throughout the beta too.

## The generalisable lesson

Two habits, both cheap, both of which would have avoided the wrong conclusion:

> **Do not conclude a capability is unsupported from a skill's index.** Open the
> reference file, or grep it. An index is a summary someone wrote once, and
> summaries lose entries as the referenced file grows.

> **The typings are the source of truth.** `figma-use` says so itself and tells
> you to grep `plugin-api-standalone.d.ts` rather than trust prose. Take it
> literally: `grep -n "Slot" plugin-api-standalone.d.ts` settles the question in
> one call, and the typings are generated so they cannot lag the API.

The rest of this document is what neither source covers: the decision hierarchy
against modes and variants, the non-enforcing constraints, and the parity mapping
to code.

## The three axes — mode, variant, slot

This extends the "mode before variant" rule in §2 of `SKILL.md`. There are three
mechanisms, and picking the wrong one is the usual cause of variant explosion:

| The difference is… | Mechanism | Cost |
|---|---|---|
| a **value** — width, gap, colour, visibility | **mode** | cheapest: set once on a frame, everything inside resolves |
| the **content placed inside** | **slot** | cheap: per-instance, no new component |
| the **structure** — a node that exists in one form and not the other, a different layout direction | **variant** | expensive: swapped instance by instance, resets paint overrides |

**Read it in that order.** Before adding a variant axis, ask whether the two
variants differ only in *what is inside them* — a card with an icon versus a card
with an avatar, a toolbar with three buttons versus five. That is a slot, and
modelling it as a variant produces a component set that multiplies without
bound and still cannot express the case nobody anticipated.

The old workaround — an `INSTANCE_SWAP` property plus hidden placeholder layers —
is still correct when the content is *one node chosen from a known set*. A slot is
for *arbitrary content of arbitrary length*. If you find yourself adding "…and one
more optional hidden row" to a component, you wanted a slot.

## API surface

For the full creation and population recipes, read
`skill://figma/figma-use/references/component-patterns.md` → *Slots: createSlot
and SLOT Properties*. The essentials, plus the parts that are only in the API
docs:

```js
// Create — on a ComponentNode. Also creates the linked SLOT component property.
const slot = component.createSlot()        // → SlotNode, type === 'SLOT'
slot.componentPropertyReferences["slotContentId"]   // → the generated key, e.g. "Content#7:1"

// Populate in an instance: append children. NOT setProperties — that throws.
instance.findAllWithCriteria({ types: ["SLOT"] })
        .find(n => n.name === "Content")
        .appendChild(node)

// Reset a slot back to the component's original slot content
slot.resetSlot()

// Constraint violations are REPORTED, never thrown
slot.limitViolations   // → ('BELOW_MIN' | 'ABOVE_MAX' | 'HAS_NON_PREFERRED')[]
```

Restrictions worth knowing before you design around slots: `GRID` layout is not
allowed on a slot; widgets, stickies and `ComponentNode`s cannot be appended
directly; a frame nested inside another slot cannot itself be bound to a slot
property; and a slot must be a direct child of the component.

`SlotSettings`, passed via `ComponentPropertyOptions` on `addComponentProperty()`
or `editComponentProperty()`, and returned per slot entry in
`componentPropertyDefinitions`:

| Field | Meaning |
|---|---|
| `stretchChildOnInsert` | apply counter-axis fill to a layer when it is inserted |
| `displayEmptyByDefault` | keep the slot highlight visible on empty instances |
| `minChildren` / `maxChildren` | expected child count; `null` = unset |
| `allowPreferredValuesOnly` | restrict insertions to the `preferredValues` list |

Slot properties support `name`, `description`, `preferredValues` and
`slotSettings` through `editComponentProperty()`, and are removed with
`deleteComponentProperty()`.

### Three traps

- **Constraints do not enforce themselves.** `minChildren`, `maxChildren` and
  `allowPreferredValuesOnly` never throw and never block an edit. A violating
  slot simply reports it in `limitViolations`. **This makes them a census
  target, not a guarantee** — if you rely on them, count violations, or they are
  documentation with a type signature.
- **`slot.clone()` returns a `FrameNode`, not a `SlotNode`.** A slot is defined by
  a component-property reference that only means something inside its parent
  component, so the clone degrades to a plain frame. Cloning a component subtree
  containing slots therefore silently loses their slot-ness.
- **The linked property is created for you.** `createSlot()` adds the `'SLOT'`
  entry to `componentPropertyDefinitions` itself — do not also call
  `addComponentProperty()` for it, and read the generated key (properties carry a
  `#id` suffix) rather than assuming the name.

## Expect zero, and do not treat that as a defect

Adoption is uneven, and both outcomes are normal. A large library built before
slots went GA returns **`slotNodes: 0`** across every page, expressing
composition entirely through `INSTANCE_SWAP` and boolean properties — that is not
a finding. Another returns slots but **none of them carrying any `slotSettings`**,
which is why `withViolations: 0` there verifies nothing.

Slots went GA recently; anything built before that expresses composition with
**`INSTANCE_SWAP` + boolean visibility**, and that pattern still works. So a zero
means "built earlier", not "built wrong".

So the finding is never "you have no slots". It is narrower: **a component whose
`INSTANCE_SWAP` and hidden-placeholder machinery is straining** — three optional
rows, a `Has extra content` boolean, a swap property whose preferred values keep
growing — is a component that wanted a slot. Migrate those, not the library.

`findAllWithCriteria({ types: ["SLOT"] })` is accepted as a criteria type, so the
fallback below is belt-and-braces rather than necessary.

## The census: are slots being used, and are they intact?

```js
const page = await figma.getNodeByIdAsync(PAGE_ID)
await figma.setCurrentPageAsync(page)
const out = { componentsWithSlots: [], violations: [] }
for (const c of page.findAllWithCriteria({ types: ["COMPONENT"] })) {
  const slots = c.findAllWithCriteria
    ? c.findAllWithCriteria({ types: ["SLOT"] })
    : c.findAll(n => n.type === "SLOT")
  if (!slots.length) continue
  out.componentsWithSlots.push({ name: c.name, id: c.id, slots: slots.length })
  for (const s of slots)
    if (s.limitViolations?.length)
      out.violations.push({ component: c.name, slot: s.name, kinds: s.limitViolations })
}
// Instances whose slot content violates the component's declared limits
for (const inst of page.findAllWithCriteria({ types: ["INSTANCE"] })) {
  for (const s of inst.findAll(n => n.type === "SLOT"))
    if (s.limitViolations?.length)
      out.violations.push({ instance: inst.name, slot: s.name, kinds: s.limitViolations })
}
return out
```

`findAllWithCriteria` uses an indexed type lookup and is far faster than a
predicate; fall back to `findAll` only if `'SLOT'` is rejected as a criteria type
in your file's API version.

## Parity with code

A slot is the Figma equivalent of the composition mechanism the code already has,
and that makes it a **parity axis** — one that `component-parity.md`'s property
census will otherwise miss entirely, because a slot is not a variant and not a
prop in the usual sense.

| Code | Figma |
|---|---|
| `children` | a single unnamed slot |
| named slot props (`header`, `footer`, `actions`) | one named slot each |
| a `ReactNode` prop rendered in place | a slot |
| a prop typed to a union of components | slot + `preferredValues` + `allowPreferredValuesOnly` |
| `React.Children.count` limits, "max 3 actions" | `minChildren` / `maxChildren` |

The asymmetries to look for, in the same spirit as the parity table:

- **`children` in code, no slot in Figma** → the Figma component is a fixed
  picture of one composition. Every real use will be a detached instance or an
  override, and the detached-instance census is where it will surface.
- **slot in Figma, no composition prop in code** → the design promises a
  flexibility the implementation does not have. Cheaper to catch here than in
  review.
- **`maxChildren` set in Figma, unbounded in code** → a constraint that exists
  only on one side. Either implement it or delete it; a limit nobody enforces
  teaches designers something false.

Record slots alongside variants and props in the parity census, and treat a slot
present on exactly one side as a finding — not a formatting difference.
