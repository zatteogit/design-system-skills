# Design system skills

Two agent skills for building a design system in code and keeping it aligned with
Figma. Plain `SKILL.md` in the open Agent Skills format — no vendor lock-in, no
runtime, no dependencies.

| Skill | What it covers |
|---|---|
| **`design-system-code`** | Building and enforcing a design system inside a codebase — token tiers nothing can skip, and guards that stop the code drifting off them. New and existing projects need different guards; there is a path for each. |
| **`figma-code-sync`** | Keeping an existing Figma design system aligned with the code as the code changes — token parity, component parity, contrast, templates, and the DTCG pipeline. |

## Install

Every agent below reads the same `SKILL.md` format. Pick the directory yours
scans:

| Agent | Personal | Per project |
|---|---|---|
| **Codex CLI** | `~/.agents/skills/` | `<repo>/.agents/skills/` |
| **Cursor** | `~/.agents/skills/` or `~/.cursor/skills/` | `.agents/skills/` or `.cursor/skills/` |
| **Claude Code** | `~/.claude/skills/` | `<repo>/.claude/skills/` |
| **Anything else** | check its docs for a skills root | — |

```bash
git clone https://github.com/zatteogit/design-system-skills.git
mkdir -p ~/.agents/skills
cp -R design-system-skills/skills/* ~/.agents/skills/
```

`~/.agents/skills/` is the widest-reach location — Codex and Cursor both scan it,
and Cursor also falls back to `~/.claude/skills/`. To cover an agent that only
reads its own directory, symlink rather than copy twice:

```bash
ln -s ~/.agents/skills/design-system-code ~/.claude/skills/design-system-code
ln -s ~/.agents/skills/figma-code-sync    ~/.claude/skills/figma-code-sync
```

Most agents load a skill on their own when the work matches its `description`;
the descriptions here are written for that. An agent without skill discovery can
still use them — point it at `SKILL.md` and it will follow the same instructions.

## Requirements

- **`design-system-code`** needs nothing but Node 18. It works on any stack; the
  token parser handles CSS custom properties and Sass variables, and the rest is
  language-agnostic.
- **`figma-code-sync`** needs the **Figma MCP server** connected to your agent —
  that is what provides `use_figma`, `get_metadata` and `get_code_connect_map`.
  MCP is an open protocol, so this is not tied to any one agent. The Figma server
  also serves its own guidance (`figma-use` and friends) as MCP resources.

## The runnable parts

```
skills/design-system-code/assets/
  ds-guard-starter.mjs        a design-system guard: token tiers, reachability, cycles,
                              contrast, perimeter, per-file ratchet. Node 18, no deps

skills/figma-code-sync/assets/
  figma-census.js             READ-ONLY Figma census, five modes (file / page / graph /
                              board / dtcg). Runs through the Figma MCP; it only returns
  merge-component-graph.mjs   unions per-page graphs, then reports orphans, ghost mains,
                              cycles and upward nesting — none of which mean anything
                              measured on a single page
  dtcg-verify.mjs             the token pipeline's CI gate: diffs a DTCG export against
                              the code's own token file and separates the four classes
                              of divergence
```

All dependency-free. `figma-census.js` never mutates anything — every path ends
in a `return`.

## Why they are shaped like this

They were not designed and then written. They were **extracted from two
independent implementations of the same idea** in real codebases, and then
repeatedly run against real files. Where the two implementations agreed became
doctrine; where they disagreed turned out to be the same system at two stages of
one trajectory.

The rules that look oddly specific are the ones that cost something. A few of the
defects that shaped them — every one found by *executing*, none by reviewing:

- a scale-monotonicity check that reported `n: 0` on every scale and **looked
  like it passed**, because it never resolved aliases and so discarded every
  member as "not a number";
- a `:root` block matcher that reported "block not found" on a file whose `:root`
  block was the first thing in it — the file opened the scope with a *selector
  list* — and then silently skipped every downstream contract;
- an import walker that stopped at the entry file, because TypeScript ESM writes
  the specifier as the emitted path (`./x.js` → `x.ts` on disk): **1 file
  reachable out of 336**, and a perimeter of one file passes everything;
- contrast pairs derived from token *names*, which invented dozens of pairs that
  do not exist. The fix was to stop deriving and read the pairs off the canvas;
- a component graph counting only component→component edges, so a template page
  holding thousands of instances contributed nothing and the whole library
  reported as orphaned.

The lesson they share, and the one thing worth taking from this repo even if you
use none of the code:

> **A clean result can be clean because the rule looked at nothing.**

So every rule here has a **negative** probe as well as a positive one, and a rule
that fires on everything is made to refuse rather than be tuned: the guard says
*"there is no primitive tier here, this is one flat tier, not 207 defects"*
instead of emitting 207 identical findings.

## A note on what is inside a skill

A skill is read by an agent, so it carries **mechanisms, not anecdotes**. "Resolve
aliases before comparing" is weak on its own; "a scale usually lives in the
semantic tier, so its values are aliases — read them directly and every member is
silently discarded as non-numeric" is the mechanism, and the mechanism is what
survives an agent that thinks it knows better.

Numbers appear in two places only, because in both an agent needs them to act:
**calibration** (you cannot tell whether an instance-to-frame ratio of 0.16 is bad
without something to compare it against) and **expectations that prevent a wrong
inference** (a template page yields zero edges; a consumer file reports zero local
variables and can still be fully tokenised). The war stories live here in the
README, where a human decides whether to adopt this — not in the skills, where
they would only be longer.

Figures from **public** artefacts are exact and reproducible: the Material 3
Community kit and a four-year-old fork of it, and the
[Shoelace](https://github.com/shoelace-style/shoelace) repository, where the
guard was installed as a third-party test. Figures that came from private files
are given as shapes.

## Licence

MIT.
