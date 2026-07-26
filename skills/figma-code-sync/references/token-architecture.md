# Token architecture: tiers, naming, theming

Condensed from the DTCG format spec, Figma's own token guidance, and Nathan
Curtis's naming taxonomy. Sources at the bottom.

## Three tiers, not two

| Tier | Holds | Named for | Example |
|---|---|---|---|
| **Primitive** (global, option) | raw values, no context | *what it is* | `blue/500`, `space/16` |
| **Semantic** (alias, decision) | intent and role | *what it does* | `color/action/primary` |
| **Component** | per-component overrides | *where it applies* | `button/bg/hover` |

Two rules make the tiers real:

- **Component tokens reference semantic tokens, never primitives directly.**
  Skipping the middle tier is how a rebrand becomes a find-and-replace.
- **Semantic tokens reference primitives directly — do not chain aliases.**
  Figma's own guidance: chains are hard to trace and harder to fix. One hop.

A third tier is optional. Most systems need very few component tokens; if the
component tier is large, the semantic tier is probably under-specified.

**These three are the *token* ladder, and it is not the only one.** Components
have their own ladder — elements → atoms → composites → patterns → templates —
because components consume each other, and it is usually five levels rather than
three. The two are independent and meet at exactly one point: a component
consumes component-tier or semantic tokens, never primitives. Measure both; a
file can be perfectly tiered on one and flat on the other. See
[component-tiers.md](component-tiers.md).

**Layout is a semantic family people forget to create.** Page margin, gutters,
column count, content max-width, section rhythm, header height — these are
semantic tokens (`layout/page/margin`, not `space/24`), they are the natural home
of the breakpoint modes, and they are routinely typed in as bare numbers on the
very boards whose contents are perfectly tokenised. See
[template-composition.md](template-composition.md).

**"Start within, then promote."** Begin a decision local to the component. Promote
it to the semantic tier once **three or more** unrelated components need it.
Globalising early creates tokens nobody can safely change later.

## A tier is only real if nothing skips it

The test is not the naming, it is the consumption. Count direct bindings from
nodes to the primitive collection (recipe in `census-recipes.md`). A large number
means the tier is nominal — the primitives *are* the public API, whatever the
label says.

**Make primitives genuinely hard to reach:**
- In Figma, prefix the collection name with `.` or `_` to make it **private** —
  it disappears from the picker while still resolving. This is stronger than
  scoping, and stronger than hoping.
- Scope every variable to the properties it may apply to. Never `ALL_SCOPES`.
- For contract values that must never be applied to a node (a breakpoint
  threshold, a ratio), use **empty scopes**.

## Naming: the canonical taxonomy

Nathan Curtis's levels, in the recommended order:

```
[namespace] [object] [category] [concept] [property] [variant] [state] [scale] [mode]
  esds-      button-   color-     action-   text-      primary-  hover-   -       on-dark
```

- **namespace** — system / theme / domain (`esds`, `ocean`, `retail`)
- **object** — component group, component, element (`forms`, `input`, `left-icon`)
- **category** — `color`, `space`, `size`, `font`, `elevation`, `time`
- **concept** — semantic grouping (`action`, `feedback`, `heading`)
- **property** — `text`, `background`, `border`, `weight`
- **variant / state / scale / mode** — appended last

**No token uses every level.** Include only what disambiguates. The most common
naming failure is redundancy: `shape-tile-radius-default-on-light` where
`shape-tile-corner-radius` says the same thing.

Other traps worth naming:
- **Homonyms** — avoid words with two meanings in your domain (`type`, `size`).
- **Order drift** — there is no universally correct order; internal consistency
  beats any particular choice. Pick one and enforce it.
- **Polyhierarchy** — the same value legitimately belongs in two places
  (`color/feedback/error` and `ui/text/error`). Do not duplicate the value:
  alias one to the other.
- **Ordinal names are not semantic names.** `radius/sm`, `space/2` say "the small
  one", not what it is for. They belong to the primitive tier. Do not promote
  them just because they read like design words.

**The rebrand test:** name every token for what it *does*, not what it *is*. If
`color/brand/green` survives a rebrand to blue, the name has already failed.

## Theming

**Theme and mode are orthogonal.** A theme is a brand/visual variation; a mode is
a rendering context (light/dark, contrast, density, breakpoint). Do not collapse
them into one axis — you will need their product eventually.

**The theme lives in the semantic tier.** Primitives are absolute and immutable:

```
Primitives   modes ["Value"]           green/500 = #0fb478
Semantic     modes ["Light","Dark"]    bg → Light: {green/50}
                                          Dark:  {green/950}
```

The anti-pattern is a primitive whose *value* changes per theme — `ink/950`
near-black in light and near-white in dark. Then the name describes one theme and
lies in the others, the dark palette cannot be reviewed as pigment choices, and
nothing can refer to a specific colour stably. If a codebase implements dark mode
by redefining reference variables rather than re-aliasing semantic ones, say so
before mirroring it into Figma.

### Figma mode limits are plan-dependent — design for them
| Plan | Modes per collection |
|---|---|
| Free / Starter | 1 |
| Professional | up to 4 |
| Organization / Enterprise | 40+ |

This constrains architecture, not just convenience. Light/Dark × 4 breakpoints is
8 combinations — impossible on Professional in one collection. **Split orthogonal
axes into separate collections** (one for theme, one for breakpoint, one for
density); Figma resolves them independently and the product is free. Check the
plan before designing the mode matrix.

## Typography and motion need a semantic tier too

Both almost always end up as primitives consumed directly — `text-sm`,
`duration-200` — and then the system has a semantic tier for colour and an
ordinal scale for everything else. The consequence is the same as for colour: no
decision is expressible, so no decision can be changed.

### Typography

```
Primitive   --_ref-size-14, --_ref-lh-20, --_ref-weight-600
Semantic    --text-body → {size, line-height, weight, tracking}
            roles: display, title, heading, body, meta, caption
```

Three rules that make it work:

### Slash folders or flat names

Figma groups by slash, so `colors/accent/hover` folds neatly in the picker. It
has one hard cost: **a CSS custom property name cannot contain a slash** — it is
a `<dashed-ident>`, and `/` is not a valid identifier character. So a slashed
Figma name can never be *the same string* as the code token, and every bridge
between the two sides — the value diff, a name map, a DTCG round-trip — has to
carry a transformation that can drift.

The resolution follows from who reads the name:

- **Tokens that appear in a picker** (semantic and component tiers) earn their
  slashes: grouping is the whole reason a designer can find them.
- **Private primitives appear in no picker by construction** — that is what the
  `.`/`_` collection prefix is for — so slashes buy them nothing and cost the
  name identity. Keep them flat.

Name identity is not a tidiness preference: it is what makes a diff exact
instead of heuristic. → [dtcg-pipeline.md](dtcg-pipeline.md)

- **Name the role, not the size.** `text-body`, not `text-sm`. `sm` is an ordinal
  primitive; promoting it because it reads like a design word is the most common
  version of the mistake this document warns about.
- **Line height travels with size.** A size token without its paired line height
  is half a token, and the missing half gets guessed per component. Treat
  `{size, line-height}` as one indivisible decision — if only one of the two is
  reachable from a utility class, expect hardcoded values for the other.
- **Six roles is usually enough.** If the scale needs eleven, some of them are
  component decisions that have not been recognised as such.

### Text styles vs variables — the distinction that costs a day

They are different objects with different capabilities, and the difference is
not documented anywhere obvious:

| | Figma **variable** | Figma **text style** |
|---|---|---|
| Holds | a single value | a composite (family, size, line height, weight, spacing…) |
| Modes | yes — resolves per mode | **no** |
| Applied to | a bindable property | the whole text node |

### The test for a tier that is not there

"Name for what it does" is the rule for semantics. The operational test is its
inverse, and it is the one that catches a fake tier: **a primitive named after its
use means the tier does not exist.** `--_ref-text-display` aliased by
`--text-display` is role → role — two names, one meaning, and a primitive tier
that is a copy of the semantic one wearing a prefix.

The tell is countable, which makes it worth measuring rather than arguing about:
**the same value appearing under several names.** On one file, nineteen duplicated
colour values and five distinct line-height ratios serving six roles. Renaming the
lower tier by *step* rather than by role collapsed the duplicates on its own — the
duplication was the symptom of the missing distinction.

And the condition for having two tiers at all: **introduce a second tier when
something separates them — a mode, a theme, a scale.** Not for symmetry with an
axis that does have a separator. Where nothing separates them, one tier fewer is
better than one more, because an extra tier *looks* done and hides that the
distinction was never made.

**A text style has no mode axis of its own.** So a role that must change between light/dark,
compact/comfortable, or mobile/desktop cannot express that change through the
style. The workable arrangement:

- decompose the role into variables for the parts that must vary by mode
  (usually size and line height);
- keep the text style as the applied composite, with those variables bound to its
  properties where the file supports it;
- accept that anything the style holds directly is mode-invariant, and say so in
  the token documentation.

The failure this prevents: building a responsive type scale as four text styles
per role, then discovering that swapping them requires touching every text node —
the exact "mode before variant" mistake from §2 of `SKILL.md`, in the one place
where a mode genuinely cannot be used for part of the job.

### Motion

Same structure, and the same reason:

```
Primitive   --_ref-dur-150, --_ref-ease-out-cubic
Semantic    --motion-feedback, --motion-disclosure,
            --motion-overlay, --motion-layout
```

**A motion preset names the role of the interaction, not the component that
happens to use it.** `--motion-dropdown` is a component token pretending to be
semantic; `--motion-disclosure` is the decision, and the dropdown, the accordion
and the details panel all consume it — which is what makes them feel like one
product.

Two things that belong in the same tier and are usually forgotten:

- **Easing is a semantic decision, not a curve.** Entrances, exits and
  position changes want different curves; exposing only `--ease-standard`
  guarantees per-component improvisation.
- **Reduced motion is part of the contract**, not an optional theme. Under
  `prefers-reduced-motion: reduce` no infinite animation stays active, decorative
  transitions are removed or reduced, and focus, state and comprehension never
  depend on movement. Encode it where the presets live, so consumers get it for
  free rather than each remembering.

Figma has no motion variables in the CSS sense; durations and easings live as
number and string variables and as prototype settings. Mirror the *names* even
where the file cannot execute them — a designer choosing "disclosure" from a list
is the point, and it keeps the two sides speaking the same language.

## DTCG conformance

Format Module 2025.10. Useful whether or not you export to it, because it is the
interchange format for Style Dictionary, Tokens Studio and the rest.

- A token is `{ "$value": …, "$type": … }`. `$value` is what makes it a token
  rather than a group.
- `$type` may be declared on the token or **inherited from the parent group**.
  Resolution: explicit → resolved reference → nearest parent group. Tools must
  **not** infer type from the value.
- Types: `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`,
  `cubicBezier`, `number`, `strokeStyle`, `border`, `transition`, `shadow`,
  `gradient`, `typography`.
- **`dimension` is `{value, unit}`** with `unit` required even when the value is
  zero. Figma FLOAT variables carry no unit — record it, or the export is lossy.
- Aliases: `{group.token}`. Chains resolve; cycles are invalid and must be
  detected.
- `$description` is part of the token, not a nicety. `$deprecated` marks
  retirement without deletion — better than removing a token people still use.
- **Names may not contain `.` `{` `}` nor start with `$`.** Figma's `/` grouping
  maps to DTCG nesting: `color/bg/primary` ⇄ `color.bg.primary`.

## Governance: what actually stops drift

Industry consensus, and it matches what breaks in practice:

- **Code is the source of truth; Figma is a representation.** Not because design
  matters less, but because code is what ships and what users see.
- **Treat token changes like code changes** — versioned, reviewed, documented. A
  token PR is a design decision with a diff.
- **Drift arrives through detaching, overriding and one-off fixes**, not through
  malice. A detached instance is invisible debt: count them (recipe in
  `census-recipes.md`).
- **Bake adherence into tooling so the right way is the path of least
  resistance.** Governance documents do not stop drift; ratchets and linters do.
- **Vague ownership stalls systems** more often than technical problems. If no
  one owns a collection, it rots.
- **Code Connect** links Figma components to real source, so Dev Mode shows
  production code instead of generated approximations. Start with a few
  high-impact components rather than attempting full coverage.

## Sources

- DTCG Format Module — <https://www.designtokens.org/TR/drafts/format/>
- Figma, *Design tokens: how to sync design and code* —
  <https://www.figma.com/resource-library/design-tokens/>
- Figma Learn, *Create and manage variables and collections* —
  <https://help.figma.com/hc/en-us/articles/15145852043927>
- Figma, *Code Connect* — <https://developers.figma.com/docs/code-connect>
- Nathan Curtis, *Naming Tokens in Design Systems* —
  <https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676>
- Nathan Curtis, *Reimagining a Token Taxonomy* —
  <https://medium.com/eightshapes-llc/reimagining-a-token-taxonomy-462d35b2b033>
