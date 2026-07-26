/**
 * figma-census — the read-only counterpart to ds-guard-starter.mjs.
 *
 * Paste into `use_figma` (which requires EDIT access to the file), set CENSUS
 * and PAGE_ID at the top, run. It only ever `return`s — no node is created,
 * mutated or deleted.
 *
 * The Plugin API allows ONE `setCurrentPageAsync` per call, so the work is split
 * into modes. Run `file` once, then fan out `page` (or `graph`) across pages by
 * issuing N calls in a single message.
 *
 *   CENSUS = "file"   no page switch: token graph, tiers, contrast on declared
 *                     pairs, file role, styles, cross-library aliases, DTCG names
 *   CENSUS = "page"   one page: bindings, off-grid spacing, observed contrast
 *                     pairs, component graph, overrides, slots, detached
 *                     instances, instance:frame
 *   CENSUS = "graph"  one page, cheap: just the edges. Run it on EVERY page and
 *                     feed the outputs to assets/merge-component-graph.mjs —
 *                     orphans cannot be computed from one page
 *   CENSUS = "board"  one page: the template acceptance gate, per top-level board
 *   CENSUS = "dtcg"   no page switch: export the variables as DTCG, one mode per
 *                     run. Feed to assets/dtcg-verify.mjs
 *
 * Every guard in here exists because it failed against a real file. Do not
 * "simplify" the try/catch around `.parent`, the async collection lookup, or the
 * distinct-instance denominator — see references/ for what each one cost.
 */

// ── SET THESE ───────────────────────────────────────────────────────────────
const CENSUS  = "file"          // "file" | "page" | "board"
const PAGE_ID = ""              // required for "page" and "board"

const CONFIG = {
  grid: 4,                                   // base spacing grid
  privatePrefixes: [".", "_"],               // component/collection privacy convention
  /** Declared contrast pairs — the contract. Do NOT derive these from names:
   *  token names say what a token IS, not what it is used WITH. "page" mode
   *  observes the real pairs off the canvas instead. */
  contrastPairs: [],                         // e.g. [["color/bg/card","color/text/on-card"]]
  contrastModes: ["Light", "Dark"],
  minRatio: 4.5,
  /** Ordered scales to check for monotonicity, by variable-name prefix. */
  scalePrefixes: ["radius/", "space/"],
  /** Fields that are normally overridden and would otherwise dominate the ranking. */
  expectedOverrides: ["characters", "styledTextSegments"],
  overrideFloor: 10,                         // ignore components with fewer instances
  limit: 25,                                 // per-list output cap
  /** CENSUS = "dtcg" only. DTCG has no mode concept, so one run = one mode. */
  dtcg: {
    mode: "",                                // "" = first mode of each collection
    collections: [],                         // [] = all local collections
    prefixWithCollection: true,              // keeps aliases resolvable and names unique
  },
}

// ── SHARED HELPERS ──────────────────────────────────────────────────────────
figma.skipInvisibleInstanceChildren = true   // state it in the report; it changes results

const safe = (fn, d = null) => { try { return fn() } catch { return d } }
const vis  = a => Array.isArray(a) && a.some(x => x && x.visible !== false)
const paints = n => safe(() => vis(n.fills) || vis(n.strokes) || vis(n.effects), false)
const hasKids = n => safe(() => Array.isArray(n.children) && n.children.length > 0, false)
const top = (obj, k = CONFIG.limit) => Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, k))

/** `.parent` THROWS on some nodes rather than returning null — guard every hop. */
function climb(start, test, max = 60) {
  let c = start
  for (let i = 0; i < max; i++) {
    let p
    try { p = c.parent; if (!p) return null } catch { return null }
    const t = safe(() => p.type)
    if (!t || t === "PAGE" || t === "DOCUMENT") return null
    if (test(p)) return p
    c = p
  }
  return null
}
const insideInstance = n => !!climb(n, p => p.type === "INSTANCE")
const ownerComponent = n => {
  const hit = climb(n, p => p.type === "COMPONENT_SET" || p.type === "COMPONENT")
  if (!hit) return null
  return hit.type === "COMPONENT" && safe(() => hit.parent?.type) === "COMPONENT_SET"
    ? hit.parent.name : hit.name
}
const boundFillIds = n => safe(() => {
  const b = n.boundVariables?.fills
  return Array.isArray(b) ? b.filter(e => e?.id).map(e => e.id) : []
}, [])

// Variable/collection lookup that survives aliases into REMOTE libraries.
const _cols = {}, _vars = {}
const collectionOf = async id => {
  if (!(id in _cols)) _cols[id] = await figma.variables.getVariableCollectionByIdAsync(id).catch(() => null)
  return _cols[id]
}
const variableOf = async id => {
  if (!(id in _vars)) _vars[id] = await figma.variables.getVariableByIdAsync(id).catch(() => null)
  return _vars[id]
}
async function resolveColour(v, modeName, depth = 0) {
  if (!v || depth > 10) return null
  const col = await collectionOf(v.variableCollectionId)
  if (!col) return { unresolved: "remote collection" }
  const mode = col.modes.find(m => m.name === modeName) ?? col.modes[0]
  const val = v.valuesByMode[mode.modeId]
  if (val && val.type === "VARIABLE_ALIAS") return resolveColour(await variableOf(val.id), modeName, depth + 1)
  return val && typeof val.r === "number" ? val : null
}
const _ch = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const _lum = c => 0.2126 * _ch(c.r) + 0.7152 * _ch(c.g) + 0.0722 * _ch(c.b)
const ratio = (a, b) => { const [hi, lo] = [_lum(a), _lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
const hex = c => "#" + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("")

// ── FILE CENSUS ─────────────────────────────────────────────────────────────
async function censusFile() {
  const cols = await figma.variables.getLocalVariableCollectionsAsync()
  const vars = await figma.variables.getLocalVariablesAsync()
  for (const c of cols) _cols[c.id] = c
  for (const v of vars) _vars[v.id] = v
  const styles = {
    paint: await figma.getLocalPaintStylesAsync(), text: await figma.getLocalTextStylesAsync(),
    effect: await figma.getLocalEffectStylesAsync(), grid: await figma.getLocalGridStylesAsync(),
  }

  // Role: a consumer file reports zero local variables and is still fully tokenised.
  let sampleBound = 0, sampleLiteral = 0
  for (const n of figma.currentPage.findAll(() => true)) {
    const f = safe(() => n.fills)
    if (!vis(f)) continue
    if (boundFillIds(n).length) sampleBound++; else sampleLiteral++
  }
  const role = vars.length > 0 ? "library / source of truth"
             : sampleBound > 0 ? "consumer — read bindings off nodes, not the local APIs"
             : "no local tokens and no bindings on this page — look before concluding"

  const perCollection = [], crossLibrary = []
  for (const c of cols) {
    const mine = vars.filter(v => v.variableCollectionId === c.id)
    let alias = 0, literal = 0, noDesc = 0, openScope = 0, pigment = 0
    const types = {}
    for (const v of mine) {
      types[v.resolvedType] = (types[v.resolvedType] || 0) + 1
      const val = v.valuesByMode[c.modes[0].modeId]
      if (val && val.type === "VARIABLE_ALIAS") {
        alias++
        const t = await variableOf(val.id)
        if (t && t.remote) crossLibrary.push(`${v.name} → remote ${t.name}`)
      } else {
        literal++
        if (v.resolvedType === "COLOR") pigment++
      }
      if (!v.description?.trim()) noDesc++
      if (!v.scopes?.length || v.scopes.includes("ALL_SCOPES")) openScope++
    }
    perCollection.push({
      collection: c.name, private: CONFIG.privatePrefixes.some(p => c.name.startsWith(p)),
      modes: c.modes.map(m => m.name), n: mine.length, types,
      alias, literal, colourLiterals: pigment, noDescription: noDesc, openScope,
    })
  }

  // Contrast on the DECLARED pairs, per mode.
  const byName = Object.fromEntries(vars.map(v => [v.name, v]))
  const contrast = { checked: 0, fail: [], unresolved: [], alpha: [] }
  for (const modeName of CONFIG.contrastModes) {
    for (const [bgN, fgN] of CONFIG.contrastPairs) {
      const bg = await resolveColour(byName[bgN], modeName)
      const fg = await resolveColour(byName[fgN], modeName)
      if (!bg || !fg || bg.unresolved || fg.unresolved) { contrast.unresolved.push(`${modeName} ${fgN}/${bgN}`); continue }
      if (bg.a < 1 || fg.a < 1) { contrast.alpha.push(`${modeName} ${fgN}/${bgN}`); continue }
      contrast.checked++
      const r = ratio(bg, fg)
      if (r < CONFIG.minRatio) contrast.fail.push({ mode: modeName, pair: `${fgN} on ${bgN}`, ratio: +r.toFixed(2) })
    }
  }
  contrast.fail.sort((a, b) => a.ratio - b.ratio)

  // Ordered scales must be strictly increasing.
  // A scale normally lives in the SEMANTIC tier, so its values are aliases, not
  // numbers. Reading valuesByMode directly yields alias objects, every member is
  // filtered out as "not a number", and the check silently verifies nothing —
  // reporting n:0 while looking like it passed. Resolve first.
  async function resolveNumber(v, depth = 0) {
    if (!v || depth > 10) return null
    const col = await collectionOf(v.variableCollectionId)
    if (!col) return null
    const val = v.valuesByMode[col.modes[0].modeId]
    if (val && val.type === "VARIABLE_ALIAS") return resolveNumber(await variableOf(val.id), depth + 1)
    return typeof val === "number" ? val : null
  }
  // TWO refusals, both learned from false positives on a real file:
  //  · `vars` comes back in CREATION order, which is not scale order. Order must
  //    be read from the name, never from the array.
  //  · A shared prefix is not a scale. `elevation/x|y|blur|spread` groups four
  //    different properties; `corner/smooth|full|subtle` has no intrinsic order
  //    at all. Only names carrying an explicit ordinal can be checked — for the
  //    rest the intended order is a human decision the file does not encode, so
  //    the rule must SAY SO rather than guess.
  const scales = []
  for (const prefix of CONFIG.scalePrefixes) {
    const members = vars.filter(v => v.name.startsWith(prefix) && v.resolvedType === "FLOAT")
    if (members.length < 2) continue
    const ordinal = n => { const m = n.match(/(\d+(?:\.\d+)?)\s*$/); return m ? parseFloat(m[1]) : null }
    const withOrdinal = members.filter(v => ordinal(v.name) !== null)
    if (withOrdinal.length < 2) {
      scales.push({ prefix, declared: members.length, checked: 0,
                    skipped: "names carry no ordinal — order is not encoded in the file, so monotonicity is not checkable" })
      continue
    }
    // Third refusal: an ordinal does not make a group ONE scale. `elevation/x/1`
    // and `elevation/y/1` share ordinal 1 because the prefix groups four shadow
    // properties across two elevations. A real scale has exactly one member per
    // ordinal — anything else is several series interleaved, and comparing them
    // is meaningless.
    const ords = withOrdinal.map(v => ordinal(v.name))
    if (new Set(ords).size !== ords.length) {
      scales.push({ prefix, declared: members.length, checked: 0,
                    skipped: "duplicate ordinals — this prefix groups several series, not one scale" })
      continue
    }
    const vals = []
    for (const v of withOrdinal) {
      const n = await resolveNumber(v)
      if (n !== null) vals.push({ name: v.name, ord: ordinal(v.name), v: n })
    }
    vals.sort((a, b) => a.ord - b.ord)               // order by NAME, not by array position
    const bad = []
    for (let i = 1; i < vals.length; i++)
      if (vals[i].v <= vals[i - 1].v) bad.push(`${vals[i - 1].name}=${vals[i - 1].v} >= ${vals[i].name}=${vals[i].v}`)
    scales.push({ prefix, declared: members.length, checked: vals.length,
                  unresolved: withOrdinal.length - vals.length,
                  ignoredNoOrdinal: members.length - withOrdinal.length, notIncreasing: bad })
  }

  return {
    census: "file", skipInvisibleInstanceChildren: true,
    role, pages: figma.root.children.length,
    collections: perCollection, totalVariables: vars.length,
    codeSyntaxSet: vars.filter(v => Object.keys(v.codeSyntax || {}).length > 0).length,
    dtcgIllegalNames: vars.filter(v => /[.{}]/.test(v.name) || v.name.startsWith("$")).map(v => v.name).slice(0, CONFIG.limit),
    crossLibraryAliases: { n: crossLibrary.length, sample: crossLibrary.slice(0, 8) },
    styles: Object.fromEntries(Object.entries(styles).map(([k, v]) => [k, v.length])),
    styleDescriptions: Object.fromEntries(Object.entries(styles).map(([k, v]) => [k, `${v.filter(s => s.description?.trim()).length}/${v.length}`])),
    secondCarrierWarning: styles.paint.length > 0 && vars.length > 0
      ? "colour lives in BOTH variables and paint styles — a census reading only boundVariables under-reports" : null,
    contrast: CONFIG.contrastPairs.length ? contrast : "no declared pairs — run CENSUS=\"page\" for observed pairs",
    scales,
  }
}

// ── PAGE CENSUS ─────────────────────────────────────────────────────────────
async function censusPage() {
  const page = await figma.getNodeByIdAsync(PAGE_ID)
  await figma.setCurrentPageAsync(page)
  const vars = await figma.variables.getLocalVariablesAsync()
  for (const v of vars) _vars[v.id] = v
  for (const c of await figma.variables.getLocalVariableCollectionsAsync()) _cols[c.id] = c

  const all = page.findAll(() => true)

  // 1 · How is visual value carried: bound / via style / literal.
  const carrier = { bound: 0, viaStyle: 0, literal: 0 }
  for (const n of all) {
    if (!vis(safe(() => n.fills))) continue
    if (boundFillIds(n).length) carrier.bound++
    else if (safe(() => n.fillStyleId)) carrier.viaStyle++
    else carrier.literal++
  }

  // 2 · Spacing off the grid. figma.mixed is a FINDING, not a skip.
  const PROPS = ["itemSpacing", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "counterAxisSpacing"]
  const spacing = { bound: 0, onGrid: 0, off: 0, mixed: 0, values: {} }
  for (const n of page.findAllWithCriteria({ types: ["FRAME", "COMPONENT", "COMPONENT_SET", "INSTANCE"] })) {
    if (!safe(() => "layoutMode" in n && n.layoutMode !== "NONE")) continue
    const bv = safe(() => n.boundVariables, {}) || {}
    for (const p of PROPS) {
      const v = safe(() => n[p])
      if (v === figma.mixed) { spacing.mixed++; continue }
      if (typeof v !== "number") continue
      if (bv[p]) { spacing.bound++; continue }
      if (Math.abs(v) % CONFIG.grid === 0) { spacing.onGrid++; continue }
      spacing.off++; spacing.values[v] = (spacing.values[v] || 0) + 1
    }
  }
  spacing.values = top(spacing.values)

  // 3 · Observed contrast pairs — read off the canvas, never derived from names.
  const seen = {}
  let textNodes = 0, textBound = 0
  for (const t of page.findAllWithCriteria({ types: ["TEXT"] })) {
    textNodes++
    const fg = boundFillIds(t)[0]; if (!fg) continue
    textBound++
    const bgNode = climb(t, p => boundFillIds(p).length > 0)
    if (!bgNode) continue
    const k = `${boundFillIds(bgNode)[0]}|${fg}`
    seen[k] = (seen[k] || 0) + 1
  }
  const observed = []
  for (const [k, uses] of Object.entries(seen)) {
    const [bgId, fgId] = k.split("|")
    const bgV = await variableOf(bgId), fgV = await variableOf(fgId)
    const row = { pair: `${fgV?.name ?? fgId} on ${bgV?.name ?? bgId}`, uses }
    for (const m of CONFIG.contrastModes) {
      const bg = await resolveColour(bgV, m), fg = await resolveColour(fgV, m)
      row[m] = (!bg || !fg || bg.unresolved || fg.unresolved) ? "unresolved"
             : (bg.a < 1 || fg.a < 1) ? "alpha" : +ratio(bg, fg).toFixed(2)
    }
    observed.push(row)
  }
  const num = v => typeof v === "number" ? v : 99
  const failing = observed.filter(r => CONFIG.contrastModes.some(m => num(r[m]) < CONFIG.minRatio))
                          .sort((a, b) => b.uses - a.uses)

  // 4 · Component dependency graph + remote share.
  const instances = page.findAllWithCriteria({ types: ["INSTANCE"] })
  const mains = await Promise.all(instances.map(i => i.getMainComponentAsync().catch(() => null)))
  const edges = {}, consumedBy = {}
  let remoteMains = 0, looseInstances = 0
  const byComponent = {}
  for (let i = 0; i < instances.length; i++) {
    const main = mains[i]; if (!main) continue
    if (main.remote) remoteMains++
    const to = safe(() => main.parent?.type === "COMPONENT_SET" ? main.parent.name : main.name, main.name)
    const from = ownerComponent(instances[i])
    if (from) { edges[`${from} → ${to}`] = (edges[`${from} → ${to}`] || 0) + 1; (consumedBy[to] ??= new Set()).add(from) }
    else looseInstances++

    // 5 · Override census — denominator is DISTINCT INSTANCES, not override entries.
    const e = (byComponent[to] ??= { instances: 0, withField: {}, entries: {} })
    e.instances++
    const here = new Set()
    for (const o of (safe(() => instances[i].overrides, []) || []))
      for (const f of (o.overriddenFields || [])) { here.add(f); e.entries[f] = (e.entries[f] || 0) + 1 }
    for (const f of here) e.withField[f] = (e.withField[f] || 0) + 1
  }
  const missingVariants = []
  for (const [name, e] of Object.entries(byComponent)) {
    if (e.instances < CONFIG.overrideFloor) continue
    for (const [f, n] of Object.entries(e.withField)) {
      if (CONFIG.expectedOverrides.includes(f)) continue
      const share = n / e.instances
      if (share >= 0.5) missingVariants.push({ component: name, field: f, share: +share.toFixed(2),
                                               instances: `${n}/${e.instances}`, avgNodesTouched: +(e.entries[f] / n).toFixed(1) })
    }
  }
  missingVariants.sort((a, b) => b.share - a.share || b.avgNodesTouched - a.avgNodesTouched)
  const fanIn = Object.entries(consumedBy).map(([k, v]) => [k, v.size]).sort((a, b) => b[1] - a[1])
  const mutual = [...new Set(Object.keys(edges).filter(k => { const [f, t] = k.split(" → "); return edges[`${t} → ${f}`] })
                                              .map(k => k.split(" → ").sort().join(" ⇄ ")))]

  // 6 · Slots.
  let slots = []
  try { slots = page.findAllWithCriteria({ types: ["SLOT"] }) } catch { slots = all.filter(n => safe(() => n.type) === "SLOT") }

  // 7 · Detached instances — a frame mirroring a component but not an instance of it.
  const compNames = new Set(page.findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] }).map(c => c.name.replace(/\s*\/\s*/g, "/")))
  const mainNames = new Set(mains.filter(Boolean).map(m => safe(() => m.parent?.type === "COMPONENT_SET" ? m.parent.name : m.name, m.name)))
  const known = new Set([...compNames, ...mainNames])
  const detached = page.findAllWithCriteria({ types: ["FRAME"] })
    .filter(n => known.has(n.name) || [...known].some(cn => cn.endsWith("/" + n.name)))
    .map(n => n.name)
  const detachedByName = {}
  for (const n of detached) detachedByName[n] = (detachedByName[n] || 0) + 1

  const frames = page.findAllWithCriteria({ types: ["FRAME"] }).length
  return {
    census: "page", page: page.name, skipInvisibleInstanceChildren: true,
    carrier, spacing,
    text: { nodes: textNodes, boundFill: textBound, share: textNodes ? +(textBound / textNodes).toFixed(2) : null },
    observedContrast: { pairs: observed.length, failing: failing.slice(0, CONFIG.limit),
                        note: "sort by uses — 1–5 uses is usually the walk finding a non-background ancestor" },
    components: { onPage: compNames.size, instances: instances.length, frames,
                  instanceToFrame: frames ? +(instances.length / frames).toFixed(2) : null,
                  remoteMains, looseInstances, distinctEdges: Object.keys(edges).length,
                  fanInTop: fanIn.slice(0, 15), fanInOne: fanIn.filter(([, n]) => n === 1).length,
                  mutualPairs: mutual.slice(0, 10),
                  orphansNote: "orphans are meaningless per page — merge edges from EVERY page first" },
    missingVariantCandidates: missingVariants.slice(0, CONFIG.limit),
    slots: (() => {
      const withSettings = slots.filter(s => safe(() => s.slotSettings, null)).length
      const owners = new Set(slots.map(s => ownerComponent(s) ?? "(none)"))
      return {
        nodes: slots.length, ownerComponents: owners.size, withSettings,
        withViolations: slots.filter(s => (safe(() => s.limitViolations, []) || []).length).length,
        // `withViolations: 0` is meaningless when nothing declares a limit —
        // the same shape as a monotonicity check that resolves no values. Say
        // which of the two zeroes this is.
        violationsMeaningful: withSettings > 0,
        note: slots.length === 0 ? "zero is normal in any library built before slots went GA"
            : withSettings === 0 ? "every slot has NO slotSettings: no min/max/preferred is declared anywhere, so `withViolations: 0` verifies nothing"
            : null,
        countCaveat: "one SLOT node per VARIANT — a component set with 4 variants reports 4 slots for one slot API. Read ownerComponents, not nodes",
      }
    })(),
    detachedSuspects: { n: detached.length, byName: top(detachedByName) },
  }
}

// ── BOARD CENSUS (template acceptance gate) ─────────────────────────────────
async function censusBoard() {
  const page = await figma.getNodeByIdAsync(PAGE_ID)
  await figma.setCurrentPageAsync(page)
  const boards = []
  for (const board of page.children) {
    if (!("findAll" in board)) continue
    const r = { board: board.name, instances: 0, plainWrappers: 0, surfaceContainers: 0,
                surfaceUnbound: [], rawMarks: [], rawMarkCount: 0, rawText: 0, oneoffs: 0, unboundLayout: [] }
    for (const n of board.findAll(() => true)) {
      const t = safe(() => n.type); if (!t) continue
      if (t === "INSTANCE") { r.instances++; continue }
      if (insideInstance(n)) continue
      if (n.name.startsWith("_oneoff/")) { r.oneoffs++; continue }
      if (t === "TEXT") { r.rawText++; continue }
      if (hasKids(n)) {
        if (!paints(n)) { r.plainWrappers++; continue }
        r.surfaceContainers++
        if (!boundFillIds(n).length && vis(safe(() => n.fills)) && r.surfaceUnbound.length < 10) r.surfaceUnbound.push(n.name)
        continue
      }
      if (paints(n)) { r.rawMarkCount++; if (r.rawMarks.length < 20) r.rawMarks.push(`${t}:${n.name}`) }
    }
    const bv = safe(() => board.boundVariables, {}) || {}
    for (const p of ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "itemSpacing"]) {
      const v = safe(() => board[p])
      if (typeof v === "number" && v !== 0 && !bv[p]) r.unboundLayout.push(`${p}=${v}`)
    }
    const grids = safe(() => board.layoutGrids, []) || []
    for (const g of grids)
      if (!g.boundVariables || !Object.keys(g.boundVariables).length) r.unboundLayout.push(`grid:${g.pattern}`)
    // An empty `unboundLayout` must not read as "the layout is tokenised" when
    // the truth is "there was no layout on this node to look at". The grid of a
    // template usually lives on an inner container, which this gate never
    // reaches — say so instead of returning a clean list.
    if (!grids.length) r.noLayoutGridOnBoard = "no layout grid on the board itself — if the template has a grid it is on an inner container, and it was NOT checked"
    boards.push(r)
  }
  return { census: "board", page: page.name, boards,
           note: "compare sibling boards, not absolute numbers — the outlier is the report" }
}

// ── GRAPH CENSUS (one page, cheap — run on EVERY page, then merge) ─────────
// The full "page" census is too heavy to fan out over fifteen pages. This is the
// subset that merge-component-graph.mjs needs, and it emits BOTH kinds of
// in-edge:
//   · edges     — an instance sitting inside another component (a real dependency)
//   · pageUses  — an instance sitting directly on the page (no owning component)
// A template page yields ZERO edges and thousands of pageUses. Measured on a real
// library: several thousand instances, not one edge. Count only the first and the
// whole library looks orphaned.
async function censusGraph() {
  const page = await figma.getNodeByIdAsync(PAGE_ID)
  await figma.setCurrentPageAsync(page)
  const setName = n => safe(() => n.parent?.type === "COMPONENT_SET" ? n.parent.name : n.name, n.name)

  // Names AND node ids. The ids are the input to `get_code_connect_map`, which
  // is per-node — without them every parity claim stays a name guess (§Code
  // Connect in component-parity.md).
  const declared = new Set(), declaredIds = {}
  for (const c of page.findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] })) {
    const n = setName(c)
    declared.add(n)
    if (!(n in declaredIds)) declaredIds[n] = (c.type === "COMPONENT" && safe(() => c.parent?.type) === "COMPONENT_SET") ? c.parent.id : c.id
  }

  const instances = page.findAllWithCriteria({ types: ["INSTANCE"] })
  const mains = await Promise.all(instances.map(i => i.getMainComponentAsync().catch(() => null)))
  const edges = {}, pageUses = {}, remote = new Set()
  let noMain = 0
  for (let i = 0; i < instances.length; i++) {
    const m = mains[i]; if (!m) { noMain++; continue }
    const to = setName(m)
    if (m.remote) remote.add(to)             // the graph truncates at a remote main
    const owner = climb(instances[i], p => p.type === "COMPONENT_SET" || p.type === "COMPONENT")
    if (owner) { const k = `${setName(owner)}␟${to}`; edges[k] = (edges[k] || 0) + 1 }
    else pageUses[to] = (pageUses[to] || 0) + 1
  }
  return {
    census: "graph", page: page.name, pageId: page.id,
    declared: [...declared], instances: instances.length, noMain,
    remoteTargets: [...remote],
    edges: Object.entries(edges).map(([k, n]) => { const [f, t] = k.split("␟"); return [f, t, n] }),
    pageUses,
  }
}

// ── DTCG EXPORT (the audit read of the token pipeline) ──────────────────────
// Figma → DTCG, read-only. This is the side of the pipeline that CAN be
// universal: `generate` depends on the project's token source and `apply` writes
// to the file, but reading Figma back and normalising it is the same everywhere.
// Feed the output to assets/dtcg-verify.mjs.
//
// DTCG HAS NO MODE CONCEPT. One call exports ONE mode — file-per-mode, which is
// the choice dtcg-pipeline.md argues for. Set CONFIG.dtcg.mode and run it once
// per mode; a collection without that mode falls back to its first, and says so.
async function censusDtcg() {
  const cols = await figma.variables.getLocalVariableCollectionsAsync()
  const vars = await figma.variables.getLocalVariablesAsync()
  for (const c of cols) _cols[c.id] = c
  for (const v of vars) _vars[v.id] = v
  if (!vars.length) return { census: "dtcg", refused: "no local variables — this is a consumer file. Export from the library that owns the tokens." }

  const wanted = CONFIG.dtcg.collections.length
    ? cols.filter(c => CONFIG.dtcg.collections.includes(c.name)) : cols
  const path = v => {
    const col = _cols[v.variableCollectionId]
    const n = v.name.replace(/\s*\/\s*/g, "/")
    return CONFIG.dtcg.prefixWithCollection ? `${col ? col.name : "?"}/${n}` : n
  }
  const byId = Object.fromEntries(vars.map(v => [v.id, path(v)]))

  const TYPE = { COLOR: "color", FLOAT: "number", STRING: "string", BOOLEAN: "boolean" }
  const refusals = []
  const tokens = {}
  const modesUsed = {}
  let emitted = 0

  for (const col of wanted) {
    const mode = col.modes.find(m => m.name === CONFIG.dtcg.mode) ?? col.modes[0]
    modesUsed[col.name] = mode.name + (CONFIG.dtcg.mode && mode.name !== CONFIG.dtcg.mode ? ` (asked for "${CONFIG.dtcg.mode}", not present)` : "")
    for (const v of vars.filter(x => x.variableCollectionId === col.id)) {
      const p = path(v)
      // Validate on the way OUT, not on the way in: DTCG names may not contain
      // `.` `{` `}` and may not start with `$`, because those are its own syntax.
      if (/[.{}]/.test(v.name) || v.name.startsWith("$")) { refusals.push({ token: p, why: "name is not a legal DTCG path (contains . { } or starts with $)" }); continue }
      const raw = v.valuesByMode[mode.modeId]
      let $value
      if (raw && raw.type === "VARIABLE_ALIAS") {
        const target = byId[raw.id]
        if (!target) {
          // An alias into another FILE cannot be expressed in DTCG. Refuse it
          // loudly: a resolver that quietly inlined the value would erase the
          // fact that a shared brand library owns it.
          const t = await variableOf(raw.id)
          refusals.push({ token: p, why: `aliases a variable outside this file${t ? ` (${t.name})` : ""} — DTCG cannot express a cross-file reference` })
          continue
        }
        $value = `{${target.replace(/\//g, ".")}}`
      } else if (v.resolvedType === "COLOR") {
        if (!raw || typeof raw.r !== "number") { refusals.push({ token: p, why: "colour value not resolvable in this mode" }); continue }
        $value = hex(raw) + (raw.a < 1 ? Math.round(raw.a * 255).toString(16).padStart(2, "0") : "")
      } else if (v.resolvedType === "FLOAT") {
        // A Figma FLOAT carries NO UNIT. Emitting `dimension` would be inventing
        // one. It goes out as `number` with the loss recorded, and dtcg-verify
        // refuses to compare it to a `px` value unless told --assume-unit.
        $value = raw
      } else $value = raw

      // `$extensions` ONLY for what the DTCG document cannot already express.
      // The collection is the top group and the Figma type is recoverable from
      // `$type`, so repeating both on every token triples the file for nothing —
      // and a full library export does not fit in one `use_figma` response
      // (capped at 20kb) with the redundancy in place.
      const ext = {
        ...(v.scopes?.length && !v.scopes.includes("ALL_SCOPES") ? { scopes: v.scopes } : {}),
        ...(Object.keys(v.codeSyntax || {}).length ? { codeSyntax: v.codeSyntax } : {}),
        ...(v.resolvedType === "FLOAT" ? { unitless: true } : {}),
        ...(v.hiddenFromPublishing ? { hiddenFromPublishing: true } : {}),
      }
      let node = tokens
      const parts = p.split("/")
      for (const seg of parts.slice(0, -1)) node = (node[seg] ??= {})
      node[parts[parts.length - 1]] = {
        $value, $type: TYPE[v.resolvedType] ?? "string",
        ...(v.description?.trim() ? { $description: v.description.trim() } : {}),
        ...(Object.keys(ext).length ? { $extensions: { "com.figma": ext } } : {}),
      }
      emitted++
    }
  }

  const styles = {
    paint: (await figma.getLocalPaintStylesAsync()).length,
    text: (await figma.getLocalTextStylesAsync()).length,
    effect: (await figma.getLocalEffectStylesAsync()).length,
  }
  return {
    census: "dtcg",
    $extensions: { "com.figma": {
      mode: CONFIG.dtcg.mode || "(first mode of each collection)",
      modePerCollection: modesUsed,
      modes: [...new Set(wanted.flatMap(c => c.modes.map(m => m.name)))],
      collections: wanted.map(c => c.name),
    } },
    tokens,
    stats: { declared: vars.length, emitted, refused: refusals.length,
             composites: styles,
             compositeNote: styles.text || styles.effect
               ? "text/effect styles are NOT variables: they are composites without modes and are not exported here. See dtcg-pipeline.md §Composites."
               : null },
    refusals: refusals.slice(0, 40),
  }
}

// ── RUN ─────────────────────────────────────────────────────────────────────
if (CENSUS === "file")  return await censusFile()
if (CENSUS === "page")  return await censusPage()
if (CENSUS === "graph") return await censusGraph()
if (CENSUS === "board") return await censusBoard()
if (CENSUS === "dtcg")  return await censusDtcg()
return { error: `unknown CENSUS "${CENSUS}" — use "file", "page", "graph", "board" or "dtcg"` }
