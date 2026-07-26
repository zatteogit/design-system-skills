# Guard implementation

Working parts, in the order you need them. Node + zero dependencies except where
an AST is genuinely required — a guard that needs a build step to run does not
get run in a pre-commit hook.

**Regex or AST?** Regex is enough for CSS, for import specifiers, and for counting
patterns in a whole file. An AST is required the moment you need *structure*:
which element a class belongs to, which component a prop is on, whether a literal
is inside a `transition` object. Both reference implementations use regex for the
file-level ratchet and an AST for the tier rules. Strip comments first either way
— a commented-out hex is not debt, and counting it makes the baseline lie.

```js
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (c) => "\n".repeat((c.match(/\n/g) ?? []).length))
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");   // the [^:] keeps "https://" intact
}
export const lineAt = (source, index) => source.slice(0, index).split("\n").length;
```

Preserving line count when blanking block comments is what keeps reported line
numbers correct. The same trick masks any region you want to exclude from a scan:

```js
const maskRange = (s, start, end) =>
  s.slice(0, start) + s.slice(start, end).replace(/[^\n]/g, " ") + s.slice(end);
```

---

## 1. Reachability walker

The scope of everything. Roots are product routes; the walk is transitive over
static imports, re-exports and dynamic `import()`.

```js
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve, relative } from "node:path";

const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_RE = /import\(\s*["']([^"']+)["']\s*\)/g;

function importsOf(file) {
  const source = stripComments(readFileSync(file, "utf8"));
  const out = [];
  for (const re of [IMPORT_RE, DYNAMIC_RE]) {
    re.lastIndex = 0;
    for (const m of source.matchAll(re)) out.push(m[1]);
  }
  return out;
}

// Extend `aliases` with the project's tsconfig/bundler paths, e.g. { "@/": "src/" }.
function resolveLocal(fromFile, specifier, appRoot, aliases = {}) {
  let base;
  if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else {
    const hit = Object.entries(aliases).find(([p]) => specifier.startsWith(p));
    if (!hit) return null;                       // bare package: out of scope
    base = resolve(appRoot, "..", hit[1] + specifier.slice(hit[0].length));
  }
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`,
                      join(base, "index.ts"), join(base, "index.tsx")];
  for (const c of candidates) {
    if (c !== appRoot && !c.startsWith(appRoot + "/")) continue;   // stay inside the app
    if (existsSync(c) && extname(c)) return c;
  }
  return null;
}

export function collectImportGraph(root, appRoot, entries, { direct = [], exclude = () => false } = {}) {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file) || !existsSync(file) || exclude(file)) return;
    seen.add(file);
    for (const spec of importsOf(file)) {
      const target = resolveLocal(file, spec, appRoot);
      if (target) visit(target);
    }
  };
  for (const rel of entries) visit(join(root, rel));
  // Roots that are user-facing but must NOT be traversed — e.g. the shell, whose
  // router registers every technical route too.
  for (const rel of direct) {
    const abs = join(root, rel);
    if (existsSync(abs) && !exclude(abs)) seen.add(abs);
  }
  return seen;
}
```

**Print `seen.size` every run.** A silently broken alias resolver produces a small
clean perimeter, which reads as success. The file count is the tripwire. It works
in the other direction too: a perimeter *larger* than the total scanned file count
is impossible and means the walk is leaving the source tree.

Two traps found by running this against real repos, both of which produce
confident wrong output rather than an error:

- **Stop at source extensions.** An `import logo from "./logo.png"` resolves to a
  real file, and a PNG read as UTF-8 contains byte sequences that match a hex
  colour regex. Filter by extension *in the resolver*, not only in the counter,
  or binary assets become design-system debt. Unfiltered, this more than doubles the
  measured perimeter, and every extra file arrives carrying invented debt.
- **Contextual custom properties are not undeclared tokens.** A property supplied
  by a consumer at runtime (`style={{ "--tone": value }}`) is referenced in the
  stylesheet and declared nowhere. Keep a short explicit allow-list; treating it
  as an unresolved reference produces findings that cannot be fixed, which is how
  a rule gets switched off.
- **A token name is not a token value.** `--background: var(--_ref-white)` is a
  correct alias, but a pigment regex containing `\b(white|black)\b` matches the
  word inside the *referenced name* and reports it as a hardcoded colour. Blank
  the name before testing the value — and blank only the name, so that
  `var(--x, #fff)` still trips the rule, which is the case that matters:

  ```js
  const withoutRefNames = (v) => v.replace(/var\(\s*--[A-Za-z0-9_-]+/g, "var(");
  ```

  This one is worth internalising as a shape: **any rule that inspects a value
  must first remove the parts of the value that are references.** Otherwise the
  guard punishes exactly the aliasing it exists to encourage — and the negative
  probe (§7) is what catches it.

If the project already depends on `ts-morph` or `typescript`, prefer the compiler's
own resolver (`ts.resolveModuleName`) over the alias map — it handles the
`tsconfig` paths, conditional exports and extension resolution you would
otherwise reimplement badly.

The exclusion predicate covers the DS itself, vendored UI, backups, workers and
generated files:

```js
const exclude = (abs) => {
  const rel = relative(root, abs);
  return ["_backup", ".worker", "/generated/"].some((s) => rel.includes(s)) ||
         rel.startsWith("src/design/") || rel.startsWith("src/components/ui/");
};
```

---

## 2. Counting patterns (the ratchet input)

File-level, regex, no AST. Always produce `{ total, byFile }` — the per-file map
is what makes the ratchet airtight and the failure message actionable.

```js
const PATTERNS = [
  { id: "inline-hex",       label: "literal hex colour",     re: /#[0-9a-fA-F]{3,8}\b/g },
  { id: "arbitrary-size",   label: "text-[Npx]",             re: /text-\[[0-9.]+px\]/g },
  { id: "arbitrary-colour", label: "arbitrary colour class", re: /(?:bg|text|border|from|to|via|ring|fill|stroke)-\[#/g },
  { id: "raw-button",       label: "<button> outside the DS", re: /<button[\s>]/g },
];

export function countInFiles(files, root, exceptions = {}) {
  const report = Object.fromEntries(PATTERNS.map((p) => [p.id, { total: 0, byFile: {} }]));
  for (const abs of files) {
    const rel = relative(root, abs);
    const content = stripComments(readFileSync(abs, "utf8"));
    for (const p of PATTERNS) {
      if (exceptions[rel]?.[p.id]) continue;
      p.re.lastIndex = 0;
      const n = (content.match(p.re) ?? []).length;
      if (n) { report[p.id].total += n; report[p.id].byFile[rel] = n; }
    }
  }
  return report;
}
```

Reset `lastIndex` on every reuse of a `/g` regex. A shared global regex that keeps
its index between files is the classic way to under-count and never notice.

---

## 3. Class extraction from JSX (AST)

Needed for anything element-scoped: which classes are on *this* element, which
component it is, what the `style` prop sets. `ts-morph` shown; the bare
`typescript` API is the same shape with more ceremony.

```js
import { Node, SyntaxKind } from "ts-morph";

// Strips responsive/state prefixes so `md:hover:bg-blue-500` matches `bg-blue-500`.
const VARIANT_PREFIX = /^(?:(?:sm|md|lg|xl|2xl|dark|hover|focus|focus-visible|active|disabled|group-hover|peer-checked|aria-[^:]+|data-\[[^\]]+\]):)+/;

function attribute(element, name) {
  const a = element.getAttributes().find(
    (c) => Node.isJsxAttribute(c) && c.getNameNode().getText() === name);
  return Node.isJsxAttribute(a) ? a : undefined;
}

/** Every string literal reachable from className, including template parts. */
export function classLiterals(element) {
  const init = attribute(element, "className")?.getInitializer();
  if (!init) return [];
  const out = [];
  if (Node.isStringLiteral(init)) out.push(init.getLiteralValue());
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (expr) {
      for (const k of [SyntaxKind.StringLiteral, SyntaxKind.NoSubstitutionTemplateLiteral])
        for (const lit of expr.getDescendantsOfKind(k)) out.push(lit.getLiteralValue());
      for (const t of expr.getDescendantsOfKind(SyntaxKind.TemplateExpression)) {
        out.push(t.getHead().getLiteralText());
        for (const s of t.getTemplateSpans()) out.push(s.getLiteral().getLiteralText());
      }
    }
  }
  return out;
}

export const classTokens = (element) =>
  classLiterals(element).flatMap((l) => l.split(/\s+/)).filter(Boolean)
    .map((t) => t.replace(VARIANT_PREFIX, ""));
```

Keep both forms available. `classTokens` is right for "is this class banned";
`classLiterals` (prefixes intact) is required for rules that depend on the
variant, like ignoring `hover:`-only backgrounds in the tonal-pair check.

**Resolve which import a JSX tag came from** before applying a component-specific
rule, or you will flag someone's local `Button`:

```js
export function importedNames(sourceFile, modulePattern, keep = () => true) {
  const names = new Set();
  for (const d of sourceFile.getImportDeclarations()) {
    if (!modulePattern.test(d.getModuleSpecifierValue())) continue;
    for (const n of d.getNamedImports())
      if (keep(n.getName())) names.add(n.getAliasNode()?.getText() ?? n.getName());
  }
  return names;
}
```

### Owned-style override (D2)

```js
const GROUPS = [
  ["background", /^(?:bg|from|via|to)-/],
  ["foreground", /^text-(?!left$|center$|right$)/],   // exclude alignment
  ["radius",     /^rounded/],
  ["size",       /^(?:h|min-h|max-h|p|px|py|pt|pr|pb|pl)-/],
  ["weight",     /^font-/],
  ["border",     /^border(?:-|$)/],
  ["shadow",     /^shadow(?:-|$)/],
];

function overriddenGroups(element) {
  const groups = new Set();
  for (const token of classTokens(element))
    for (const [name, re] of GROUPS) if (re.test(token)) groups.add(name);
  // The style prop overrides the same groups and must count.
  const styleText = attribute(element, "style")?.getInitializer()?.getText() ?? "";
  if (/\bbackground(?:Color|Image)?\s*:/.test(styleText)) groups.add("background");
  if (/\bcolor\s*:/.test(styleText)) groups.add("foreground");
  if (/\bborderRadius\s*:/.test(styleText)) groups.add("radius");
  if (/\bbox[Ss]hadow\s*:/.test(styleText)) groups.add("shadow");
  return groups;
}
// finding when groups.size >= THRESHOLD[componentName]  (5–7 in practice)
```

---

## 4. The token graph

CSS parsing for the token source. Regex is adequate here and stays adequate,
because the token file is declarations inside known blocks.

```js
/** String-aware balanced-brace extractor — survives braces inside quotes. */
export function extractBalanced(source, openIndex, open = "{", close = "}") {
  if (source[openIndex] !== open) return null;
  let depth = 0, quote = null, escaped = false;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === open) depth += 1;
    else if (ch === close && --depth === 0)
      return { start: openIndex, end: i + 1, text: source.slice(openIndex, i + 1) };
  }
  return null;
}

export function declarations(block) {
  const map = new Map();
  for (const m of stripComments(block).matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g))
    map.set(m[1], m[2].replace(/\s+/g, " ").trim());
  return map;
}

export const refsIn = (value) =>
  [...value.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((m) => m[1]);
```

Build one map per mode. Dark is the root map with the dark block applied over it —
model it that way rather than scanning the dark block alone, or every reference
into an unchanged token reads as unresolved:

```js
const light = declarations(extractBlock(theme, ":root"));
const dark  = new Map([...light, ...declarations(extractBlock(theme, ".dark"))]);
const alias = declarations(extractBlock(theme, "@theme inline"));  // resolves against light
```

### Cycles

```js
export function findCycles(values, fallback) {
  const state = new Map(), stack = [], cycles = new Map();
  const local = (n) => values.has(n) && !fallback?.has(n);
  const visit = (name) => {
    const s = state.get(name) ?? 0;
    if (s === 2) return;
    if (s === 1) {
      const cycle = [...stack.slice(stack.indexOf(name)), name];
      cycles.set([...new Set(cycle)].sort().join("|"), cycle);   // dedupe rotations
      return;
    }
    state.set(name, 1); stack.push(name);
    for (const dep of refsIn(values.get(name) ?? "")) if (local(dep)) visit(dep);
    stack.pop(); state.set(name, 2);
  };
  for (const name of values.keys()) visit(name);
  return [...cycles.values()];
}
```

Deduping by the sorted member set stops one 3-cycle being reported three times,
once per entry point.

### Resolution and contrast (F1)

```js
export function resolveValue(name, values, seen = new Set()) {
  if (seen.has(name)) return null;                 // cycle: A6 reports it
  seen.add(name);
  const value = values.get(name);
  if (!value) return null;
  const alias = value.match(/^var\((--[A-Za-z0-9_-]+)\)$/);
  return alias ? resolveValue(alias[1], values, seen) : value;
}

function parseColor(value) {
  if (!value) return null;
  const hex = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
  if (value === "white") return [255, 255, 255];
  if (value === "black") return [0, 0, 0];
  return null;                                     // unresolved → a finding, not a skip
}

const channel = (v) => { const n = v / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
```

Declare the pairs explicitly (`[["card","card-foreground"], ["primary-container","on-primary-container"], …]`)
and iterate them for every mode. A consistent `x` / `on-x` naming convention lets
you derive most of the list instead of maintaining it.

`oklch()` and `color()` need a real colour library if the tokens use them —
`culori` is the light option. Do not approximate; a wrong luminance is worse than
a reported unresolved pair.

---

## 5. Baseline I/O — per-file ratchet

```js
export function compare(current, baseline) {
  let regressed = false, improved = false;
  const rows = [];
  for (const id of Object.keys(current)) {
    const base = baseline?.rules?.[id];
    const files = new Set([...Object.keys(base?.byFile ?? {}), ...Object.keys(current[id].byFile)]);
    const up   = [...files].filter((f) => (current[id].byFile[f] ?? 0) > (base?.byFile[f] ?? 0));
    const down = [...files].filter((f) => (current[id].byFile[f] ?? 0) < (base?.byFile[f] ?? 0));
    if (up.length) regressed = true; else if (down.length) improved = true;
    rows.push({ id, base: base?.total ?? null, current: current[id].total, up, down });
  }
  return { rows, regressed, improved };
}

export function saveBaseline(path, rules) {
  writeFileSync(path, JSON.stringify({ generatedAt: new Date().toISOString(), rules }, null, 2) + "\n");
}
```

A missing baseline is a **failure with instructions**, not an implicit pass —
otherwise a deleted baseline file turns the guard off silently.

---

## 6. Assembling `main()`

Order is load-bearing. Everything absolute runs before anything baselined, and
the strict zones are checked even while regenerating.

```js
function main() {
  const update = process.argv.includes("--update");
  const report = process.argv.includes("--report");

  const all         = walk(APP_ROOT).filter((f) => !exclude(f));
  const productSet  = collectImportGraph(ROOT, APP_ROOT, PRODUCT_ENTRIES, { direct: SHELL, exclude });
  const current     = countInFiles(all, ROOT, EXCEPTIONS);
  const perimeter   = countInFiles([...productSet], ROOT, EXCEPTIONS);

  console.log(`scanned ${all.length} files; perimeter ${productSet.size} reachable from ${PRODUCT_ENTRIES.length} routes`);

  //  1 ─ clean-list        zero tolerance, enforced in --update too
  //  2 ─ perimeter         zero tolerance except PERIMETER_EXEMPT, in --update too
  //  3 ─ foundation        token graph contracts, never baselined
  //  4 ─ hard rules        AST tier rules, never baselined
  //     each: print, process.exit(1)

  if (report) { printInventory(current); return; }          // exits 0, migration only
  if (update) { saveBaseline(BASELINE, current); return; }  // only after 1–4 passed

  const { rows, regressed, improved } = compare(current, loadBaseline(BASELINE));
  printTable(rows);
  if (regressed) { printPerFileDiff(rows); process.exit(1); }
  if (improved) console.log("debt reduced — run `ds:baseline` to lower the baseline");
}
```

---

## 7. Testing the guard

The part that decides whether the guard still works in a year. Two probes per
rule, and **the negative probe is the important one** — it is what stops a rule
being loosened into uselessness during an argument with a false positive.

```js
test("A8 framework alias — rejects a literal, accepts the authorised constant", () => {
  expect(scanFrameworkAliases(`@theme inline { --color-accent: #ff0000; }`)).toHaveLength(1);
  expect(scanFrameworkAliases(`@theme inline { --color-white: #ffffff; }`)).toHaveLength(0);
  // and prove the carve-out is narrow: the same literal must fail elsewhere
  expect(scanTokenDefinitions(`:root { --surface-raised: #ffffff; }`, parsed)).toHaveLength(1);
});

test("D1 raw control — flags a generic button, allows specialised semantics", () => {
  expect(scanRawControls(f, `<button className="px-3">Save</button>`, "T5")).toHaveLength(1);
  expect(scanRawControls(f, `<button type="submit">Save</button>`, "T5")).toHaveLength(0);
  expect(scanRawControls(f, `<input type="range" />`, "T5")).toHaveLength(0);
});
```

Also test the machinery itself, not just the rules:

- **the resolver** — an aliased import, a barrel, a dynamic import, and a bare
  package (which must resolve to `null`);
- **the exception list** — a key naming a file that no longer exists must fail;
- **the ratchet** — a file rising with the total unchanged must fail (this is the
  per-file property, and it is the one worth a regression test);
- **comment stripping** — a hex inside `/* */` and inside a `//` line must not be
  counted, and `https://` must survive.

Run the guard's tests in the same command as the guard. A guard whose tests are
skipped in CI is a guard whose regexes are unverified.
