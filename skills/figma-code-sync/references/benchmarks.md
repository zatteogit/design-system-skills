# Field calibration

Measured numbers from real files, so a census result can be situated instead of
guessed at. Every figure here was produced by the recipes in this skill, run
against the actual file — nothing is estimated. Figures from **public** files are
given exactly; figures from private ones are given as shapes, which is all you
need to calibrate against.

Thresholds in the rest of the skill are deliberately few, because the useful
comparison is almost never against an absolute. It is against **sibling artefacts
in the same file**, or against the numbers below.

All four are **public Community files**. Measure them yourself: Community files
cannot be read by the Figma MCP directly — both `use_figma` and `get_metadata`
need edit access — so the route is Home → Community → open the card → *Open in
Figma* → **Make a copy**, then run the census on the copy. Same numbers. That is
the point: this table is checkable, and a file key is not needed to check it.

## The four systems measured

| | **Material 3 Design Kit** | **iOS and iPadOS 27** (Apple) | **Simple Design System** | **A 4-year-old fork of M3** |
|---|---|---|---|---|
| Pages | 33 | 45 | 30 | — |
| Variables | 304 in 4 collections | 283 in 6 collections | **347 in 6 collections** | **0** |
| Colour variables | 197 | 69 | 236 | 0 |
| …of which aliased | **0** — all literals | **1 of 69** | **132 of 136** in the semantic collection | — |
| Modes | **32 in one collection** | 12 (Dynamic Type), 3, 2, 2, 1 — one axis each | SDS Light/Dark; Desktop/Tablet/Mobile | — |
| Paint styles | **727** | 50 | **1** | 339 |
| Text styles | 30 | 34 | 16 | 15 |
| Variable descriptions | **0 / 304** | **0 / 283** | 41 / 347 (12%) | — |
| `codeSyntax` set | **0 / 304** | **0 / 283** | **347 / 347 (100%)** | — |
| `ALL_SCOPES` | 57 / 304 | 110 / 283 | 120 / 347 | — |

### On a content page

The same page in each: the one the kit calls **Examples**, where it assembles
screens out of its own components. This is the measurement that says whether the
system is used, as opposed to merely present.

| | **Material 3** | **iOS/iPadOS 27** | **Simple Design System** | **The M3 fork** |
|---|---|---|---|---|
| Nodes | 2 460 | 9 189 | 3 542 | — |
| Fills: bound · via style · literal | 1090 · 9 · 71 | 2507 · 175 · **2562** | **1577 · 0 · 20** | 0 · **1833** · 68 |
| Share of fills bound | 93% | **48%** | **99%** | **0%** |
| Instances : frames | 519 : 1080 (**0.48**) | 3059 : 2301 (1.33) | 1372 : 545 (**2.52**) | 203 : 1263 (**0.16**) |
| Text nodes on a token | 419/428 (98%) | 1837/2247 (82%) | 1091/1093 (**99.8%**) | — |
| Slot nodes | 6 | 162 | **224** | — |

## What the numbers say

**Two of the three vendor kits have no semantic colour tier.** Material 3: 197
colour variables, every one a literal. Apple's iOS kit: 68 of 69 literal. Both
ship the palette and nothing above it. Simple Design System is the counter-example
— 100 literal primitives in one collection, 132 aliases in a second — and it is
the one authored as an example of how to build a system rather than as a kit to
consume.

**Be fair about why.** A vendor kit is meant to be re-themed by a generator, not
maintained by hand, and a generated palette has no reason to alias. But the
consequence for an adopter is real: **you inherit a palette with no semantic layer
of your own.** With M3 you also inherit the colour system twice — 197 variables
*and* 727 paint styles expressing the same decisions. Plan the semantic tier you
will put on top before you adopt, not after.

**Many modes is not the anti-pattern; multiplied axes is.** This is the
distinction the table makes visible. Apple's *Dynamic Type* collection carries
**12 modes** and they are one honest axis — the system text sizes, xSmall through
AX5 — with the iPhone/iPad split kept in a *separate* collection. M3 carries
**32 modes in one collection**, which is light/dark × three contrast levels ×
colour themes multiplied together. Twelve modes on one axis is a system; 32 modes
across four axes is a combinatorial explosion that also puts the file beyond most
plans (32 modes needs Enterprise; on Professional's limit of 4 those variables
cannot exist). Count the *axes*, not the modes.
→ [token-architecture.md](token-architecture.md)

**`codeSyntax` is the tell of who the file was built for.** Zero in both vendor
kits — 0 of 304 and 0 of 283 — and **100% in Simple Design System**, where every
one of 347 variables names its counterpart in code. This is the field DTCG export
and Code Connect both want. Its presence tells you whether the file was authored
with a code handoff in mind at all; its absence tells you the bridge has to be
built before either can work. Do not treat "we have tokens" and "we have a code
mapping" as the same claim — check.

**Nobody documents tokens, including the systems that do everything else right.**
0 of 304, 0 of 283, 41 of 347. The best of the four is at 12%. If your file has
descriptions at all it is already unusual — which is an argument for writing them,
not for skipping them, because an undocumented token is one somebody will
duplicate.

**Colour lives in variables now, but the styles are still there.** Simple Design
System has **one** paint style; M3 has 727. A census that reads only
`boundVariables` under-reports on any file with a large style count, and a
migration that moves colour to variables without deleting the styles leaves two
carriers for the same decision.

**The instance-to-frame ratio separates the three kits by a factor of five, and
the surprise is which way.** Simple Design System assembles its examples almost
entirely out of instances (2.52). Apple sits at 1.33. **Material 3 is at 0.48** —
more raw frames than instances on its own Examples page, which puts the most
adopted kit in the world closer to the abandoned fork (0.16) than to the
well-built system. Read this before concluding that a low ratio means an amateur
file: it means the *page* was drawn rather than composed, and vendors do it too,
usually because the example is a picture of a screen rather than a screen.

**A large variable count does not mean the canvas uses them.** Apple's kit has
283 variables and **2562 literal fills on one page** — 48% of fills bound, and
82% of text on a token. Simple Design System has fewer nodes and **20** literal
fills in total. This is the gap between "the tokens exist" and "the tokens are
what the file is made of", and only a page census shows it; the collection
inventory looks healthy in both.

**Slots are being adopted now, so their absence has stopped being neutral.**
224 slot nodes on one page in Simple Design System, 162 in Apple's kit — against
6 in Material 3. In a library built before slots went GA, zero is just history;
in a kit shipped in 2025–26, zero means composition is still being expressed with
`INSTANCE_SWAP` and booleans. Check the file's age before reading the number.
→ [slots.md](slots.md)

**A stale copy is recognisable by shape, not by date.** The four-year-old fork
shows all three signatures at once: no variables (they did not exist when it was
forked), **every fill routed through a style and none bound**, and an
instance-to-frame ratio of **0.16** — a library that is mostly loose frames, so
nothing downstream can inherit a fix. The lesson generalises to forks inside a
company: measure the fork, do not assume it tracks its origin.

## How to use these

- **Adopting a kit?** Run the token inventory before you build on it. The alias
  count tells you whether there is a tier to hang your semantics on; the
  paint-style count tells you what else you are inheriting; `codeSyntax` tells you
  whether a code bridge exists or has to be built.
- **Auditing your own file?** Simple Design System is the realistic target, not
  M3: a real primitive→semantic split, orthogonal axes in separate collections,
  colour in variables rather than styles, and `codeSyntax` filled in. Its weak
  spot — descriptions at 12% — is the one place to beat it.
- **A number far outside every column** is usually a measurement bug, not a
  discovery. Check the file's role first
  ([census-recipes.md](census-recipes.md)) — a consumer file legitimately reports
  zero local variables while being fully tokenised.
