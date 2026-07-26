# Framework map

Where the tokens actually live in each framework, and where each one rubs against
Figma. This is not a guide to the frameworks — only what you need to read the
code correctly and avoid mirroring a misunderstanding into the file.

**Always read the project's own config before trusting any default here.** Every
value below is overridable, and half of real projects override some.

## The one that bites everyone: a breakpoint name is not a width

| width | Tailwind | Bootstrap | MUI |
|---|---|---|---|
| 576 | `sm` (640) not yet reached | **`sm`** | `xs` |
| 640 | **`sm`** | `sm` | `xs` |
| 768 | **`md`** | **`md`** | `sm` |
| 900 | `md` | `md` | **`md`** |
| 992 | `md` | **`lg`** | `sm`…`md` |
| 1024 | **`lg`** | `lg` | `md` |
| 1200 | `lg` | **`xl`** | **`lg`** |
| 1536 | **`2xl`** | `xxl` (1400) | **`xl`** |

A board labelled "Tablet 768" is `md` in Tailwind and Bootstrap but still `sm` in
MUI. Never name a Figma mode after a device; name it after the **framework
threshold** it represents, and record the canvas width separately (SKILL §7).

## Tailwind CSS

**v4** — tokens live in CSS, in `@theme`:

```css
@theme {
  --color-mint-500: oklch(0.72 0.11 178);
  --spacing: 0.25rem;          /* the multiplier, not a scale */
  --breakpoint-md: 48rem;
  --radius-lg: 0.5rem;
}
```

Namespaces: `--color-*`, `--font-*`, `--text-*`, `--font-weight-*`, `--tracking-*`,
`--leading-*`, `--breakpoint-*`, `--spacing-*`, `--radius-*`, `--shadow-*`,
`--animate-*`. `--namespace-*: initial` wipes a whole namespace.

Three things about v4 that each cost a wrong report:

- **The token source can be split between `:root` and `@theme`.** Reading only
  one of them reports the other's scale as "absent from the code". A radius
  scale declared in `:root` and consumed through `calc()` in `@theme` matched on
  every step once both blocks were read — and looked like six missing tokens
  when only one was.
- **`@theme inline` re-exports names onto themselves** — `--text-display:
  var(--text-display)` is normal and intended. A resolver that follows
  references without noticing the self-reference reports these as **cycles**.
  Resolve the adapter block against the base scope, and treat a name that
  references itself as a re-export, not an error.
- **`@theme` is not an inventory.** Enumerating everything in it — `--color-*`
  in particular — counts re-exports of tokens that already exist elsewhere, and
  inflates "present in code only" (measured: from 91 to 241). Enumerate the
  declarations, then subtract the ones whose value is a reference to a name you
  have already counted.

**v3** — same ideas but in `tailwind.config.js` under `theme` / `theme.extend`.
If you see a JS config, you are on v3; do not look for `@theme`.

Defaults: `sm` 40rem/640 · `md` 48rem/768 · `lg` 64rem/1024 · `xl` 80rem/1280 ·
`2xl` 96rem/1536. Base spacing `0.25rem`/4px.

### Friction with Figma

- **Utility class names are not tokens.** `bg-blue-500`, `p-4` are *usages*.
  Extract from the theme/config, never from the class names.
- **Spacing is a multiplier, so the scale is unbounded.** `p-7` = 28px is
  perfectly legal Tailwind even if your token list stops at 6. **Do not flag
  every value missing from the token list as debt** — the real test is
  *is it a multiple of the base unit*. Half-steps (`p-2.5`, `gap-1.5`) are the
  actual off-grid cases, because they resolve to 2/6/10/14px.
- **Breakpoints are in `rem`, Figma canvases are in px.** 40rem = 640px only at a
  16px root. If the app sets a root font size, record it; if a user enlarges
  text, real breakpoints shift and the Figma board cannot show it.
- **Arbitrary values `p-[10px]` are the escape hatch.** They are the honest
  signal of an intentional off-scale value — worth a guard rule either way, but
  read them as *deliberate* until proven otherwise.
- `rounded-full` is a built-in 9999px, not a token. Do not invent a token for it.

## Bootstrap

Tokens live in SCSS variables and maps in `_variables.scss`, compiled at build
time; a subset is also exposed at runtime as `--bs-*` CSS custom properties.

```scss
$spacer: 1rem;
$spacers: (0: 0, 1: $spacer * .25, 2: $spacer * .5,
           3: $spacer, 4: $spacer * 1.5, 5: $spacer * 3);
$grid-breakpoints: (xs: 0, sm: 576px, md: 768px, lg: 992px, xl: 1200px, xxl: 1400px);
```

### Friction with Figma

- **The spacer scale is non-linear**: 0 · 4 · 8 · 16 · 24 · 48px. Mapping it onto
  a linear 4px grid in Figma silently invents steps (12, 20, 32…) that the
  framework has no name for. Mirror the *named* steps, not the grid.
- **SCSS variables are compile-time.** Only what Bootstrap re-exposes as `--bs-*`
  exists at runtime, so a "sync tokens to CSS variables" pipeline will not see
  everything. Check which layer the project actually themes.
- **Breakpoints differ from every other framework** (576/992/1400 are Bootstrap-only).
  This is where the "tablet 768" mislabel does the most damage.
- Bootstrap components carry a lot of *component-level* decisions in variables
  (`$btn-padding-y`, `$card-spacer-x`). Those map to the **component tier**, not
  the semantic one.

## MUI (Material UI)

Tokens live in the theme object passed to `createTheme`.

```js
createTheme({
  spacing: 8,                                   // spacing(2) → 16px
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
  palette: { mode: 'light', primary: { main: '#1976d2' } },
  shape: { borderRadius: 4 },
})
```

### Friction with Figma

- **Spacing is a function, not a list.** `theme.spacing(n)` = n × 8 by default,
  so the scale is unbounded and there is no canonical set of steps to mirror.
  Take the steps the codebase actually uses (census them) rather than inventing
  a ladder.
- **`md` is 900, not 768.** The single most common cross-framework mistake.
- **`palette.mode`** already implements light/dark as a first-class axis —
  mirror it as a Figma *mode*, and check whether the project uses CSS variables
  (`cssVariables: true`) or runtime JS theming, because only the former is
  inspectable in the browser.

## Plain CSS custom properties

The easiest to mirror and the easiest to get wrong.

- Values live wherever `:root` (and theme selectors) are defined. **Check which
  selector wins per theme** — that tells you whether the theme is implemented at
  the primitive or the semantic tier (SKILL §5).
- `calc()`-derived scales (`--radius-sm: calc(var(--radius) - 4px)`) mean the
  code has **one seed and a formula**, while Figma will hold N literals. They
  agree today and drift the moment the seed changes. Either mirror the seed and
  document the formula, or accept and record the fragility.
- Custom properties have no type. DTCG requires one, and `dimension` requires a
  unit — record units explicitly or the export is lossy.

## CSS-in-JS (styled-components, Emotion, vanilla-extract, Panda, Chakra)

Tokens live in a theme object or a `.css.ts` contract. Two questions decide
everything:

1. **Runtime or build-time?** Build-time (vanilla-extract, Panda) compiles to CSS
   custom properties you can inspect in the browser; runtime theming may not
   expose anything to the DOM, so browser-side verification (`verification.md`)
   needs a different hook.
2. **Is there a single theme object, or one per component?** Per-component theme
   objects are component-tier tokens; do not promote them into the semantic tier
   just because they are easy to find.

## Reading the code before mirroring — checklist

- [ ] Which framework and which **major version** (the config location changes)
- [ ] Where the token source of truth is: CSS `@theme`, JS config, SCSS map,
      theme object, `.tokens.json`
- [ ] Whether the project **overrides the defaults** (assume it does)
- [ ] The **base unit** and whether the scale is a list or a multiplier
- [ ] The **breakpoint thresholds**, in the framework's own units
- [ ] Where the **theme switch** happens: primitive tier or semantic tier
- [ ] Which values are **legal-but-unlisted** (a multiplier scale has infinitely
      many) so you do not report them as debt

## Sources

- Tailwind CSS v4 theme variables — <https://tailwindcss.com/docs/theme>
- Bootstrap 5.3 breakpoints — <https://getbootstrap.com/docs/5.3/layout/breakpoints/>
- Bootstrap 5.3 spacing — <https://getbootstrap.com/docs/5.3/utilities/spacing/>
- MUI breakpoints — <https://mui.com/material-ui/customization/breakpoints/>
