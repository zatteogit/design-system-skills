# Accessibility on both sides

Contrast is typically verified in code and **never in the Figma file** — which is
backwards, because Figma is where the pair is *chosen*. By the time a failing
pair reaches a CI contrast test, it has already been drawn, reviewed and
approved, and changing it is a design conversation instead of a typo fix.

The fix is cheap: the same contract, checked on both sides, from the same list of
pairs.

## Do not derive the pairs from names. Observe them.

A contrast check is only as good as the enumeration of what is checked against
what — and that enumeration is the hard part.

**The obvious approach does not work.** Two naming-based derivations both fail,
and they fail in ways worth recognising:

- *cross-product within a group* (`card/surface/*` × `card/text/*`) —
  produced more than a hundred pairs, most of them invented. Dozens came back at exactly
  **1.00**, which is the signature of a pair that does not exist: identical
  colours, because the two tokens were never meant to meet.
- *match the variant segment* (`surface/primary` ↔ `text/primary`) — produced a
  dozen pairs, and still wrong. `button/icon/primary` on
  `button/surface/primary` came back at 1.00 in both modes, because in that
  file the third segment names **the variant of that element**, not "the
  foreground for that surface". Several surfaces had no matching foreground and
  even more foregrounds had no matching surface — which is itself the tell that
  the convention is not a pairing convention.

Token names encode *what a token is*, not *what it is used with*. There is no
reliable mapping from one to the other, and a derivation that looks right will
quietly produce a page of false failures — which is how a check gets switched
off.

**Two enumerations that do work:**

1. **A declared list**, maintained as data, shared with the code-side checker.
   Correct, and the only option for pairs that must be verified before anything
   is drawn.
2. **Observed pairs, read off the canvas** — below. This is the better audit: it
   checks the pairings that *actually exist in the design*, so it cannot invent
   one, and it finds the ones nobody declared.

Use both: the declared list is the contract, the observed set is the reality.
Pairs that appear on canvas and not in the list are the interesting gap.

**Check every mode.** Light passes and dark fails is the overwhelmingly common
shape, because dark palettes are written later and reviewed less — and §"reading
it" below explains what that specific shape almost always means.

## The observed-pairs census

For every text node with a bound fill, walk up to the nearest ancestor with a
bound fill: that is a pairing the design actually uses. Count occurrences, then
resolve and check both modes.

```js
figma.skipInvisibleInstanceChildren = true
const page = await figma.getNodeByIdAsync(PAGE_ID)
await figma.setCurrentPageAsync(page)

const fillVarId = n => {
  try { const b = n.boundVariables?.fills; return Array.isArray(b) && b[0]?.id ? b[0].id : null }
  catch { return null }
}
// `.parent` can THROW, not just return null — see the trap below.
const climb = start => {
  let p = start
  for (let i = 0; i < 40; i++) {
    let next
    try {
      next = p.parent
      if (!next || next.type === "PAGE" || next.type === "DOCUMENT") return null
    } catch { return null }
    p = next
    const id = fillVarId(p)
    if (id) return id
  }
  return null
}

const seen = {}
let textNodes = 0, textBound = 0
for (const t of page.findAllWithCriteria({ types: ["TEXT"] })) {
  textNodes++
  const fg = fillVarId(t); if (!fg) continue
  textBound++
  const bg = climb(t); if (!bg) continue
  seen[`${bg}|${fg}`] = (seen[`${bg}|${fg}`] || 0) + 1
}
return { textNodes, textBound, pairs: seen }   // resolve + contrast as below
```

**`textBound / textNodes` is a free bonus finding**: it is the share of text that
is actually on a token. Around 90% is what a system
that is actually adopted looks like; well below it means the tokens exist and the
canvas has not caught up.

### Trap: an alias can leave the file

`getLocalVariableCollectionsAsync()` returns local collections only, but a
**local variable can alias a remote one** — a brand palette in a shared library
is the standard case, and a good practice. Indexing the collection map directly
then throws:

```
TypeError: cannot read property 'modes' of undefined
```

Fetch the collection with `getVariableCollectionByIdAsync` and cache it, as
above. Two semantic tokens in the real file aliased into a
`🎨 Brand/…/pantone-…` library; a resolver that assumed locality died on the
first one, and one that silently returned `null` would have quietly dropped the
brand colours from the audit — the worse outcome.

### Trap: `.parent` throws

Not a hypothesis — it happened on the first run against a real file:

```
Error: in get_parent: Internal Figma error: Unknown node type for node in getPublicNodeType
```

A node exists whose `.parent` **getter raises**, so no type guard prevents it:
`p && p.type !== "PAGE"` still evaluates `p.parent` first. Every hop needs its own
`try`, plus a depth cap. Likely triggered by nodes belonging to a remote library
(that file had hundreds of instances with remote main components), but the defensive walk
costs nothing and should be the default in **any** ancestor traversal — including
the `owner()` helper in [component-tiers.md](component-tiers.md).

### Reading it

**Sort by use count, and read the top first.** The heuristic has one false-positive
class: "nearest ancestor with a bound fill" is not always the visual background —
it can land on an icon or an inner shape. Those artefacts show up with **1–5
uses**. Real systemic failures show up with hundreds.

**A pair that passes in light and fails in dark is almost always a skipped theme
tier.** This is the single most useful diagnostic here, and it was what the real
run surfaced:

The three worst pairs in that file were all the same shape:

- the **most-used pairing in the whole file**, hundreds of uses: comfortably
  above AA in light, and **barely above 1.0** in dark;
- the next: excellent in light, **near 1.0** in dark;
- the third: a marginal pass in light and **exactly 1.00** in dark — foreground
  and background resolving to the same colour.

Every failing background is a **semantic-tier** token (`colors/neutral/*`) bound
directly to a node, while the theme tier — the only collection with light/dark
modes — was bypassed. The semantic value cannot flip, so the surface stays put
while the text colour moves, and dark mode collapses.

That is *"a tier is only real if nothing skips it"* measured rather than
asserted: the tier-skip and the accessibility failure are the same defect, and
the contrast census is the cheapest way to see it. Fix the binding, not the
colour.

## The Figma-side check

Read-only `use_figma`. Resolves aliases, then computes WCAG contrast per mode.

```js
const vars = await figma.variables.getLocalVariablesAsync()
const cols = await figma.variables.getLocalVariableCollectionsAsync()
const byName = Object.fromEntries(vars.map(v => [v.name, v]))
const colById = Object.fromEntries(cols.map(c => [c.id, c]))

// Resolve a variable to a concrete colour in a named mode. An alias may point
// into another collection, whose modes are independent: match by mode NAME, and
// fall back to that collection's default mode.
// An alias may ALSO point into a REMOTE library, whose collection is absent from
// getLocalVariableCollectionsAsync — fetch it, do not index blindly.
const collectionOf = async id => {
  if (!(id in colById)) colById[id] = await figma.variables.getVariableCollectionByIdAsync(id).catch(() => null)
  return colById[id]
}
async function resolve(v, modeName, depth = 0) {
  if (!v || depth > 10) return null
  const col = await collectionOf(v.variableCollectionId)
  if (!col) return null                      // remote collection unavailable — report, don't crash
  const mode = col.modes.find(m => m.name === modeName) ?? col.modes[0]
  const val = v.valuesByMode[mode.modeId]
  if (val && val.type === "VARIABLE_ALIAS")
    return resolve(await figma.variables.getVariableByIdAsync(val.id).catch(() => null), modeName, depth + 1)
  return val && typeof val.r === "number" ? val : null
}

const ch = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const lum = c => 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b)
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const PAIRS = [["color/bg/card", "color/text/on-card"], /* … */]
const MODES = ["Light", "Dark"]
const out = []
for (const modeName of MODES) {
  for (const [bgName, fgName] of PAIRS) {
    const bg = await resolve(byName[bgName], modeName)
    const fg = await resolve(byName[fgName], modeName)
    if (!bg || !fg) { out.push({ modeName, pair: `${fgName}/${bgName}`, error: "unresolved" }); continue }
    if (bg.a < 1 || fg.a < 1) { out.push({ modeName, pair: `${fgName}/${bgName}`, error: "alpha — not statically verifiable" }); continue }
    const r = ratio(bg, fg)
    if (r < 4.5) out.push({ modeName, pair: `${fgName}/${bgName}`, ratio: +r.toFixed(2) })
  }
}
return out
```

Three deliberate choices in that script, each of which is a bug if you make the
other one:

- **An unresolved pair is a finding, not a skip.** Silently skipping is how a
  pair drops out of coverage during a rename and nobody notices for a year.
- **Alpha is reported, not computed.** A translucent colour's effective contrast
  depends on what is behind it; producing a number would be a confident lie. Flag
  it and check that one by hand — or, better, replace it with a container token
  (see below).
- **Mode matching is by name, with a fallback.** Figma resolves an alias using
  whichever mode is active for the *target* collection, which is context you do
  not have in a static read. Name-matching is the honest approximation; state it
  in the report.

## The alpha-surface trap, on both sides

The pattern that defeats every contrast check: a tonal surface built with
transparency (`bg-primary/10`) carrying the base role as its text colour
(`text-primary`). Nothing is verifiable — not by the guard, not by the Figma
census, not by a reviewer looking at it.

The correct form is a **container pair**: an opaque `x-container` surface and its
matching `on-x-container` foreground, both real tokens, both checkable. If the
container pair does not exist, the alpha form is not a mistake — it is the only
available option, and the fix is to complete the token family first.

Both checkers should flag this shape, and both should point at the same fix.
`design-system-code` covers the code side (rules F1 and F2).

## Bound paints and opacity

A Figma-specific interaction worth knowing before you "fix" a finding: a paint
bound to a colour variable carries that variable's colour and **cannot also carry
an opacity tint**. Moving the alpha to the node's `opacity` works only if the node
has no children — otherwise it fades the content too. The alternative is a
gradient with alpha in its stops.

This is exactly why alpha surfaces proliferate in Figma files, and it is worth
naming when you propose container tokens: you are not asking for a stylistic
change, you are removing the reason the workaround existed.

## Target size

The other static check that is cheap in Figma and usually absent. Interactive
components — buttons, icon buttons, list rows, tabs — have a minimum hit area
(24×24 CSS px for WCAG 2.2 AA; 44×44 is the common product floor).

Measure the **component**, not the instances: the fix belongs to the main
component, and instances inherit. Report the components below the floor with
their dimensions, and treat exceptions as named, with a geometric floor of their
own rather than an unlimited waiver.

## What static checking cannot reach

Everything about *behaviour*. Do not let a green contrast census stand in for:

- focus order, focus visibility and focus trapping in dialogs and sheets;
- keyboard operability of composite controls;
- accessible names, roles and states;
- reduced-motion behaviour;
- reading order versus visual order.

Those need a browser pass on the built app. `design:accessibility-review` covers
that side; the code-side static subset (semantics, roles, landmark ownership) is
rule F3 in `design-system-code`.

The division worth remembering: **the Figma file is where you catch a bad choice;
the running app is where you catch a bad implementation.** Checking only the
second means every finding is expensive.

## Wiring

- Figma-side contrast: run it with every token change, and in the pre-review
  census. It takes seconds.
- Code-side contrast: a hard rule in the design-system guard, never baselined.
- **Compare the two pair lists in CI.** If the code checks 23 pairs and the Figma
  census checks 18, five pairs are unverified on the design side and neither
  report says so. Diffing the lists is five lines and it is the only thing that
  keeps the two checks honestly equivalent.
