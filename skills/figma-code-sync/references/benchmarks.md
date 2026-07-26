# Field calibration

Measured numbers from real files, so a census result can be situated instead of
guessed at. Every figure here was produced by the recipes in this skill, run
against the actual file — nothing is estimated. Figures from **public** files are
given exactly; figures from private ones are given as shapes, which is all you
need to calibrate against.

Thresholds in the rest of the skill are deliberately few, because the useful
comparison is almost never against an absolute. It is against **sibling artefacts
in the same file**, or against the numbers below.

## The three systems measured

The first two columns are **public Community files** — duplicate them and you
will get the same numbers. The third is a healthy in-house system, described
qualitatively, as the shape to aim at.

| | **Material 3 Design Kit** (official, 1.12m users) | **A 4-year-old community copy** of it (855 users) | **A well-kept in-house system** |
|---|---|---|---|
| Variables | 304 in 4 collections | **0** | hundreds, split across per-domain collections |
| Modes | **32 in one collection** | — | one axis per collection: Light/Dark, Mobile/Desktop |
| Aliases in the colour collection | **0 of 197** — all literals | — | primitive → semantic throughout |
| Paint styles | **727** | 339 | none — colour lives in variables only |
| Text styles | 30 | 15 | a few dozen |
| Variable descriptions | **0 / 304** | — | roughly three quarters present |
| `codeSyntax` set | **0 / 304** | — | **none** |
| Style descriptions | 12 / 727 paint, 1 / 30 text | — | — |
| Fills on a content page | — | 0 bound · **1833 via style** · 68 literal | overwhelmingly bound |
| Instance : frame on a content page | — | 203 : 1263 (**0.16**) | — |

## What the numbers say

**The most-adopted design kit in the world has no semantic tier.** 197 colour
variables, every one a literal, zero aliases, in a single collection carrying
**32 modes** — light/dark × three contrast levels × fourteen colour themes,
multiplied into one axis. That is precisely the anti-pattern in
[token-architecture.md](token-architecture.md): orthogonal axes belong in
separate collections. It also puts the file beyond most plans — 32 modes needs
Enterprise; on Professional (4 modes) those variables cannot exist.

**Be fair about why.** M3 is a *kit* to be consumed and re-themed by a generator
plugin, not a system to be maintained by hand. Generated palettes have no reason
to alias. But the consequence for anyone adopting it is real and worth saying out
loud: **you inherit a generated artefact with no semantic layer of your own**, and
you inherit the colour system twice — 197 variables *and* 727 paint styles
expressing the same decisions. Plan the semantic tier you will put on top before
you adopt, not after.

**Nobody documents tokens.** 0 of 304 variables in the canonical kit and 12 of
727 paint styles; zero again in one production library; roughly three quarters in
the best system measured. If your file has descriptions at all, it is already unusual —
which is an argument for writing them, not for skipping them.

**`codeSyntax` is empty everywhere.** Zero in all three systems, including one
that ships both an app and a web product. The field that names each token's
counterpart in code — the thing DTCG export and Code Connect both want — is
consistently unused. Treat "we have tokens and Code Connect" as unrelated claims
until you have checked this.

**A stale copy is recognisable by shape, not by date.** The four-year-old fork
shows all three signatures at once: no variables (they did not exist when it was
forked), **every fill routed through a style and none bound**, and an
instance-to-frame ratio of **0.16** — a library that is mostly loose frames, so
nothing downstream can inherit a fix. The lesson generalises to forks inside a
company: measure the fork, do not assume it tracks its origin.

## How to use these

- **Adopting a community kit?** Run the token inventory before you build on it.
  The count of aliases tells you whether there is a tier to hang your semantics
  on; the paint-style count tells you what else you are inheriting.
- **Auditing your own file?** The production-system column is a realistic good target, not the
  M3 one. Descriptions around 70%, a real primitive→semantic split, per-domain
  collections, modes kept to one axis each.
- **A number far outside all three columns** is usually a measurement bug, not a
  discovery. Check the file's role first
  ([census-recipes.md](census-recipes.md)) — a consumer file legitimately reports
  zero local variables while being fully tokenised.
