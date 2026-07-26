# The tier contract in code

Where each thing lives, what it may depend on, and how to prove the tiers are
real rather than nominal.

## The ladder

Two published contracts from independent codebases agree on the direction and
differ only in how finely they name the rungs. Use as many names as you can
enforce; three is a real system, seven is a mature one.

| Tier | Owns | Consumes | Typical home |
|---|---|---|---|
| **Primitives** | raw colour, dimension, duration, font values | nothing | one token file, private |
| **Semantic roles** | surface / content / action / border / feedback | primitives, own tier | same token file |
| **Domain roles** *(optional)* | dataviz, domain-specific palettes | primitives, semantic, own tier | same token file |
| **Component tokens & composites** | per-component roles, composite recipes, motion presets | semantic, own tier | token file + a preset module |
| **Context-free components** | the DS proper: control state, semantics, a11y | component tokens, own tier | `components/ds/` |
| **Product patterns** | domain composition and presentation logic | components, own tier | shared / feature UI |
| **Templates & routes** | shell, slots, orchestration | patterns, components | pages / routes |

**Each level consumes its own tier or the one directly below.** No upward
dependencies. No jumps to primitives. No raw visual values above the bottom rung.

**Same-tier consumption is legitimate; cycles are not.** Components consume each
other — an icon button imports an icon, a field imports a label and an input — so
"own tier" is a real allowance, not a loophole. What keeps it from meaning
nothing is the second half of the rule: **within a tier the dependency graph must
be acyclic.** Two components that each import the other are not peers; one of
them belongs a level up. Check it with the same cycle detection used on the token
graph — a strongly-connected component of size > 1 is the finding.

**Build bottom-up, and the order is a topological sort of that graph.** You
cannot build a card before the button inside it — or rather you can, and then you
inline a styled `<div>` because the atom does not exist yet. Most "why is this
page full of raw markup" is not laziness at assembly time; it is the residue of
building top-down. If you find yourself writing presentation at level *n*, the
thing you need at level *n−1* does not exist: stop and build it.

The template tier is a real tier, not "example pages". Naming it makes the
difference between a page skeleton and a route with content enforceable.

## Placing new code

Ask in order; the first clean yes is the tier:

- Is it an atomic value? → **primitive**
- Does it name a role independent of any component? → **semantic**
- Does it describe one component's visual or motion contract? → **component token**
- Does it work without knowing anything about this product? → **context-free component**
- Does it know the domain but not a route? → **pattern**
- Does it define structure, slots or orchestration for a page? → **template**

**If no answer is clean, the boundary is not clear enough to create the
abstraction yet.** Leave it local. This is the code form of "start within, then
promote": localise the decision, and promote it once three or more unrelated
consumers need it. Globalising early creates tokens nobody can safely change.

## Making primitives genuinely private

Scoping by convention only works if the convention is checkable. Pick a prefix
that a regex can find — `--_ref-*`, `--_p-*`, a `_private` module — and then make
its leakage a **hard rule**: the prefix may appear in the token source file and
nowhere else in the repo. One rule, unambiguous, no false positives.

This is stronger than documentation and stronger than folder structure, because
it survives someone who has read neither.

## Reachability, in both directions

The check that distinguishes a real architecture from a naming scheme. Run it
over the token source, as a hard rule.

**Downward — no orphan primitives.** Every private primitive must be referenced
by at least one public token (in any mode, plus the framework adapter block). An
unreferenced primitive is either dead or the sign that something bypasses the
semantic tier to reach it.

**Upward — no orphan public tokens.** Every public token must be reachable from
a consumer surface: exposed through the framework's theme block, or mirrored into
the runtime language for inline use. A public token reachable from neither is
invisible — someone will hardcode the value instead of finding it.

**The `RESERVED` map.** A few public tokens are legitimately consumed by neither
surface — a document-root baseline applied in a base layer, a framework's own
spacing multiplier. Keep them in a small named map **whose values are the
reason**, and check it in both directions:

```
for each reserved name: if it is no longer declared → finding (stale reserved)
for each public token:  if not exposed, not mirrored, not reserved → finding
```

The stale check is what stops the map becoming a junk drawer.

Emit the numbers even when everything passes:

```
reachability: T0 40/40 consumed; T1 118/120 consumed,
              96 theme-exposed, 74 runtime-mirrored, 3 reserved, 0 orphaned
              (illustrative shape — what matters is that both directions
               are reported, and that the two unconsumed T1 tokens are named)
```

Those counts are the honest description of the system, and they are the first
thing to compare after any refactor.

## Family completeness

A token family is only usable if it is complete **across every surface it is
consumed from**. Typography that exists as CSS variables but is missing two of
six roles in the framework's theme block cannot be reached by a utility class for
those two roles — and that is precisely where a hardcoded value appears.

Enumerate the product and require all of it:

```
for family in { typography, elevation, motion, radius, z-index, container pairs }
  for role in family.roles
    for surface in { token declaration, framework alias, runtime mirror }
      require present
```

Report the misses grouped by family, naming the surface: `typography: missing
@theme --text-meta--line-height, TS --lh-meta`. Grouping by family rather than by
token turns 14 findings into one actionable sentence.

**Container pairs deserve their own family.** For every tonal role, both
`--x-container` and `--on-x-container` must exist on every surface. A half-defined
pair is what forces the tonal-pair bypass (rule catalog) — the correct foreground
literally does not exist, so a consumer reaches for the base colour and contrast
becomes unverifiable.

## The graph must be valid

Three hard rules over the token graph, run **per mode** — light, dark, and every
selectable theme. Dark overrides get exactly the same audit as the root block;
they are where unresolvable references actually live, because they are written
later and reviewed less.

- **No unresolved references.** Every `var(--x)` resolves within its mode, or in
  the declared fallback scope. The framework adapter block resolves against the
  root block — model that explicitly rather than merging the maps, or you will
  hide real misses.
- **No cycles.** Depth-first with a three-state visit; report the cycle path, not
  just the token. A cycle usually means an alias was pointed at its own consumer
  during a rename.
- **Public tokens hold no pigment.** A semantic token whose value is a literal
  colour is a primitive wearing a semantic name. The inverse rule guards the
  framework adapter: every declaration there must alias a design-system token,
  with a short exact allow-list for the framework's own required constants.

**Composites are exempt from the raw-value rule, bare values are not.** A
downstream token may legitimately own a shadow, gradient, typography recipe or
transition — that is what a composite is. Only a *bare* colour, dimension or
duration above the primitive tier must be promoted. Encode the distinction as
"the whole value matches a single raw literal" rather than "the value contains a
literal", or the rule fights the architecture it is defending.

## Scale monotonicity

Any ordered scale — radius, spacing, type, elevation — should be checked for
strict monotonicity after resolution. It catches the copy-paste error where
`--radius-xl` ends up smaller than `--radius-lg`, which is invisible in review
and obvious on screen. Resolve `calc()` forms against the base before comparing.

## Theming

**Primitives are absolute; the theme lives in the semantic tier.** The
anti-pattern is a primitive whose *value* changes per theme — an `ink/950` that
is near-black in light and near-white in dark. Then the name describes one theme
and lies in the others, the dark palette cannot be reviewed as a set of pigment
choices, and nothing can refer to a specific colour stably.

If a codebase implements dark mode by redefining reference variables rather than
re-aliasing semantic ones, that is worth naming as a finding before mirroring it
into Figma — see `figma-code-sync`, where the same anti-pattern is what makes
modes unusable.

**Reduced motion is part of the contract, not an optional theme.** Under
`prefers-reduced-motion: reduce`: no infinite animation stays active, decorative
transitions are removed or reduced, and focus, state and comprehension never
depend on movement.

## The showcase is a governed consumer

If the system has a showcase / storybook / gallery, it is part of the contract:

**Every exported component must be both imported and rendered there.** Both
halves matter — an import without a render is a link that proves nothing, a
render without an import is a copy. Check it against the barrel file's exports;
it is ten lines and it is the difference between a showcase that documents the
system and one that documents its 2023 subset.

Keep the tiers visibly separate in the showcase — foundations, components,
patterns, templates — and mount the *production* implementations rather than
reproductions. A showcase built from copies drifts silently, which is the same
failure as a detached instance in Figma.
