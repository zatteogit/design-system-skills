#!/usr/bin/env node
/**
 * merge-component-graph — the step that makes orphan detection mean anything.
 *
 * `figma-census.js` with CENSUS="graph" reports one page. Orphans cannot be read
 * from one page: on the components page of a real library, more than half the
 * components looked orphaned and every one of them was a header, a footer or a
 * card that the template pages consume. This script unions the per-page results first.
 *
 *   node merge-component-graph.mjs census-*.json          # files, a dir, or both
 *   node merge-component-graph.mjs --json  graph/         # machine-readable
 *
 * TWO KINDS OF IN-EDGE, and missing the second is the trap.
 * A component consumed by another component produces a graph edge. A component
 * placed directly on a page produces none — its instance has no owning
 * component to be the edge's tail. Measured on a production library: the
 * template page held several thousand instances and yielded ZERO edges. A merge that counts
 * only component→component edges declares the entire system orphaned.
 *
 * The refusals below are the point of the script; see references/component-tiers.md.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — the only part you edit.
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  /**
   * Pages whose usage is NOT evidence that a component is alive: backups,
   * archives, scratch boards. They still contribute their *declarations* and
   * their edges — they just cannot be the only thing keeping a component in the
   * system. Match is case-insensitive substring.
   *
   * Leave empty to count every page. Setting this is a judgement call and the
   * report always says which pages were discounted, because "orphan" changes
   * meaning with it.
   */
  ignorePages: [],

  /**
   * The component ladder, lowest tier first. Each entry: { tier, label, match }
   * where `match` is a regex source string tested against the component name.
   * First match wins; a component matching nothing is unclassified.
   *
   * EMPTY BY DEFAULT, ON PURPOSE. Figma has no tier field. If the file marks
   * tiers with pages (`1 Atoms`, `2 Composites`) use `matchPage` instead. If it
   * marks them with neither, the tier contract is not checkable and this script
   * says so rather than inventing a ladder out of name shapes.
   */
  tiers: [],
  // e.g. tiers: [
  //   { tier: 0, label: "Elements",   match: "^(base|dettaglio|pilastri)/" },
  //   { tier: 1, label: "Atoms",      match: "^\\.?atoms?-" },
  //   { tier: 2, label: "Composites", match: "^molecule-" },
  //   { tier: 3, label: "Patterns",   match: "^pattern-" },
  // ],

  limit: 25,
};

// ─────────────────────────────────────────────────────────────────────────────
const JSON_OUT = process.argv.includes("--json");
const C = { reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m" };
const paint = (c, s) => (JSON_OUT || !process.stdout.isTTY ? s : c + s + C.reset);

function loadAll(paths) {
  const out = [];
  const readFile = (p) => {
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    for (const o of Array.isArray(parsed) ? parsed : [parsed]) out.push(o);
  };
  for (const p of paths) {
    if (!existsSync(p)) { console.error(`no such path: ${p}`); process.exit(2); }
    if (statSync(p).isDirectory())
      for (const f of readdirSync(p)) { if (f.endsWith(".json")) readFile(join(p, f)); }
    else readFile(p);
  }
  return out;
}

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!args.length) {
  console.error("usage: merge-component-graph.mjs <census.json | dir> [...]  [--json]");
  process.exit(2);
}
const pages = loadAll(args);

// ── Refusal 1: one page cannot answer the question the script exists to answer.
if (pages.length < 2) {
  const msg = "refused: a single page census cannot yield orphans. Run CENSUS=\"graph\" on EVERY page — including the ones that look like they only consume — and pass them all.";
  if (JSON_OUT) { console.log(JSON.stringify({ refused: msg }, null, 2)); process.exit(2); }
  console.error(paint(C.red, msg)); process.exit(2);
}

const ignored = (name) => CONFIG.ignorePages.some((p) => (name || "").toLowerCase().includes(p.toLowerCase()));

// ── Union ────────────────────────────────────────────────────────────────────
const declaredOn = new Map();     // component → [page]
const consumedBy = new Map();     // component → Set(component)
const consumes = new Map();       // component → Set(component)
const edgeWeight = new Map();     // "from␟to" → n
const usedOnPage = new Map();     // component → Map(page → n)   (page-level instances)
const remoteSeen = new Set();     // components whose main is remote (graph truncates here)
let totalInstances = 0, pagesCounted = 0, pagesIgnored = [];

const push = (map, k, v) => { (map.get(k) ?? map.set(k, new Set()).get(k)).add(v); };

for (const p of pages) {
  const page = p.page ?? "(unnamed)";
  totalInstances += p.instances ?? 0;
  if (ignored(page)) pagesIgnored.push(page); else pagesCounted++;

  for (const c of p.declared ?? []) push(declaredOn, c, page);
  for (const r of p.remoteTargets ?? []) remoteSeen.add(r);

  // Component → component edges count from every page: a backup page does not
  // invent a dependency, it mirrors one that exists in the component itself.
  for (const e of p.edges ?? []) {
    const [from, to, n = 1] = e;
    push(consumedBy, to, from);
    push(consumes, from, to);
    const k = `${from}␟${to}`;
    edgeWeight.set(k, (edgeWeight.get(k) ?? 0) + n);
  }
  // Page-level placement: the second kind of in-edge.
  for (const [name, n] of Object.entries(p.pageUses ?? {})) {
    const m = usedOnPage.get(name) ?? usedOnPage.set(name, new Map()).get(name);
    m.set(page, (m.get(page) ?? 0) + n);
  }
}

const declared = [...declaredOn.keys()];
const liveUse = (name) => {
  const m = usedOnPage.get(name);
  if (!m) return 0;
  let n = 0;
  for (const [page, k] of m) if (!ignored(page)) n += k;
  return n;
};
const anyUse = (name) => { let n = 0; for (const k of (usedOnPage.get(name) ?? new Map()).values()) n += k; return n; };

// ── Findings ─────────────────────────────────────────────────────────────────

// Orphan: declared in the file, consumed by no component, placed on no page that
// counts. This is the number that was meaningless before the merge.
const orphans = declared
  .filter((c) => !(consumedBy.get(c)?.size) && liveUse(c) === 0)
  .map((c) => ({ component: c, declaredOn: [...declaredOn.get(c)], usesOnIgnoredPages: anyUse(c) }));

// Alive only because a discounted page still holds instances of it. Distinct
// from an orphan and from a live component, and invisible without ignorePages.
const keptAliveOnlyBy = CONFIG.ignorePages.length
  ? declared.filter((c) => !(consumedBy.get(c)?.size) && liveUse(c) === 0 && anyUse(c) > 0)
            .map((c) => ({ component: c, uses: anyUse(c), pages: [...usedOnPage.get(c).keys()] }))
  : [];

// Declared, never consumed by another component, but placed on real pages.
// Normal for the top tier — a template is not consumed by anything. A LOW-tier
// component in this list is the finding: an atom nobody composes with.
const pageLevelOnly = declared
  .filter((c) => !(consumedBy.get(c)?.size) && liveUse(c) > 0)
  .map((c) => ({ component: c, uses: liveUse(c) }))
  .sort((a, b) => b.uses - a.uses);

// Ghost main: instances reference it, it is not remote, and it is declared on no
// page. Figma keeps a main component alive for its instances after it is deleted
// from the canvas — the instances keep working and nobody can find the source.
const referenced = new Set([...consumedBy.keys(), ...usedOnPage.keys()]);
const ghostMains = [...referenced]
  .filter((c) => !declaredOn.has(c) && !remoteSeen.has(c))
  .map((c) => ({ component: c, uses: anyUse(c), consumedBy: [...(consumedBy.get(c) ?? [])].slice(0, 4) }))
  .sort((a, b) => b.uses - a.uses);

// Cycles, on component → component edges only.
const cycles = [];
{
  const colour = new Map(), stack = [];
  const walk = (n) => {
    colour.set(n, 1); stack.push(n);
    for (const m of consumes.get(n) ?? []) {
      if (!declaredOn.has(m) && !consumes.has(m)) continue;
      if (colour.get(m) === 1) {
        const i = stack.indexOf(m);
        if (i >= 0 && cycles.length < CONFIG.limit) cycles.push([...stack.slice(i), m].join(" → "));
      } else if (!colour.has(m)) walk(m);
    }
    colour.set(n, 2); stack.pop();
  };
  for (const n of consumes.keys()) if (!colour.has(n)) walk(n);
}

// Tier contract — refused unless a ladder is configured.
let tiers;
if (!CONFIG.tiers.length) {
  tiers = { checked: false, reason: "no ladder configured. Figma has no tier field; set CONFIG.tiers (name regexes) or mark tiers with page names. Deriving a ladder from name shapes would be guessing." };
} else {
  const rules = CONFIG.tiers.map((t) => ({ ...t, re: new RegExp(t.match) }));
  const tierOf = (n) => rules.find((r) => r.re.test(n))?.tier ?? null;
  const upward = [], unclassified = [];
  for (const [k, n] of edgeWeight) {
    const [from, to] = k.split("␟");
    const a = tierOf(from), b = tierOf(to);
    if (a === null) { unclassified.push(from); continue; }
    if (b === null) continue;
    if (b > a) upward.push({ edge: `${from} (${a}) → ${to} (${b})`, instances: n });
  }
  upward.sort((x, y) => y.instances - x.instances);
  tiers = { checked: true, ladder: CONFIG.tiers.map((t) => `${t.tier} ${t.label}`),
            upwardNesting: upward.slice(0, CONFIG.limit), upwardTotal: upward.length,
            unclassified: [...new Set(unclassified)].slice(0, CONFIG.limit) };
}

const fanIn = declared.concat([...consumedBy.keys()].filter((c) => !declaredOn.has(c)))
  .map((c) => [c, consumedBy.get(c)?.size ?? 0])
  .sort((a, b) => b[1] - a[1]);

const report = {
  merged: {
    pages: pages.length, pagesCounted, pagesDiscounted: pagesIgnored,
    instances: totalInstances, componentsDeclared: declared.length,
    distinctEdges: edgeWeight.size, remoteTargets: remoteSeen.size,
  },
  orphans, keptAliveOnlyBy, pageLevelOnly: pageLevelOnly.slice(0, CONFIG.limit),
  ghostMains: ghostMains.slice(0, CONFIG.limit),
  cycles, tiers,
  fanIn: { top: fanIn.slice(0, 15), consumedByNothing: fanIn.filter(([, n]) => n === 0).length },
};

if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

const { merged: m } = report;
console.log(paint(C.bold, `merged graph — ${m.pages} pages (${m.pagesCounted} counted), ${m.instances} instances, ${m.componentsDeclared} components, ${m.distinctEdges} edges`));
if (m.pagesDiscounted.length) console.log(paint(C.dim, `  discounted as evidence of use: ${m.pagesDiscounted.join(", ")}`));
console.log(paint(C.dim, `  ${m.remoteTargets} targets are remote — the graph truncates there`));

const block = (title, rows, fmt, colour = C.yellow) => {
  console.log(`\n${paint(colour, title)} — ${rows.length}`);
  for (const r of rows.slice(0, CONFIG.limit)) console.log(`    ${fmt(r)}`);
  if (!rows.length) console.log(paint(C.dim, "    none"));
};

block("✗ Orphans (consumed by nothing, placed nowhere)", report.orphans,
  (o) => `${o.component}  ${paint(C.dim, `declared on ${o.declaredOn.join(", ")}`)}`, C.red);
block("Kept alive only by a discounted page", report.keptAliveOnlyBy,
  (o) => `${o.component}  ${o.uses} uses on ${o.pages.join(", ")}`);
block("Ghost mains (instances exist, no component on any page)", report.ghostMains,
  (g) => `${g.component}  ${g.uses} uses${g.consumedBy.length ? paint(C.dim, `  ← ${g.consumedBy.join(", ")}`) : ""}`);
block("✗ Cycles", report.cycles, (c) => c, C.red);
block("Consumed by no component, only placed on pages", report.pageLevelOnly,
  (o) => `${o.component}  ${o.uses} uses`, C.cyan);

if (report.tiers.checked) {
  block("✗ Upward nesting (a component instancing a higher tier)", report.tiers.upwardNesting,
    (u) => `${u.edge}  ${paint(C.dim, `${u.instances} instances`)}`, C.red);
} else {
  console.log(`\n${paint(C.dim, "tier contract not checked — " + report.tiers.reason)}`);
}

console.log(`\n${paint(C.bold, "fan-in")}  (read this first: if nothing has high fan-in, the ladder is on paper only)`);
for (const [name, n] of report.fanIn.top) console.log(`    ${String(n).padStart(3)}  ${name}`);

const failed = report.orphans.length + report.cycles.length + (report.tiers.upwardNesting?.length ?? 0);
process.exit(failed ? 1 : 0);
