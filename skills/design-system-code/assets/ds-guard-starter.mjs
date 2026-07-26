#!/usr/bin/env node
/**
 * ds-guard starter — a runnable design-system guard with no dependencies.
 *
 * Copy into scripts/, edit CONFIG, run. It implements the parts that are the
 * same in every project:
 *
 *   foundation contracts (hard, never baselined)
 *     · private primitives do not leak outside the token source
 *     · no unresolved token references, per mode
 *     · no reference cycles, per mode
 *     · public tokens hold no pigment
 *     · orphan primitives (declared, consumed by nothing)
 *     · contrast AA on declared token pairs, per mode
 *   perimeter        (zero tolerance on files reachable from product routes)
 *   ratchet          (per-file baseline; debt cannot rise, and cannot move)
 *
 * The rules that need an AST or a framework-specific model — tier bypass,
 * owned-style override, motion literals, raw controls — are not here on
 * purpose: see references/rule-catalog.md and references/guard-implementation.md.
 *
 *   node scripts/ds-guard.mjs                     gate: exits 1 on any failure
 *   node scripts/ds-guard.mjs --report            read-only inventory (migration only)
 *   node scripts/ds-guard.mjs --update            regenerate the baseline
 *   node scripts/ds-guard.mjs --json              machine-readable
 *   node scripts/ds-guard.mjs --log <file.jsonl>  append one census line (trend over time)
 */

import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — the only part you edit.
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  /**
   * "greenfield" — a new project: no debt, so no baseline. Every pattern is a
   *               hard rule across every scanned file, from the first commit.
   *               `--update` refuses to run: there is nothing to record.
   * "migration"  — an existing codebase: zero tolerance inside the perimeter,
   *               per-file ratchet everywhere else.
   * A greenfield project that needs a baseline has become a migration project.
   * Prefer a file-exact `exceptions` entry before switching.
   */
  mode: "migration",

  root: process.cwd(),
  /** Everything is scanned and resolved inside this directory. */
  appRoot: "src",

  tokens: {
    file: "src/styles/theme.css",
    /** "css"  — CSS custom properties (`--x: …`) inside selector blocks, with modes.
     *  "scss" — Sass variables (`$x: …`) at file scope: one implicit mode, no
     *           blocks. Everything else (reachability, cycles, unresolved refs,
     *           contrast, scales) works identically. */
    syntax: "css",
    /** Block selectors, in resolution order. The first is the base; later ones
     *  are overlays applied on top of it (a mode = base + its overrides).
     *  Ignored when syntax is "scss". */
    modes: { Light: ":root", Dark: ".dark" },
    /** Framework adapter block, resolved against the base mode. "" to skip. */
    adapter: "@theme inline",
    /** Naming convention that marks a token as a private primitive.
     *  This starter detects the primitive tier by *prefix*. If your token file
     *  marks tiers by comment banners or section order instead, either adopt a
     *  prefix (recommended — a regex can enforce it) or replace the tier split
     *  in foundationContracts(). The `primitives 0/0` metric is the tell. */
    privatePrefix: "--_ref-",
    /** Custom properties supplied by consumers at runtime (an inline
     *  `style={{ "--tone": … }}` bridge), not declared in the token file.
     *  Referenced-but-undeclared is a finding for everything else. */
    contextual: [],
  },

  /** Roots of the user-facing perimeter. Their imports are walked transitively. */
  entries: [
    // "src/app/pages/home.tsx",
  ],
  /** User-facing but NOT traversed — e.g. a shell whose router registers
   *  technical routes too. */
  entriesDirect: [],
  /** Path aliases, longest prefix first, relative to root. */
  aliases: { "@/": "src/" },

  /** Excluded everywhere: the DS itself, vendored UI, backups, generated code. */
  exclude: [
    "src/styles/",
    "src/design/",
    "src/components/ui/",
    "_backup",
    ".worker",
    "/generated/",
  ],

  /** Ratchet patterns. Add your framework's escape hatch here. */
  patterns: [
    { id: "inline-hex", label: "literal hex colour", re: /#[0-9a-fA-F]{3,8}\b/g },
    { id: "css-colour-fn", label: "rgb()/hsl()/oklch() literal", re: /\b(?:rgba?|hsla?|oklch)\([^)]*\)/g },
    { id: "arbitrary-value", label: "arbitrary utility value", re: /(?:^|[\s"'`{])(?:[a-z-]+)-\[[^\]]+\]/g },
    { id: "nominal-palette", label: "framework palette class", re: /(?:^|[\s"'`{])(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g },
    { id: "numeric-z", label: "numeric z-index", re: /(?:^|[\s"'`{])z-(?:\d+|\[[^\]]+\])/g },
  ],
  /** Patterns that stay on the global ratchet even inside the perimeter,
   *  because no immediate correct replacement exists yet. */
  perimeterExempt: [],

  /** Contrast pairs. `convention` derives x/x-foreground and
   *  x-container/on-x-container for each listed role; `pairs` adds explicit ones. */
  contrast: {
    minRatio: 4.5,
    conventionRoles: [],   // e.g. ["primary", "success", "destructive"]
    pairs: [],             // e.g. [["--background", "--foreground"]]
  },

  /** Public tokens legitimately consumed by nothing. Value = the reason. */
  reserved: {},

  /** File-exact exceptions: { "path/to/file.tsx": { "pattern-id": "reason" } } */
  exceptions: {},

  baselineFile: "scripts/.ds-guard-baseline.json",
  extensions: [".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte", ".css"],
  findingLimit: 60,
};

// ─────────────────────────────────────────────────────────────────────────────
// Source utilities
// ─────────────────────────────────────────────────────────────────────────────
const C = { reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m" };
const paint = (s, c) => (process.stdout.isTTY ? `${c}${s}${C.reset}` : String(s));

/** Blanks comments while preserving line count, so line numbers stay correct. */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(Math.max(0, m.length - p.length)));
}
export const lineAt = (source, index) => source.slice(0, index).split("\n").length;

/** String-aware balanced-brace extraction. */
export function extractBalanced(source, openIndex) {
  if (source[openIndex] !== "{") return null;
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
    if (ch === "{") depth += 1;
    else if (ch === "}" && --depth === 0) return { start: openIndex, end: i + 1, text: source.slice(openIndex + 1, i) };
  }
  return null;
}

export function extractBlock(source, selector) {
  // The configured selector is rarely alone: real token files open the base
  // scope with a SELECTOR LIST (`:root,\n:host,\n.sl-theme-light {`). Anchoring
  // the `{` directly after the selector reports "block not found" on a file
  // whose block is right there — and every downstream contract is then skipped,
  // so the guard passes by looking at nothing. Allow the rest of the list on
  // either side; `;` and `}` keep the run from crossing into another rule.
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[\\n,])\\s*${esc}\\s*(?:,[^{};]*)?\\{`, "m");
  const m = re.exec(source);
  if (!m) return null;
  const region = extractBalanced(source, source.indexOf("{", m.index));
  return region ? { ...region, line: lineAt(source, region.start) } : null;
}

const SCSS = () => CONFIG.tokens.syntax === "scss";

export function declarations(block) {
  const map = new Map();
  // Sass declarations are at file scope and may carry !default / !global.
  const re = SCSS()
    ? /^\s*(\$[A-Za-z0-9_-]+)\s*:\s*([^;]+);/gm
    : /(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g;
  for (const m of block.matchAll(re))
    map.set(m[1], m[2].replace(/!(default|global)/g, "").replace(/\s+/g, " ").trim());
  return map;
}
export const refsIn = (value) =>
  SCSS()
    ? [...value.matchAll(/(\$[A-Za-z0-9_-]+)/g)].map((m) => m[1])
    : [...value.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((m) => m[1]);

export function findCycles(values, fallback) {
  const state = new Map(), stack = [], cycles = new Map();
  const local = (n) => values.has(n) && !fallback?.has(n);
  const visit = (name) => {
    const s = state.get(name) ?? 0;
    if (s === 2) return;
    if (s === 1) {
      const cycle = [...stack.slice(stack.indexOf(name)), name];
      cycles.set([...new Set(cycle)].sort().join("|"), cycle);
      return;
    }
    state.set(name, 1); stack.push(name);
    for (const dep of refsIn(values.get(name) ?? "")) if (local(dep)) visit(dep);
    stack.pop(); state.set(name, 2);
  };
  for (const name of values.keys()) visit(name);
  return [...cycles.values()];
}

export function resolveValue(name, values, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const value = values.get(name);
  if (!value) return null;
  const alias = value.match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/);
  return alias ? resolveValue(alias[1], values, seen) : value;
}

const PIGMENT = /(?:#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab|lch|color)\(|\b(?:white|black)\b)/;

/**
 * Blanks the *name* inside `var(--x)` before testing a value for pigment.
 * Without this, `--background: var(--_ref-white)` matches the bare word "white"
 * in the referenced token's name and reports an alias as a hardcoded colour.
 * Only the name is removed, so a literal fallback — `var(--x, #fff)` — is still
 * caught, which is the case that actually matters.
 */
const withoutRefNames = (value) => value.replace(/var\(\s*--[A-Za-z0-9_-]+/g, "var(");

export function parseColor(value) {
  if (!value) return null;
  const hex = value.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
  if (value.trim() === "white") return [255, 255, 255];
  if (value.trim() === "black") return [0, 0, 0];
  return null;   // oklch() and friends need a colour library — reported, not guessed
}
const channel = (v) => { const n = v / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ─────────────────────────────────────────────────────────────────────────────
// File discovery and reachability
// ─────────────────────────────────────────────────────────────────────────────
const ROOT = CONFIG.root;
const APP = join(ROOT, CONFIG.appRoot);
const rel = (abs) => relative(ROOT, abs).replaceAll("\\", "/");
const isExcluded = (abs) => CONFIG.exclude.some((frag) => rel(abs).includes(frag));

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = join(dir, e.name);
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    if (isExcluded(abs)) continue;
    if (e.isDirectory()) walk(abs, out);
    else if (CONFIG.extensions.includes(extname(e.name))) out.push(abs);
  }
  return out;
}

function resolveLocal(fromFile, specifier) {
  let base;
  if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else {
    const hit = Object.entries(CONFIG.aliases).sort(([a], [b]) => b.length - a.length)
      .find(([p]) => specifier.startsWith(p));
    if (!hit) return null;
    base = join(ROOT, hit[1] + specifier.slice(hit[0].length));
  }
  // TypeScript ESM writes the specifier as the *emitted* path: `./button.js`
  // resolves to `button.ts` on disk. Without this the walker stops at the entry
  // file and the perimeter silently collapses to one file — and a perimeter of
  // one file passes everything. Measured on a third-party repo: 1 file reachable
  // out of 336.
  const emitted = { ".js": [".ts", ".tsx"], ".jsx": [".tsx"], ".mjs": [".mts"], ".cjs": [".cts"] };
  const swapped = (emitted[extname(base)] ?? []).map((e) => base.slice(0, -extname(base).length) + e);

  for (const c of [base, ...swapped, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`,
                   join(base, "index.ts"), join(base, "index.tsx"), join(base, "index.js")]) {
    if (c !== APP && !c.startsWith(APP + "/")) continue;
    // Source files only. An imported .png/.svg/.woff resolves to a real path, and
    // scanning a binary as text invents findings — a PNG contains byte sequences
    // that match a hex-colour regex.
    if (!CONFIG.extensions.includes(extname(c))) continue;
    if (existsSync(c)) return c;
  }
  return null;
}

const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_RE = /import\(\s*["']([^"']+)["']\s*\)/g;

function collectPerimeter() {
  const seen = new Set();
  const visit = (abs) => {
    if (seen.has(abs) || !existsSync(abs) || isExcluded(abs)) return;
    seen.add(abs);
    const source = stripComments(readFileSync(abs, "utf8"));
    for (const re of [IMPORT_RE, DYNAMIC_RE]) {
      re.lastIndex = 0;
      for (const m of source.matchAll(re)) {
        const target = resolveLocal(abs, m[1]);
        if (target) visit(target);
      }
    }
  };
  for (const r of CONFIG.entries) visit(join(ROOT, r));
  for (const r of CONFIG.entriesDirect) {
    const abs = join(ROOT, r);
    if (existsSync(abs) && !isExcluded(abs)) seen.add(abs);
  }
  return seen;
}

// ─────────────────────────────────────────────────────────────────────────────
// Foundation contracts — hard, never baselined
// ─────────────────────────────────────────────────────────────────────────────
function foundationContracts(allFiles) {
  const out = [];
  const add = (rule, file, line, detail) => out.push({ rule, file, line, detail });
  const tokenPath = join(ROOT, CONFIG.tokens.file);
  if (!existsSync(tokenPath)) {
    add("token-source-missing", CONFIG.tokens.file, 1, "token source not found — set CONFIG.tokens.file");
    return { findings: out, metrics: {} };
  }
  const raw = readFileSync(tokenPath, "utf8");
  const theme = stripComments(raw);
  const { privatePrefix, modes, adapter } = CONFIG.tokens;

  // 1 · private primitives must not leak outside the token source
  for (const abs of allFiles) {
    if (abs === tokenPath) continue;
    const content = stripComments(readFileSync(abs, "utf8"));
    for (const m of content.matchAll(new RegExp(`${privatePrefix}[A-Za-z0-9_-]+`, "g")))
      add("private-primitive-leak", rel(abs), lineAt(content, m.index), m[0]);
  }

  // Sass has no selector blocks and no modes: the file IS the scope.
  let baseDecls, scopes, adapterBlock = null, adapterDecls = new Map();
  if (SCSS()) {
    baseDecls = declarations(theme);
    scopes = new Map([["Default", baseDecls]]);
  } else {
    const names = Object.keys(modes);
    const base = extractBlock(theme, modes[names[0]]);
    if (!base) {
      add("token-block-missing", CONFIG.tokens.file, 1, `${modes[names[0]]} block not found`);
      return { findings: out, metrics: {} };
    }
    baseDecls = declarations(base.text);
    scopes = new Map([[names[0], baseDecls]]);
    for (const name of names.slice(1)) {
      const block = extractBlock(theme, modes[name]);
      if (!block) { add("token-block-missing", CONFIG.tokens.file, 1, `${modes[name]} block not found`); continue; }
      scopes.set(name, new Map([...baseDecls, ...declarations(block.text)]));
    }
    adapterBlock = adapter ? extractBlock(theme, adapter) : null;
    adapterDecls = adapterBlock ? declarations(adapterBlock.text) : new Map();
  }

  // 2 · references resolve, 3 · no cycles — per mode, plus the adapter
  const contextual = new Set(CONFIG.tokens.contextual ?? []);
  const check = (label, values, fallback) => {
    for (const [owner, value] of values)
      for (const dep of refsIn(value))
        if (!values.has(dep) && !fallback?.has(dep) && !contextual.has(dep))
          add("unresolved-token-reference", CONFIG.tokens.file, lineAt(theme, theme.indexOf(owner)), `${label} ${owner} → ${dep}`);
    for (const cycle of findCycles(values, fallback))
      add("token-cycle", CONFIG.tokens.file, lineAt(theme, theme.indexOf(cycle[0])), `${label} ${cycle.join(" → ")}`);
  };
  for (const [name, values] of scopes) check(name, values);
  if (adapterBlock) check("adapter", adapterDecls, baseDecls);

  // 4 · public tokens hold no pigment.
  // DEGENERATE CASE: if no private tier is declared at all, every token is
  // "public" and every colour is a finding — 43 identical items on a real flat
  // SCSS file. That is one structural fact, not 43 defects. Report it once.
  const primitives = new Map([...baseDecls].filter(([n]) => n.startsWith(privatePrefix)));
  const pigmentHits = [];
  for (const [name, values] of scopes)
    for (const [token, value] of values)
      if (!token.startsWith(privatePrefix) && PIGMENT.test(withoutRefNames(value)))
        pigmentHits.push({ name, token, value });
  if (primitives.size === 0 && pigmentHits.length > 0) {
    add("no-primitive-tier", CONFIG.tokens.file, 1,
      `no token matches the private prefix "${privatePrefix}", so every one of the ${pigmentHits.length} colour literals ` +
      `is a public token holding a pigment. This is one flat tier, not ${pigmentHits.length} defects — ` +
      `introduce a private primitive tier before enabling this rule.`);
  } else {
    for (const h of pigmentHits)
      add("pigment-in-public-token", CONFIG.tokens.file, lineAt(theme, theme.indexOf(h.token)), `${h.name} ${h.token}: ${h.value}`);
  }

  // 5 · orphan primitives
  const consumers = new Set();
  for (const values of [...scopes.values(), adapterDecls])
    for (const value of values.values())
      for (const dep of refsIn(value)) if (primitives.has(dep)) consumers.add(dep);
  for (const name of primitives.keys())
    if (!consumers.has(name))
      add("orphan-primitive", CONFIG.tokens.file, lineAt(theme, theme.indexOf(name)), name);

  // 6 · stale reserved entries
  for (const [name, reason] of Object.entries(CONFIG.reserved))
    if (!baseDecls.has(name)) add("stale-reserved-token", "ds-guard config", 1, `${name}: ${reason}`);

  // 7 · contrast AA, per mode
  const pairs = [
    ...CONFIG.contrast.pairs,
    ...CONFIG.contrast.conventionRoles.flatMap((r) => [[`--${r}`, `--${r}-foreground`], [`--${r}-container`, `--on-${r}-container`]]),
  ];
  for (const [modeName, values] of scopes) {
    for (const [bgName, fgName] of pairs) {
      const bg = parseColor(resolveValue(bgName, values));
      const fg = parseColor(resolveValue(fgName, values));
      if (!bg || !fg) { add("contrast-unresolved", CONFIG.tokens.file, 1, `${modeName} ${fgName}/${bgName}`); continue; }
      const ratio = contrast(bg, fg);
      if (ratio < CONFIG.contrast.minRatio)
        add("contrast-aa", CONFIG.tokens.file, 1, `${modeName} ${fgName}/${bgName}: ${ratio.toFixed(2)} < ${CONFIG.contrast.minRatio}`);
    }
  }

  const publicCount = [...baseDecls.keys()].filter((n) => !n.startsWith(privatePrefix)).length;
  return {
    findings: out,
    metrics: { modes: [...scopes.keys()], primitives: primitives.size, primitivesConsumed: consumers.size, publicTokens: publicCount, adapterAliases: adapterDecls.size, contrastPairs: pairs.length },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern counting
// ─────────────────────────────────────────────────────────────────────────────
function countInFiles(files) {
  const report = Object.fromEntries(CONFIG.patterns.map((p) => [p.id, { total: 0, byFile: {} }]));
  for (const abs of files) {
    const r = rel(abs);
    const content = stripComments(readFileSync(abs, "utf8"));
    for (const p of CONFIG.patterns) {
      if (CONFIG.exceptions[r]?.[p.id]) continue;
      p.re.lastIndex = 0;
      const n = (content.match(p.re) ?? []).length;
      if (n) { report[p.id].total += n; report[p.id].byFile[r] = n; }
    }
  }
  return report;
}

const baselinePath = () => resolve(ROOT, CONFIG.baselineFile);
function loadBaseline() {
  try { return JSON.parse(readFileSync(baselinePath(), "utf8")); } catch { return null; }
}
function saveBaseline(rules) {
  writeFileSync(baselinePath(), JSON.stringify({ generatedAt: new Date().toISOString(), rules }, null, 2) + "\n");
}

/** Per-file comparison: a file that rises fails, even if the total does not. */
function compare(current, baseline) {
  const rows = [];
  let regressed = false, improved = false;
  for (const p of CONFIG.patterns) {
    const base = baseline?.rules?.[p.id];
    const files = new Set([...Object.keys(base?.byFile ?? {}), ...Object.keys(current[p.id].byFile)]);
    const up = [...files]
      .map((f) => ({ file: f, before: base?.byFile[f] ?? 0, after: current[p.id].byFile[f] ?? 0 }))
      .filter((o) => o.after > o.before)
      .sort((a, b) => (b.after - b.before) - (a.after - a.before));
    const down = [...files].filter((f) => (current[p.id].byFile[f] ?? 0) < (base?.byFile[f] ?? 0));
    if (up.length) regressed = true; else if (down.length) improved = true;
    rows.push({ id: p.id, label: p.label, base: base?.total ?? null, current: current[p.id].total, up, down: down.length });
  }
  return { rows, regressed, improved };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reporting
// ─────────────────────────────────────────────────────────────────────────────
function printFindings(title, findings) {
  console.log(paint(`${C.bold}✗ ${title} — ${findings.length}`, C.red));
  const byRule = new Map();
  for (const f of findings) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
  console.log("    " + [...byRule].sort(([a], [b]) => a.localeCompare(b)).map(([r, n]) => `${r}=${n}`).join("  "));
  console.log();
  for (const f of findings.slice(0, CONFIG.findingLimit))
    console.log(`    ${paint(f.file, C.cyan)}:${f.line}  ${paint(f.rule, C.yellow)}  ${f.detail}`);
  if (findings.length > CONFIG.findingLimit) console.log(`    … ${findings.length - CONFIG.findingLimit} more`);
  console.log();
}

function printTable(rows) {
  const w = Math.max(18, ...rows.map((r) => r.id.length));
  console.log(`${"rule".padEnd(w)}  baseline  current  verdict`);
  console.log("─".repeat(w + 30));
  for (const r of rows) {
    const verdict = r.base == null ? paint("no baseline", C.dim)
      : r.up.length ? paint(`REGRESSION (${r.up.length} file${r.up.length > 1 ? "s" : ""})`, C.red)
      : r.down ? paint(`improved (${r.down} file${r.down > 1 ? "s" : ""})`, C.green)
      : paint("unchanged", C.dim);
    console.log(`${r.id.padEnd(w)}  ${String(r.base ?? "—").padStart(8)}  ${String(r.current).padStart(7)}  ${verdict}`);
  }
  console.log();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  const greenfield = CONFIG.mode === "greenfield";
  const update = argv.includes("--update");
  const report = argv.includes("--report");
  const asJson = argv.includes("--json");

  if (greenfield && update) {
    console.error("--update is meaningless in greenfield mode: there is no baseline, and recording one\n" +
      "would convert this project to a migration. Fix the findings, or add a file-exact exception.");
    process.exit(2);
  }

  const allFiles = walk(APP);
  const perimeter = [...collectPerimeter()];
  const current = countInFiles(allFiles);
  const inPerimeter = countInFiles(perimeter);
  const foundation = foundationContracts(allFiles);

  if (!asJson) {
    console.log(paint(`ds-guard [${CONFIG.mode}] — ${allFiles.length} files under ${CONFIG.appRoot}/` +
      (greenfield ? ", all of them enforced at zero"
                  : `, ${perimeter.length} reachable from ${CONFIG.entries.length} product route(s)`), C.dim));
    const m = foundation.metrics;
    if (m.modes) {
      console.log(paint(`  tokens: modes ${m.modes.join("+")}; primitives ${m.primitivesConsumed}/${m.primitives} consumed; ` +
        `${m.publicTokens} public; ${m.adapterAliases} adapter aliases; ${m.contrastPairs} contrast pairs`, C.dim));
    }
    if (!greenfield && CONFIG.entries.length === 0)
      console.log(paint("  ! CONFIG.entries is empty — the perimeter check is inactive", C.yellow));
    console.log();
  }

  // Greenfield: every pattern is hard, over every scanned file — there is no
  // debt to grandfather, so neither the perimeter subset nor the ratchet applies.
  // Migration: zero tolerance inside the perimeter, enforced in --update too.
  const zone = greenfield ? current : inPerimeter;
  const label = greenfield ? "hard" : "perimeter";
  const zoneFindings = CONFIG.patterns
    .filter((p) => greenfield || !CONFIG.perimeterExempt.includes(p.id))
    .flatMap((p) => Object.entries(zone[p.id].byFile)
      .map(([file, n]) => ({ rule: `${label}/${p.id}`, file, line: 1, detail: `${n} occurrence(s), expected 0` })));

  const { rows, regressed, improved } = greenfield
    ? { rows: [], regressed: false, improved: false }
    : compare(current, loadBaseline());

  // --log appends one JSONL line per run. A single metrics line is a snapshot;
  // a series of them is the only thing that answers "is this getting better".
  // Append-only by design — never rewrite a past entry.
  const logPath = argv[argv.indexOf("--log") + 1];
  if (argv.includes("--log") && logPath && !logPath.startsWith("--")) {
    const m = foundation.metrics;
    appendFileSync(resolve(ROOT, logPath), JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      mode: CONFIG.mode,
      files: allFiles.length,
      perimeter: perimeter.length,
      tokens: { primitives: m.primitives ?? 0, consumed: m.primitivesConsumed ?? 0, public: m.publicTokens ?? 0 },
      contrast: { pairs: m.contrastPairs ?? 0 },
      foundationFindings: foundation.findings.length,
      zoneFindings: zoneFindings.length,
      ratchet: Object.fromEntries(CONFIG.patterns.map((p) => [p.id, current[p.id].total])),
    }) + "\n");
  }

  const absoluteFailed = foundation.findings.length > 0 || zoneFindings.length > 0;

  if (asJson) {
    console.log(JSON.stringify({ mode: CONFIG.mode, scope: { files: allFiles.length, perimeter: perimeter.length },
      foundation, zoneFindings, ratchet: rows }, null, 2));
    process.exit(!report && (absoluteFailed || regressed) ? 1 : 0);
  }

  if (foundation.findings.length) printFindings("Foundation contracts", foundation.findings);
  if (zoneFindings.length)
    printFindings(greenfield ? "Hard rules (zero tolerance, whole repo)" : "Perimeter (zero tolerance)", zoneFindings);

  // --report is a read-only inventory for migration work: it prints everything
  // and gates nothing. It is not a permanent bypass — do not wire it as `ds:check`.
  if (report) {
    if (!greenfield) printTable(rows);
    console.log(paint("report mode: read-only inventory, no gate. Not a permanent bypass.", C.cyan));
    return;
  }

  if (absoluteFailed) {
    console.log(paint(greenfield
      ? "Greenfield mode: there is no baseline to absorb these. Fix them, or add a file-exact exception."
      : "Foundation and perimeter failures are absolute — a baseline cannot absorb them.", C.dim));
    process.exit(1);
  }

  if (greenfield) {
    console.log(paint("✓ foundation contracts clean; zero occurrences of every pattern across the repo", C.green));
    return;
  }
  console.log(paint("✓ foundation contracts and perimeter clean", C.green));
  console.log();

  if (update) {
    saveBaseline(current);
    printTable(rows);
    console.log(paint(`baseline written → ${CONFIG.baselineFile}`, C.green));
    return;
  }

  if (!loadBaseline()) {
    console.log(paint(`No baseline at ${CONFIG.baselineFile}. Run with --update to record the current state.`, C.red));
    process.exit(1);
  }

  printTable(rows);
  if (regressed) {
    console.log(paint(`${C.bold}✗ new debt introduced.`, C.red));
    console.log();
    for (const r of rows.filter((x) => x.up.length)) {
      console.log(paint(`  ${r.id} (${r.label}):`, C.yellow));
      for (const o of r.up) console.log(`    ${paint(o.file, C.cyan)}  ${o.before} → ${o.after}  ${paint(`(+${o.after - o.before})`, C.red)}`);
      console.log();
    }
    console.log(paint("Fix the added occurrences, or run --update to accept the debt explicitly (visible in the diff).", C.dim));
    process.exit(1);
  }
  if (improved) console.log(paint("debt reduced — run --update to lower the baseline", C.green));
  console.log(paint("✓ no regression against the baseline", C.green));
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main();
