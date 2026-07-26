#!/usr/bin/env node
/**
 * dtcg-verify — the CI gate of the token pipeline, and the one piece you must own.
 *
 * `generate` depends on the project's token source and `apply` on the Figma file,
 * so neither can ship as a universal starter. `verify` can: it encodes your
 * definition of "the same", and that definition is the same everywhere.
 *
 *   node dtcg-verify.mjs <a> <b> [--json] [--assume-unit px]
 *
 * Each side is either a DTCG `.json` (nested or flat), or the code's own token
 * file (`.scss` / `.css`) — so the diff can be run today, before any pipeline
 * exists. Produce side A from Figma with figma-census.js CENSUS="dtcg".
 *
 * WHAT IT LOOKS FOR, in the order that matters. From a real Figma ⇄ SCSS audit:
 *
 *   4. AN AXIS EXISTS ON ONE SIDE ONLY — checked FIRST because it invalidates
 *      everything below it. A large light/dark theme collection in Figma against
 *      a codebase that emits no custom properties at all is the whole report;
 *      there is no point diffing dark-mode values into a system that cannot
 *      express dark mode.
 *   3. ONE SIDE'S VOCABULARY IS AHEAD (`accent` vs `secondary`) — identical
 *      values, different words. A value-only diff reports ZERO problems here.
 *   2. THE ORDINAL MEANS DIFFERENT THINGS (`primary/25` = code `primary_20`) —
 *      a name-matched diff calls this a value mismatch and you "fix" it by
 *      overwriting one side. The fix is a rename.
 *   1. SAME NAME, DIFFERENT VALUE — the boring case, and the rarest.
 *
 * 3 and 2 are invisible to a name-keyed diff, which is why this script also
 * indexes BY VALUE and reports the cross-matches. That is the whole trick.
 */

import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — the only part you edit.
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  /** Name canonicalisation applied to BOTH sides before anything else:
   *  strip the sigil, lowercase, and make `/ _ - .` all mean "group separator". */
  /** Per-side rewrites, applied after canonicalisation, in order. Use these to
   *  bridge a known vocabulary difference you have DECIDED is the same thing —
   *  never to make an unproven pairing look tidy. */
  renameA: [
    // ["^colors\\.", "color."],
  ],
  renameB: [],

  /** Groups to ignore entirely on either side (build config, framework knobs). */
  ignore: [
    // "^bs\\.", "^enable\\."
  ],

  /** A Figma FLOAT carries no unit. Set `--assume-unit px` to compare it against
   *  a dimension in code; without it, unit-vs-unitless is REFUSED, not guessed. */
  assumeUnit: null,

  limit: 20,
};

// ─────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes("--json");
const ui = argv.indexOf("--assume-unit");
if (ui >= 0) CONFIG.assumeUnit = argv[ui + 1];
const files = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--assume-unit");
if (files.length !== 2) {
  console.error("usage: dtcg-verify.mjs <a.json|a.scss|a.css> <b.json|b.scss|b.css> [--json] [--assume-unit px]");
  process.exit(2);
}

const C = { reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m" };
const paint = (c, s) => (JSON_OUT || !process.stdout.isTTY ? s : c + s + C.reset);

// ── Value normalisation ──────────────────────────────────────────────────────
// Compare PARSED values, never text. #0FB478, #0fb478 and rgb(15,180,120) are
// the same token; a string compare reports a difference that does not exist.
const clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)));
const hex2 = (n) => clamp255(n).toString(16).padStart(2, "0");

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
                  : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const alphaOf = (t) => (t == null ? 1 : /%$/.test(t) ? parseFloat(t) / 100 : parseFloat(t));

/** → {kind:"color", v:"#rrggbbaa"} | {kind:"dim", v:number, unit} | {kind:"raw"|"ref"|"expr", v} */
export function normalise(raw) {
  if (raw == null) return { kind: "raw", v: null };
  if (typeof raw === "number") return { kind: "dim", v: raw, unit: null };
  const s = String(raw).trim();

  // An alias/reference is not a value. Keep it as a reference so the diff can
  // say "both sides alias" instead of pretending to compare two strings.
  if (/^\{.+\}$/.test(s) || /^\$[A-Za-z]/.test(s) || /^var\(/.test(s)) return { kind: "ref", v: s.replace(/^\{|\}$/g, "") };

  let m;
  if ((m = s.match(/^#([0-9a-fA-F]{3,8})$/))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length === 6) h += "ff";
    if (h.length !== 8) return { kind: "raw", v: s };
    return { kind: "color", v: "#" + h.toLowerCase() };
  }
  if ((m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i)))
    return { kind: "color", v: "#" + hex2(+m[1]) + hex2(+m[2]) + hex2(+m[3]) + hex2(alphaOf(m[4]) * 255) };
  if ((m = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i))) {
    const [r, g, b] = hslToRgb(+m[1], +m[2], +m[3]);
    return { kind: "color", v: "#" + hex2(r) + hex2(g) + hex2(b) + hex2(alphaOf(m[4]) * 255) };
  }
  if ((m = s.match(/^(-?[\d.]+)(px|rem|em|%|s|ms|pt|vh|vw)?$/)))
    return { kind: "dim", v: parseFloat(m[1]), unit: m[2] ?? null };
  // Sass arithmetic, maps, calc(): real values a text compare would happily
  // "diff". Marked, counted, and excluded from the value comparison.
  if (/[*+/()]|,/.test(s)) return { kind: "expr", v: s };
  return { kind: "raw", v: s };
}

const sameValue = (a, b) => {
  if (a.kind !== b.kind) return false;
  if (a.kind === "color") return a.v === b.v;
  if (a.kind === "dim") {
    if (a.unit === b.unit) return a.v === b.v;
    // Unitless on one side only: that is the Figma FLOAT problem. Refuse unless
    // told what the unit is.
    if ((a.unit === null || b.unit === null) && CONFIG.assumeUnit) {
      const ua = a.unit ?? CONFIG.assumeUnit, ub = b.unit ?? CONFIG.assumeUnit;
      return ua === ub && a.v === b.v;
    }
    return false;
  }
  return a.v === b.v;
};
const show = (n) => (n.kind === "color" ? (n.v.endsWith("ff") ? n.v.slice(0, 7) : n.v)
                   : n.kind === "dim" ? `${n.v}${n.unit ?? ""}` : String(n.v));

// ── Loading ──────────────────────────────────────────────────────────────────
const canonical = (name) =>
  String(name).replace(/^[$]|^--/, "").toLowerCase().replace(/[/_\-\s.]+/g, ".").replace(/^\.|\.$/g, "");

function applyRenames(name, rules) {
  let n = name;
  for (const [re, to] of rules) n = n.replace(new RegExp(re), to);
  return n;
}

/** DTCG: nested groups with $value/$type, or a flat { "a/b": {$value} } map. */
function flattenDTCG(node, prefix, out, inheritedType) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("$")) continue;
    if (v && typeof v === "object" && "$value" in v)
      out.push({ name: prefix ? `${prefix}/${k}` : k, value: v.$value, type: v.$type ?? inheritedType, description: v.$description });
    else if (v && typeof v === "object")
      flattenDTCG(v, prefix ? `${prefix}/${k}` : k, out, v.$type ?? inheritedType);
  }
}

function loadSide(path, renames) {
  if (!existsSync(path)) { console.error(`no such file: ${path}`); process.exit(2); }
  const text = readFileSync(path, "utf8");
  const ext = extname(path).toLowerCase();
  const rows = [];
  let axes = [], mechanism = null;

  if (ext === ".json") {
    const doc = JSON.parse(text);
    const ext_ = doc.$extensions?.["com.figma"] ?? doc.$extensions?.figma ?? {};
    axes = ext_.modes ?? (ext_.mode ? [ext_.mode] : []);
    mechanism = axes.length > 1 ? "figma modes" : axes.length === 1 ? `figma mode "${axes[0]}"` : null;
    flattenDTCG(doc, "", rows, undefined);
  } else if (ext === ".scss" || ext === ".sass") {
    // Sass variables live at file scope: one implicit mode, no blocks. That is
    // itself the finding when the other side has modes.
    for (const m of text.matchAll(/^\s*(\$[A-Za-z0-9_-]+)\s*:\s*([^;]+);/gm))
      rows.push({ name: m[1], value: m[2].replace(/!(default|global)/g, "").trim() });
    axes = ["(single)"];
    mechanism = /prefers-color-scheme|\[data-theme|\.dark\b/.test(text) ? "media query / theme class" : null;
  } else if (ext === ".css") {
    for (const m of text.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g))
      rows.push({ name: m[1], value: m[2].trim() });
    const sels = new Set();
    for (const m of text.matchAll(/(^|\n)\s*([^{}\n][^{}]*?)\s*\{/g)) sels.add(m[2].trim().split(",")[0].trim());
    axes = [...sels].slice(0, 8);
    mechanism = /prefers-color-scheme|\[data-theme|\.dark\b|\.theme-/.test(text) ? "custom properties + theme scope"
              : rows.length ? "custom properties (single scope)" : null;
  } else { console.error(`unsupported input: ${path}`); process.exit(2); }

  const ignore = CONFIG.ignore.map((r) => new RegExp(r));
  const tokens = new Map();
  const collisions = [];
  for (const r of rows) {
    const key = applyRenames(canonical(r.name), renames);
    if (ignore.some((re) => re.test(key))) continue;
    const norm = normalise(r.value);
    if (tokens.has(key)) { collisions.push(key); continue; }
    tokens.set(key, { ...r, norm });
  }
  return { path, tokens, axes, mechanism, collisions, declared: rows.length };
}

const A = loadSide(files[0], CONFIG.renameA);
const B = loadSide(files[1], CONFIG.renameB);

// ── 4 · Axis parity — checked first, because it invalidates the rest ─────────
const axisReport = {
  a: { axes: A.axes, mechanism: A.mechanism },
  b: { axes: B.axes, mechanism: B.mechanism },
  verdict: null,
};
if (A.axes.length > 1 && !B.mechanism)
  axisReport.verdict = `side A carries ${A.axes.length} axes (${A.axes.join(", ")}) and side B has no mechanism to express any of them. Everything below is a comparison of one axis against a system that cannot switch. THIS IS THE REPORT.`;
else if (B.axes.length > 1 && !A.mechanism)
  axisReport.verdict = `side B carries ${B.axes.length} axes and side A has no mechanism to express them.`;

// ── Name-keyed comparison ────────────────────────────────────────────────────
const changed = [], matched = [], notComparable = [];
for (const [k, a] of A.tokens) {
  const b = B.tokens.get(k);
  if (!b) continue;
  if (a.norm.kind === "ref" || b.norm.kind === "ref" || a.norm.kind === "expr" || b.norm.kind === "expr") {
    notComparable.push({ token: k, a: show(a.norm), b: show(b.norm), why: `${a.norm.kind} vs ${b.norm.kind}` });
    continue;
  }
  if (sameValue(a.norm, b.norm)) matched.push(k);
  else changed.push({ token: k, a: show(a.norm), b: show(b.norm),
                      why: a.norm.kind !== b.norm.kind ? `${a.norm.kind} vs ${b.norm.kind}`
                         : a.norm.kind === "dim" && a.norm.unit !== b.norm.unit ? "unit differs — set --assume-unit if one side is a bare Figma FLOAT" : null });
}
const onlyA = [...A.tokens.keys()].filter((k) => !B.tokens.has(k));
const onlyB = [...B.tokens.keys()].filter((k) => !A.tokens.has(k));

// ── 3 & 2 · Value-keyed comparison: the classes a name diff cannot see ───────
const byValueB = new Map();
for (const [k, b] of B.tokens) {
  if (b.norm.kind !== "color" && b.norm.kind !== "dim") continue;
  const vk = `${b.norm.kind}:${show(b.norm)}`;
  (byValueB.get(vk) ?? byValueB.set(vk, []).get(vk)).push(k);
}
const ordinalTail = (s) => (s.match(/(\d+)$/) ?? [])[1] ?? null;
const stem = (s) => s.replace(/\.?\d+$/, "");

// A shared COLOUR is near-proof of the same token: one exact hex under two names is
// one decision written twice. A shared NUMBER is not — `1.5rem` is a border
// radius on one side and a line height on the other, and pairing them is a
// coincidence dressed up as a finding. Both are reported; they are not reported
// as the same strength of evidence, and the weak list never leads.
const crossMatched = [], crossNumeric = [];
for (const k of onlyA) {
  const a = A.tokens.get(k);
  if (a.norm.kind !== "color" && a.norm.kind !== "dim") continue;
  const hits = byValueB.get(`${a.norm.kind}:${show(a.norm)}`);
  if (!hits) continue;
  for (const other of hits) {
    // The pairing is PROVEN by the value. The label below only describes an
    // already-proven pair — it never creates one, which is the difference
    // between this and deriving relationships from names.
    const sameStem = stem(k) === stem(other) && ordinalTail(k) !== ordinalTail(other);
    const row = { value: show(a.norm), a: A.tokens.get(k).name, b: B.tokens.get(other).name,
                  kind: sameStem ? "ordinal means different things" : "different vocabulary, same value" };
    // A numeric pair is only strong evidence when the ordinal moved under the
    // same stem — that IS class 2. Everything else numeric goes to the weak list.
    if (a.norm.kind === "color" || sameStem) crossMatched.push(row); else crossNumeric.push(row);
  }
}
const trulyMissing = onlyA.filter((k) => !crossMatched.some((c) => canonicalOf(A, c.a) === k));
function canonicalOf(side, originalName) { return applyRenames(canonical(originalName), side === A ? CONFIG.renameA : CONFIG.renameB); }

const report = {
  a: { file: A.path, declared: A.declared, comparable: A.tokens.size },
  b: { file: B.path, declared: B.declared, comparable: B.tokens.size },
  axes: axisReport,
  nameOverlap: matched.length + changed.length + notComparable.length,
  changed, crossMatched, crossNumeric,
  onlyInA: trulyMissing, onlyInB: onlyB,
  notComparable,
  matched: matched.length,
};

// ── Structural refusal: two vocabularies are not 800 defects ─────────────────
if (report.nameOverlap === 0 && (A.tokens.size > 20 && B.tokens.size > 20)) {
  report.structural = `the two sides share ZERO token names (${A.tokens.size} vs ${B.tokens.size}). This is one finding — the vocabularies are different — not ${A.tokens.size + B.tokens.size} defects. ${crossMatched.length} names pair up BY VALUE; start from those and set CONFIG.renameA/renameB, or the per-token diff below means nothing.`;
}

if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); process.exit(report.changed.length || report.onlyInA.length ? 1 : 0); }

console.log(paint(C.bold, `dtcg-verify — A ${A.tokens.size} tokens (${A.path})  ·  B ${B.tokens.size} tokens (${B.path})`));
console.log(paint(C.dim, `  axes  A: ${A.axes.join(", ") || "none"} [${A.mechanism ?? "no theming mechanism"}]`));
console.log(paint(C.dim, `        B: ${B.axes.join(", ") || "none"} [${B.mechanism ?? "no theming mechanism"}]`));
if (axisReport.verdict) console.log(`\n${paint(C.red, "✗ 4 · AXIS MISSING ON ONE SIDE")}\n    ${axisReport.verdict}`);
if (report.structural) console.log(`\n${paint(C.yellow, "▲ vocabularies do not overlap")}\n    ${report.structural}`);

const block = (title, rows, fmt, colour = C.yellow) => {
  console.log(`\n${paint(colour, title)} — ${rows.length}`);
  for (const r of rows.slice(0, CONFIG.limit)) console.log(`    ${fmt(r)}`);
  if (rows.length > CONFIG.limit) console.log(paint(C.dim, `    … ${rows.length - CONFIG.limit} more`));
  if (!rows.length) console.log(paint(C.dim, "    none"));
};

block("✗ 1 · Same name, different value", report.changed,
  (c) => `${c.token}   A ${c.a}  →  B ${c.b}${c.why ? paint(C.dim, `   (${c.why})`) : ""}`, C.red);
block("▲ 3 & 2 · Same value under different names (a value diff reports zero problems here)", report.crossMatched,
  (c) => `${c.value}   A ${c.a}   ≡   B ${c.b}   ${paint(C.dim, c.kind)}`);
block("· weak: same number, unrelated names — usually coincidence, confirm before acting", report.crossNumeric,
  (c) => `${c.value}   A ${c.a}   ≟   B ${c.b}`, C.dim);
block("Only in A (missing from B, and no value twin)", report.onlyInA, (t) => t, C.cyan);
block("Only in B (extra — added by hand, or a code-only concern)", report.onlyInB, (t) => t, C.cyan);
block("Not comparable (alias vs literal, or a Sass expression)", report.notComparable,
  (n) => `${n.token}   A ${n.a}  ·  B ${n.b}   ${paint(C.dim, n.why)}`, C.dim);
console.log(`\n${paint(C.green, `✓ identical on both sides: ${report.matched}`)}`);

process.exit(report.changed.length || report.onlyInA.length ? 1 : 0);
