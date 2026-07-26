# Rule catalog

Every rule that earned its place in a real guard. Each entry: what it catches,
the instrument it belongs on, and the false positive that will otherwise kill it.

Detection examples use Tailwind + TSX because that is where the reference
implementations live; the **Elsewhere** line gives the shape in other stacks. The
intent is always stack-independent.

Instruments: **hard** (never baselined) · **perimeter** (zero in product scope) ·
**ratchet** (fail on increase). See `enforcement-model.md`.

---

## A. Token source contracts — all hard

These run first and exit before anything else. A fresh token file passes all of
them, which is why they can be absolute from day one.

### A1 · Private primitive leak
**Catches** the private prefix (`--_ref-*`) appearing anywhere outside the token
source. **Instrument** hard. **Why** it is the single unambiguous proof that the
primitive tier is private. **False positive** none — that is the point of a
prefix-based convention.

### A2 · Orphan primitive
**Catches** a private primitive referenced by no public token in any mode.
**Instrument** hard. **Why** it is dead weight, or evidence of a bypass that
reaches it directly. **Trap** collect consumers across *every* mode and the
framework adapter block before deciding; a token used only in dark mode is not an
orphan.

### A3 · Orphan public token
**Catches** a public token exposed to neither the framework nor the runtime
mirror, and not in `RESERVED`. **Instrument** hard. **Why** an unreachable token
is a hardcoded value waiting to happen. **False positive** the genuinely
reserved ones — hence the named map with reasons, plus A4.

### A4 · Stale reserved entry
**Catches** a `RESERVED` name that is no longer declared. **Instrument** hard.
**Why** without it the exception map never shrinks.

### A5 · Unresolved token reference
**Catches** `var(--x)` where `--x` is defined in no applicable scope, per mode.
**Instrument** hard. **Trap** model the fallback scope explicitly (the framework
block resolves against root); merging the maps hides real misses.

### A6 · Token cycle
**Catches** a reference cycle in the alias graph. **Instrument** hard. **Report**
the whole path, not the token. **Trap** run it per mode — a cycle can exist in
dark only.

### A7 · Pigment in a public token
**Catches** a semantic/component token whose value is a literal colour.
**Instrument** hard. **Why** it is a primitive wearing a semantic name; the
rebrand will miss it. **False positive** composites — see A9.

### A8 · Framework adapter purity
**Catches** a declaration in the framework's theme/adapter block that is not an
alias of a design-system token. **Instrument** hard. **Why** the adapter is the
one place where a raw value looks legitimate. **Carve-out** the framework's own
required constants (e.g. exact `#ffffff` / `#000000` photo helpers), as an exact
value match, and prove with a test that the same literal fails in an ordinary
theme declaration.

### A9 · Raw value above the primitive tier
**Catches** a non-primitive token whose value is a bare colour, dimension or
duration. **Instrument** hard. **Critical distinction** *bare* value, not
*contains* a value: a shadow, gradient, typography recipe or transition is a
composite and legitimately lives downstream. Match the whole value against a
single-literal pattern.

### A10 · Incomplete token family
**Catches** a family missing a role on any surface it is consumed from (token
declaration / framework alias / runtime mirror). **Instrument** hard. **Report**
grouped by family, naming the surface. **Why** the missing surface is exactly
where a hardcoded value appears.

### A11 · Scale monotonicity
**Catches** an ordered scale that is not strictly increasing after resolution.
**Instrument** hard. **Trap** resolve `calc()` against the base first; report
the unresolvable case separately from the out-of-order case.

### A12 · Runtime mirror purity
**Catches** a colour literal inside the modules that mirror tokens to the
runtime language. **Instrument** hard. **Why** the mirror exists to hold
references, not values. **False positive** persisted user data that happens to be
colours (member swatches, saved themes) — exclude those exports by name, not the
file.

---

## B. Raw values in consumers

### B1 · Literal colour
**Catches** `#rgb`–`#rrggbbaa`, `rgb()/hsl()/oklch()`, CSS named colours in
visual declarations. **Instrument** ratchet → perimeter → hard. **Trap** restrict
named-colour matching to *colour properties*; `transparent`, `currentColor` and
CSS-wide keywords are not named colours, and the word "tan" appears in prose.
**Elsewhere** `Color(0xFF…)` (Compose/Flutter), `Color(red:…)` (SwiftUI),
`palette.x[500]` (MUI).

### B2 · Framework arbitrary value
**Catches** the escape hatch: `text-[13px]`, `bg-[#abc]`, `p-[7px]`.
**Instrument** hard at zero once tokens exist — there is always a correct
alternative. **Why hard early** it is the cheapest rule to obey and the one that
otherwise grows fastest. **Elsewhere** any inline literal in an `sx`/`style`
object; a magic number in a modifier.

### B3 · Nominal palette class
**Catches** `bg-blue-500`, `text-slate-700` — the framework's default palette
instead of a semantic role. **Instrument** ratchet, usually large. **Trap** this
is often thousands of occurrences; it is the archetypal ratchet rule. **Elsewhere**
`theme.palette.blue[500]`, `Colors.blue600`.

### B4 · Legacy typography utility
**Catches** `text-sm`, `leading-tight` where a semantic type scale exists.
**Instrument** ratchet. **Trap** only meaningful once the semantic scale is
complete on every surface (A10) — otherwise you are banning the only usable form.

### B5 · Legacy elevation
**Catches** `shadow-md` instead of an elevation token. **Instrument** ratchet.

### B6 · Numeric z-index
**Catches** `z-50`, `z-[9999]`, bare `zIndex: 40`. **Instrument** perimeter, then
hard. **Why** stacking is a system-wide contract; ad-hoc numbers are how modals
end up under drawers. Requires a named layer scale to exist first.

### B7 · Ungoverned radius
**Catches** arbitrary radius values outside the scale. **Instrument** ratchet.

### B8 · Arbitrary spacing
**Catches** `p-[13px]`, `gap-[7px]`. **Instrument** hard at zero. **Pairs with**
B9 — banning this without allowing the half-step leaves no way to express an
optical fix.

### B9 · Off-scale spacing step
**Catches** half-steps (`mt-0.5`) outside the declared scale. **Instrument**
ratchet-as-approval-workflow. **Why not hard** with B8 at zero this is the only
remaining form for a real baseline alignment; the ratchet turns each new use into
a visible, approvable diff. **Trap** exclude icon sizing — `h-3.5` is a different
scale and a different problem.

### B10 · Inline style object
**Catches** static presentation in a `style` attribute. **Instrument** hard.
**Essential carve-outs**, or the rule is unusable: (a) an object containing
*only* custom-property assignments is the authorised bridge for a genuinely
dynamic value; (b) an animation library's transform/opacity keys on its own
elements are runtime values. Everything else is presentation that belongs in the
system. **Elsewhere** `sx={{ … }}` literals; inline `style=` in templates.

### B11 · Alpha concatenated onto a token
**Catches** `token + "80"`, `` `${color}CC` `` — building a translucent colour by
string surgery on a token. **Instrument** hard. **Why** it defeats the token
silently: the base can change and the result stays plausible while the contrast
does not. **Fix** a real alpha token, or the colour function.

### B12 · Bootstrap raw value
**Catches** literals in the pre-stylesheet inline `<style>`, the splash markup,
and `element.style.x = "#…"` in the entry HTML. **Instrument** hard. **Why**
running before the stylesheet is not an exemption; this is the first thing the
user sees.

---

## C. Consumption and boundaries

### C1 · Tier bypass (primitive consumed directly)
**Catches** a component/pattern/template referencing a primitive token.
**Instrument** hard once the semantic tier is complete. **This is the rule that
tells you whether the architecture is real.** **Deliberate looseness** semantic
aliases *are* valid runtime inputs — flag only primitive consumption. Requiring
the exact component-tier role everywhere is a review guideline, not a guard rule;
enforce it only where an atom actually exposes that API.

### C2 · Upward import
**Catches** a component importing a pattern, a pattern importing a template, a
domain module importing presentation. **Instrument** hard. **Elsewhere** any
layered architecture: this is the standard dependency-direction check applied to
the DS ladder.

### C3 · Domain purity
**Catches** a domain/logic module importing a UI framework, or referencing a
design token. **Instrument** hard. **Why** it keeps the DS out of the engine and
the engine testable without a DOM.

### C4 · Deep import past the barrel
**Catches** importing a DS internal directly instead of through the public entry.
**Instrument** ratchet → hard. **Why** it is how private components acquire
external consumers and stop being changeable.

### C5 · Forbidden primitive component
**Catches** importing a vendored/low-level component that the system has
deliberately wrapped (e.g. the raw alert-dialog when a governed Dialog exists).
**Instrument** hard, one rule per named replacement. **Why** it is precise, has
no false positives, and each one retires a whole class of drift.

---

## D. Component ownership

### D1 · Raw native control
**Catches** `<button>`, `<input>`, `<select>`, `<textarea>` in patterns and
templates where a DS atom exists. **Instrument** ratchet → perimeter.
**Essential carve-outs**: `input type=range|radio|checkbox|file|search|hidden`
and `readOnly` have no atom; a `button` carrying `type="submit"`, `role`,
`aria-expanded|controls|pressed|selected`, or a semantic component class is
specialised native semantics, not a bypassed atom. **Without these the rule is
noise and gets deleted** — which is worse than not having it.

### D2 · Owned-style override
**Catches** a consumer that substantially re-skins a DS atom. **Instrument**
hard. **Method** define presentation *groups* per component — background,
foreground, radius, size, weight, border, shadow — and flag when the number of
groups the consumer overrides reaches a per-component threshold (5–7 in practice).
Include groups set via the `style` attribute, not just classes.
**Why count groups, not classes** one override is a legitimate local tweak;
overriding six independent aspects means the atom contributes nothing but a tag
name, and the design system is decorative. **Tuning** set the threshold from the
measured distribution, not from taste: look at the histogram of group counts and
put the line above the bulk.

### D3 · Showcase coverage
**Catches** an exported DS component that the showcase does not both import and
render. **Instrument** hard. **Why** a showcase that documents a subset is worse
than none, because it is trusted. **Trap** check both halves; an import proves
nothing and a render without an import is a copy.

---

## E. Motion

### E1 · Motion literal
**Catches** `duration`, `delay`, `ease`, `stiffness`, `damping`, `mass`, `bounce`
given as literals outside the named preset modules — in transition props, spring
hooks, and CSS `animation`/`transition` declarations. **Instrument** hard.
**Why** motion is a system-level language; ad-hoc timings are why an app feels
assembled rather than designed. **Rule** only the named preset module owns
physics; consumers import an *intent* (feedback, disclosure, overlay, layout),
never a component name.

### E2 · Raw motion-driven control
**Catches** an animation library's intrinsic control elements (`motion.button`,
`motion.input`) used directly. **Instrument** hard. **Why** it silently bypasses
every accessibility and state behaviour the DS atom provides, while looking like
an enhancement.

### E3 · Reduced-motion contract
**Catches** infinite animations and decorative transitions that survive
`prefers-reduced-motion: reduce`. **Instrument** hard where statically
detectable; otherwise a browser check. **Contract** no infinite animation stays
active; focus, state and comprehension never depend on movement.

---

## F. Accessibility from the token graph

The parts of accessibility that are *static* and therefore cheap. The rest
belongs to a browser pass — see `design:accessibility-review`.

### F1 · Contrast AA on token pairs
**Catches** a declared background/foreground token pair below 4.5:1, **per mode**.
**Instrument** hard. **Why it belongs here** it is computed from the token graph
in milliseconds and covers dark mode, which screenshot tests rarely do. **Method**
resolve both tokens through their aliases, parse to RGB, WCAG relative luminance.
**Trap** an unresolvable pair is a finding, not a skip — silently skipping is how
a pair drops out of coverage during a rename.

### F2 · Tonal pair bypass
**Catches** a tonal surface built with alpha (`bg-primary/10`) paired with the
base role foreground (`text-primary`) instead of the `container` /
`on-container` pair. **Instrument** hard. **Why** the effective contrast depends
on what is behind the translucent surface, so F1 cannot verify it and neither can
a reviewer. **Carve-outs** only flag when the element actually renders text, and
ignore interaction-only backgrounds (`hover:`, `focus:`) — those composite over a
known base. **Prerequisite** the container pair must exist on every surface (A10),
or you are flagging the only available form.

### F3 · Structural semantics
Clickable non-interactive elements without role and keyboard handling, nested
interactives, images without alt text, dialogs without an accessible name,
landmark and heading ownership. **Instrument** hard, on the product-reachable
graph only. Large enough to be its own guard; mentioned here because it belongs
to the same scope model and the same test discipline.

---

## G. Generated artifacts

### G1 · Content-addressed generated CSS
**Catches** manual edits to a generated stylesheet. **Method** derive each
generated class name from a hash of its normalised declarations; the guard
recomputes the hash and rejects any mismatch, any declaration outside a
content-addressed rule, and an empty file. **Why** it makes the artifact
self-verifying: there is no way to hand-edit it that survives.

### G2 · Generated/referenced parity
**Catches** a generated class referenced but not defined, or defined but orphaned.
**Instrument** hard. **Why** deleting a source must prune its rules; otherwise
generated files only grow.

### G3 · Asset family parity
**Catches** divergence within a single logical asset — icon raster sizes, vector
path, manifest colour, inline splash markup. **Instrument** hard. **Why** these
are edited one at a time and nobody looks at the 32px favicon. **Method** verify
presence, raster dimensions, normalised vector-path equality, and colour values
resolved against the token graph.

---

## Choosing what to implement first

Rough order by value per hour, for a repo with nothing:

1. **A1–A11** — the whole token-source block. Fast, absolute, and a fresh token
   file passes it. This is the foundation everything else assumes.
2. **B1, B2** — literal colours and arbitrary values. The two biggest sources.
3. **C1** — tier bypass. The rule that answers "is this architecture real".
4. **F1** — contrast AA. Highest value per line of code in the catalog.
5. **D1, D2** — component ownership. Needs the atoms to exist first.
6. **E1** — motion literals. Needs a preset module first.
7. Everything else, as the corresponding structure appears.
