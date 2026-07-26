# Installation

Everything needed to go from an empty repo to a running gate, and nothing that is
not needed. The dependency list is deliberately staged: **the starter needs
nothing**, and each further capability adds exactly one package.

## 0. Baseline — what the starter requires

Node 18 or later, and nothing else. No install step, no `node_modules`.

```bash
node --version
```

If the project is not a JavaScript project at all, this is still the only
requirement — the guard reads source as text and parses CSS itself. What changes
for a non-JS stack is `CONFIG.patterns` and `CONFIG.extensions`, not the runtime.

## 1. Drop in the guard

```bash
mkdir -p scripts && cp <skill>/assets/ds-guard-starter.mjs scripts/ds-guard.mjs
```

Then edit the `CONFIG` block: `mode`, `appRoot`, `tokens.file`, the mode block
selectors, `entries`, `aliases`, `exclude`. Run it read-only first — it should
print a scope line with a plausible file count:

```bash
node scripts/ds-guard.mjs --report
```

**The file count is the install check.** A perimeter of 12 files where you
expected 200 means the alias resolver is not resolving; a perimeter *larger* than
the scanned total means the walk is leaving the source tree. Fix that before
believing any other number.

## 2. Wire it

`package.json` — or the equivalent task runner:

```json
{
  "scripts": {
    "ds:check": "node scripts/ds-guard.mjs",
    "ds:report": "node scripts/ds-guard.mjs --report",
    "ds:baseline": "node scripts/ds-guard.mjs --update",
    "ds:census": "node scripts/ds-guard.mjs --log docs/ds-census.jsonl"
  }
}
```

`ds:census` belongs in the release script or a default-branch CI job, not in the
pre-commit hook — one line per release is a trend, one per commit is noise. It
still exits non-zero on failure, and it records the failing state rather than
skipping it, which is what you want in the history.

Greenfield projects should **not** add `ds:baseline` — there is no baseline, and
having the script invites creating one. Omit it until the day you consciously
decide the project has become a migration.

A pre-commit hook, kept in the repo rather than in each developer's `.git`:

```bash
mkdir -p .githooks
printf '#!/bin/sh\nnpm run ds:check\n' > .githooks/pre-commit
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

`git config core.hooksPath` is per-clone, so put it in the project's setup script
or README — otherwise the hook exists and runs for exactly one person.

CI, as its own step so the failure is legible:

```yaml
- run: npm run ds:check
```

**Both, not either.** A guard that only runs in CI is advisory: developers learn
to push and see. A guard that only runs pre-commit is skippable with `--no-verify`
and absent on other people's machines.

## 3. Optional dependencies, one per capability

Add these only when you add the corresponding rules. Each row is independent.

| Capability | Install | Why |
|---|---|---|
| AST rules (tier bypass, owned-style override, raw controls, motion literals) | `npm i -D ts-morph` — or use `typescript`, already present in most TS repos | Regex cannot tell which element a class belongs to, or which import a JSX tag came from |
| `oklch()` / `lab()` / `color()` tokens in the contrast check | `npm i -D culori` | The starter parses hex and `rgb()` only, and **reports** anything else as unresolved rather than guessing. Do not approximate a luminance |
| Guard tests | nothing — `node:test` is built in; `vitest` if the repo already uses it | Two probes per rule; the negative one is the important half |
| DTCG token pipeline | `npm i -D style-dictionary` | Buy the transforms, write the Figma side, own the verify step |
| Code Connect (component parity anchor) | `npm i -D @figma/code-connect` | Turns Figma↔code component matching from name-guessing into an exact join |

`ts-morph` is the one worth thinking about: it pulls in a TypeScript compiler
instance and makes the guard noticeably slower to start. If the pre-commit budget
matters, split the guard in two — the dependency-free contracts and ratchet on
every commit, the AST rules in CI.

## 4. Non-JavaScript stacks

The **model** transfers completely; the **detectors** do not. What changes:

| Piece | JS/TS | Elsewhere |
|---|---|---|
| Token source parsing | CSS custom properties | `syntax: "scss"` is built in; other formats (`.xcassets`, `colors.xml`, a Kotlin object) need a small parser |
| Pattern counting | regex over source | unchanged — it is text |
| Reachability | import graph | the language's import/include graph; the walker is ~40 lines |
| AST rules | `ts-morph` | `swift-syntax`, a `detekt` custom rule, `analyzer` for Dart |
| Contrast, cycles, families | pure functions on the token graph | unchanged |

### What actually happened on a real non-JS codebase

Tested against a production Bootstrap 5 + SCSS + HTML kit — no TypeScript, no JS
module graph. **It did not run unmodified**, and the two things it needed are
worth knowing in advance:

- **Sass variables are a different shape.** `$name: value;` at file scope, with
  `!default` / `!global` suffixes, no selector blocks, and therefore no modes.
  `CONFIG.tokens.syntax: "scss"` now covers this: the file *is* the scope, there
  is one implicit `Default` mode, and references are `$name` rather than
  `var(--name)`. Everything downstream — cycles, unresolved references,
  reachability, contrast — worked untouched once the parser matched.
- **A flat token file makes the pigment rule degenerate.** With no private-prefix
  convention in the codebase, every token is "public" and every colour literal is
  a finding: 43 identical items. The guard now detects this and reports **one**
  structural finding instead — *"no primitive tier is declared; this is one flat
  tier, not 43 defects"*. Same principle as everywhere else in this skill: a rule
  that fires on everything teaches nothing.

**The perimeter has no meaning without an import graph.** The HTML kit has no JS
entry points, so `CONFIG.entries` stays empty and the guard says so explicitly
(`the perimeter check is inactive`). For an HTML/SCSS project either define the
roots as the HTML pages and walk `@import` / `<link>` / `<script>`, or accept
that everything lives on the global ratchet. Do not leave `entries` empty and
assume the perimeter is passing — it is not running.

With those in place the inventory came out normally for a codebase of that age:
several dozen files, over a thousand literal hex colours and several hundred
colour functions, no arbitrary values, one nominal palette class.

### And on somebody else's repo

The test above is a different *stack* from the same team. The one that matters is
a codebase nobody involved has ever seen. Installed on
[Shoelace](https://github.com/shoelace-style/shoelace) — 336 TypeScript files, a
CSS custom-property token file, a real component library. **Two defects, both of
the kind that fails quietly by passing.**

- **The base block was not found, so nothing was checked.** Real token files open
  the base scope with a *selector list* — `:root,\n:host,\n.sl-theme-light {` —
  and the block matcher required the configured selector to sit directly against
  the `{`. It reported `:root block not found` on a file whose `:root` block is
  the first thing in it, and then skipped every foundation contract. A guard that
  finds nothing because it read nothing is the failure mode this whole skill is
  about.
- **The perimeter collapsed to one file.** TypeScript ESM writes the specifier as
  the *emitted* path (`./button.js` → `button.ts` on disk). The resolver never
  tried the swap, so the import walk stopped at the entry file: **1 file reachable
  out of 336**, and a perimeter of one file passes everything. Fixed by trying
  `.js→.ts`, `.jsx→.tsx`, `.mjs→.mts` before giving up. Any modern TS repo hits
  this.

After the fixes: **240 of 336 files reachable**, and the report is small and all
true — six perimeter findings, `rgb(128 128 128 / 33%)` hardcoded as a divider in
the button, the same grey again in the spinner, a black overlay in the animated
image, and sixteen colour functions in the **colour picker**, which is the
textbook file-exact exception: a colour picker's gradient tracks cannot be
tokens. Zero false positives. The flat-tier refusal learned on the SCSS kit fired
correctly here too — 207 colour literals reported as **one** finding, not 207.

## 5. Figma side

Only needed if you are also running `figma-code-sync`.

- **Figma MCP server** connected to the agent, providing `use_figma`,
  `get_metadata`, `get_screenshot` and the design-system read tools. Check what
  is already connected before installing anything — in a session where the tools
  are present, they are present.
- **Load `figma-use` before every `use_figma` call.** It is a mandatory
  prerequisite skill, not a suggestion, and skipping it causes the failures it
  documents.
- **Code Connect CLI** (`npx figma connect`) if you want exact component parity.
  Start with a handful of high-impact components; partial coverage across
  everything produces a report nobody trusts.

Verify with a read-only call before attempting any write — listing pages costs
one call and confirms the whole chain works.

## 6. Verification checklist

Run these in order. Each has an expected result, so a silent misconfiguration
cannot pass.

```bash
node --version                      # ≥ 18
node --check scripts/ds-guard.mjs   # syntax
node scripts/ds-guard.mjs --report  # scope line: plausible file counts
npm run ds:check                    # exits 0 (greenfield) or 1 with "no baseline" (migration)
npm run ds:baseline                 # migration only — writes the baseline
npm run ds:check                    # now exits 0
git commit --allow-empty -m "hook"  # the hook fires
```

Then the one test that proves the ratchet is real rather than decorative:
introduce a violation in a file that had none, and confirm `ds:check` fails
naming that file. **Do this once at install time.** A ratchet nobody has seen
fail is a ratchet nobody knows is wired.
