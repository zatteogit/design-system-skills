# Verification — proving a change did what you claim

The goal is always the same: replace "it looks right" with a number that a
reviewer could reproduce.

## Before the change: leave yourself a way back

One call, and it turns a risky bulk edit into a revertible one. Do it before
every migration wave, with the census numbers in the description — so the
version-history entry says what was true when you took it.

```js
await figma.saveVersionHistoryAsync(
  "Before spacing snap — wave 3",
  "off-grid 410 → target 0; 60 boards touched"
)
```

Nothing in `figma-use` suggests this, and it is the cheapest safety net available
on the Figma side. The code-side equivalent is the `git stash` pair below.

## Geometry signature (the workhorse)

Capture the position of every element that renders text, before and after a
change. Text elements are the right probe because they are what moves when
spacing, sizing or wrapping changes, and they are stable to identify by content.

Run this **in the running app** (browser) when validating a code change, and via
`use_figma` when validating a Figma change.

### In the browser

```js
// Reset scroll first: getBoundingClientRect is viewport-relative, so a
// scrolled page produces a huge fake delta and hides the real one.
window.__sigOf = function () {
  document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0 })
  const sig = []
  document.querySelectorAll('body *').forEach(el => {
    const t = [...el.childNodes].filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim()).join('').slice(0, 24)
    if (!t) return
    const r = el.getBoundingClientRect()
    if (!r.width && !r.height) return
    sig.push(`${t}|${Math.round(r.x)}|${Math.round(r.y)}|${Math.round(r.width)}|${Math.round(r.height)}`)
  })
  return sig
}
```

Store the baseline in `localStorage` so it survives the reload after you change
the code, then diff by matching on the text key and comparing coordinates.
Report: elements moved, max ΔY, elements missing, new clipping.

**Interpreting it:**
- `mancanti > 0` — an element disappeared. Always a regression; investigate.
- `nuoviClip > 0` — new truncation. Always a regression.
- `mossi` large but `maxDy` small — a uniform shift. Usually the intended
  loosening/tightening, not a reflow.
- `maxDy` large on a long page — expected if the change adds height; compare
  against the page length, not against zero.

### Before/after without a second branch

```bash
git stash push -- <paths>   # measure "before"
git stash pop               # measure "after"
```

Capture the "after" first (you are already there), then stash, reload, capture
"before". Fewer reloads, and you cannot forget to restore.

## Proving a zero-shift refactor

For refactors that must change *nothing* visually — renaming a scale, replacing
`h-4 w-4` with a named utility, extracting a component — the bar is exact
equality, not "looks the same".

Use a tally rather than a per-element diff, so the proof is one line:

```js
const t = {}
document.querySelectorAll('svg').forEach(s => {
  const r = s.getBoundingClientRect()
  const k = `${Math.round(r.width)}x${Math.round(r.height)}`
  t[k] = (t[k] || 0) + 1
})
```

Identical tally before and after = proof. Do it on several screens; one screen
can miss the case you changed.

## Overflow and clipping

```js
// A node overflows if it exceeds a parent that actually clips.
// Exclude nodes whose truncation is intentional.
const clipped = [...document.querySelectorAll('body *')].filter(e => {
  const cs = getComputedStyle(e)
  if (cs.overflow === 'visible' && cs.overflowX === 'visible') return false
  if (/truncate|line-clamp|overflow-/.test((e.className || '').toString())) return false
  return e.clientWidth > 0 &&
    (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)
})
```

In Figma the equivalent walks the tree comparing `child.y + child.height` against
`parent.height` where `parent.clipsContent`. Run it **twice**: fixing inner
containers pushes the overflow up to their parents.

**Before resizing anything, check the ratio.** A container that needs to be four
times taller is not overflowing — it is a deliberate crop (`clipsContent` used to
show a slice of a component). Look at it before you "fix" it.

## SVG box vs glyph

When separating an icon's layout box from its drawn size (box on the grid, glyph
at its optical size), verify the glyph is *rendered* smaller and not *clipped*:

```js
const cs = getComputedStyle(svg)
const contentBox = parseFloat(cs.width) - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
const bbox = svg.getBBox()          // in viewBox units
// bbox must stay inside the viewBox; contentBox is the rendered size
```

`box-sizing: border-box` is required, or padding adds to the box instead of
insetting the glyph.

## What not to do

- **Do not measure with a scrolled viewport.** It is the most common way to get a
  meaningless delta.
- **Do not compare screenshots by eye at reduced scale.** Downscaling hides 2px
  differences and invents others.
- **Do not trust a tool result over a measurement.** A write API can report
  success and change nothing (see the `maxWidth` trap). The census is the truth.
