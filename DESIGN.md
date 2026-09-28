# MindNotes Pro — DESIGN.md

Design system for MindNotes Pro, a local-first whiteboard drawing app.
AGENTS.md tells agents how to build the project; this file tells them how it
should look and feel. Follow it when creating or modifying any UI surface.

## 1. Visual Theme & Atmosphere

- **A warm sketchbook, not a cold tool.** The canvas is cream paper, the
  chrome is quiet white glass, and deep warm ink marks the primary actions
  and the active tool. Every saturated color belongs to the user's artwork,
  not to the UI.
- Impressionist heritage: the only multi-hue palette is the Monet drawing
  palette, and it appears only inside the canvas experience (stroke/fill
  swatches, the empty-state flourish, plus one toast accent). Chrome never
  borrows it.
- Calm, flat, editorial. Depth comes from float semantics (menus, modals,
  docks float; everything docked is flat), not from decoration. No gradients,
  no colored glows.
- Density: one single-row topbar (brand → tools → tool options → history &
  file actions) floating over a generous empty canvas. 14px body, 44px touch
  targets.
- The empty canvas teaches with images, Drawnix-style: a hand-sketched mini
  mind map (with a pencil drawing a dashed branch) shows what the app makes,
  the 40px/300 wordmark brands it, and short-note arrows annotate the real
  chrome. Quick-start cards render true miniature previews of each template
  (`TemplateMiniPreview`) instead of describing them in words.

## 2. Color Scheme & Roles

### Light theme (default)

| Token | Value | Role |
|---|---|---|
| `--canvas` | `#faf9f5` | App background / drawing surface. Always warm cream, never cool gray. |
| `--bg` | `#f7f4ee` | Inverted text on ink tooltips; neutral filler. |
| `--card` | `rgba(255,255,255,0.94)` | Glass chrome surface (toolbars, docks); always paired with `--glass` blur. |
| `--card-solid` | `#ffffff` | Opaque surface for menus, sheets, modals, inputs. |
| `--text` | `#1c1917` | Primary ink: headings, labels, tooltip background. |
| `--text-2` | `#4d463f` | Secondary ink: descriptions, idle-but-interactive labels. |
| `--text-3` | `#6f675c` | Tertiary ink: meta, placeholders, idle icons. |
| `--text-4` | `#7d7468` | Faintest ink: estimates, footnotes. |
| `--border` | `rgba(58,48,38,0.16)` | Hairlines. Warm ink at 16%, never pure gray/black. |
| `--primary` | `#a9583e` | Burnt sienna. Active tool fill, primary CTA fill, emphasis text. White on it ≥ 5:1. |
| `--primary-hover` | `#8f4630` | Hover/pressed fill on primary surfaces (darkens in light mode). |
| `--primary-light` | `rgba(169,88,62,0.14)` | Focus rings, selection rings. |
| `--primary-bg` | `rgba(169,88,62,0.08)` | Hover wash and selected background tint. |
| `--danger` | `#b94141` | Destructive actions only. |
| `--success` | `#2e7d50` | Saved/ok status. |
| `--glow` | `rgba(169,88,62,0.2)` | Reserved for the saving-status dot pulse. Nothing else glows. |
| `--ink` | `#2b241d` | Primary buttons and active tool fill. White-on-ink ≥ 12:1. |
| `--ink-hover` | `#1f1a14` | Hover/pressed fill on ink surfaces (darkens in light mode). |
| `--on-ink` | `#f7f4ee` | Text/icons on ink fills. |

### Dark theme (`.dark`)

| Token | Value |
|---|---|
| `--canvas` / `--bg` | `#171411` — warm near-black, never blue-black |
| `--card` | `rgba(37,31,27,0.96)` |
| `--card-solid` | `#251f1b` |
| `--text` / `--text-2` / `--text-3` / `--text-4` | `#f2ede6` / `#c8bdb0` / `#ada294` / `#8f8578` |
| `--border` | `rgba(226,214,198,0.14)` |
| `--primary` / `--primary-hover` | `#d08a6c` / `#dba387` (hover lightens in dark mode) |
| `--danger` / `--success` | `#e07878` / `#75bd91` |
| `--ink` / `--ink-hover` / `--on-ink` | `#f2ede6` / `#fbf7f0` / `#241f1a` — ink inverts to cream in dark mode |

### Monet drawing palette (content-only)

Eight pastels, defined as CSS vars and mirrored in `tailwind.config.js`.
They color user strokes, the empty-state flourish, and at most one toast
accent (`--monet-gold` for warnings). Never use them for buttons, links, or
chrome. The document `bgColor` is user content — the paper keeps its chosen
color when the chrome goes dark, and anything drawn ON the paper (onboarding
art, canvas dots) picks ink by contrasting `bgColor`
(`isDarkPaperColor`), never by chrome theme. Clearing the canvas resets the
paper to defaults (`DEFAULT_BG_COLOR` / `DEFAULT_BG_STYLE`, background image
removed) so the welcome is always a pristine sheet.

`--monet-lavender #b8a0d0` · `--monet-rose #d49898` · `--monet-sage #90b888` ·
`--monet-sky #90b4d0` · `--monet-gold #d0b888` · `--monet-water #a8cce0` ·
`--monet-warm #e0c8a8` · `--monet-blush #d8b8a8`

### Canvas texture

Grid / dots / ruled / notebook backgrounds are drawn with warm ink at ≤ 6%
alpha in light mode (e.g. `rgba(140,118,88,0.06)`) and ≤ 5% warm in dark mode
(e.g. `rgba(190,170,150,0.05)`).

## 3. Typography

- Stack: `--font-ui` system UI + self-hosted Noto Sans SC variable font
  (CJK-subset). Canvas text uses its own renderer font and is out of scope.
- Ramp: body/label `14px/20px`, meta `12px/18px`. Weights: `400` regular,
  `500` medium — never 700 in UI chrome.
- Numeric readouts (zoom %, sizes, counts) use `font-variant-numeric: tabular-nums`.
- Headings ≥ 16px: weight 400–500, up to `-0.2px` letter-spacing. Prefer a
  larger size over a heavier weight.
- Section labels inside menus: 11px, weight 600, uppercase.

## 4. Component Styles

Radius scale (use the vars, avoid one-off values): `--radius-sm: 4px` for tiny
chips, `--radius: 6px` for buttons/inputs/menu items, `--radius-lg: 8px` for
panels/cards/modals/sheets. Phone sheets use `8px 8px 0 0`.

- **Tool buttons `.tbtn` / `.abtn` (44×44, 40×40 inside the topbar)**:
  transparent idle with `--text-3` icon. Hover: `--primary-bg` wash +
  `--primary` icon, scale ≤ 1.05. Active tool `.on`: solid `--ink` fill with
  `--on-ink` icon — no gradient, no glow, no extra hover scale.
- **Primary CTA `.pill-btn.primary`**: solid `--ink`, `--on-ink` label, radius
  `--radius`, 34px tall. Hover: `--ink-hover`. No lift, no glow. The same ink
  treatment covers `empty-canvas-action-primary`, `template-save-btn`, and the
  mobile active tool.
- **Ghost buttons**: transparent, `--primary-bg` wash on hover.
- **Menus (`.toolbar-menu`, `.em-menu`)**: `--card-solid`, radius `--radius-lg`,
  `--shadow-lg`, 6px padding; items min-height 34px, radius `--radius`, hover
  `--primary-bg` + `--primary`; 11px uppercase section labels; 1px separators.
- **Modals / bottom sheets**: `--card-solid`, radius `--radius-lg`, `--shadow-lg`,
  dim overlay `rgba(20,15,11,0.32)` with 4px blur.
- **Docked chrome (topbar, layers dock, brand chip)**: glass —
  `--card` + `--glass` blur(16px) saturate(1.2), hairline border, `--shadow-lg`.
  This is the only place "frosted" is allowed.
- **Tooltips**: custom `Tooltip` renders below the trigger via a body portal
  (ink-filled variant with `--text` background is used for legacy `data-tip`
  bubbles); 8–12px meta text.
- **Status dot**: 7px circle; success glows via
  `color-mix(in srgb, var(--success) 40%, transparent)`, saving uses `--primary`
  (+ `--glow` pulse), error uses `--danger`.
- **Inputs**: 32–38px tall, radius `--radius`–`--radius-lg`, `--border` border;
  focus: `--primary` border + `0 0 0 3px var(--primary-light)`.
- **Disabled controls**: opacity 0.38 (never lower — ghosted must stay
  perceivable), `pointer-events: none`.
- **Empty state**: a hand-sketched mini mind-map SVG as hero (dashed branch +
  pencil = "your turn"), 40px/300 wordmark with sienna swash, 14px italic
  tagline, note arrows pointing at the real topbar (hidden < 1200px, labels
  ≤ 5 characters), actions row, and a "快速开始" row of template cards whose
  previews are true miniatures rendered from template elements.

## 5. Layout Principles

- 4px base unit. Chrome docks to the canvas edges with `--canvas-edge: 12px`
  gutter; the bottom respects `--canvas-bottom-safe` (safe-area inset).
- One canvas, one floating topbar row: brand → drawing tools → tool options
  (scrollable center with edge arrows on overflow) → history, template and
  file actions. No vertical tool rail.
- Touch targets ≥ 44px everywhere (explicit `(hover: none)` and mobile rules
  enforce this).
- Breakpoints: desktop > 1024; tablet 769–1024; phone ≤ 768; small phone ≤ 400.

## 6. Depth & Hierarchy

Color-first, shadows rare — a shadow means "this floats":

- `--shadow-sm: 0 1px 3px rgba(40,32,26,0.08)` — resting cards, preview tiles.
- `--shadow-md: 0 5px 18px rgba(40,32,26,0.11)` — docked panels, selection bars.
- `--shadow-lg: 0 12px 32px rgba(40,32,26,0.16)` — menus, modals, toolbars, tooltips.

Dark mode uses larger, softer black shadows
(`0 4px 24px rgba(0,0,0,0.3)` family). All light-mode shadow ink is warm
`rgba(40,32,26,…)` — never cool slate or pure black. Gradients and colored
glow shadows are not part of the system.

## 7. Do / Don't

**Do**

- Anchor every screen on the cream canvas `#faf9f5` (light) / `#171411` (dark).
- Spend `--ink` on: the primary CTA and the active tool. Spend `--primary`
  sienna only on small accents: hover washes, focus/selection rings, links,
  emphasis text.
- Keep hover feedback as an 8% `--primary-bg` wash; selected = wash +
  `--primary` text/border.
- Reserve shadows for floating layers; flat-fill everything docked.
- Keep ink warm: text, borders, shadows all derive from warm brown-black.
- Keep the type ramp at 14/12px with 400/500 weights; `tabular-nums` for numbers.

**Don't**

- Don't use cool gray or pure white canvases, blue-black darks, or slate text.
- Don't add gradients, colored glows, or hover scale jumps above 1.05.
- Don't fill large surfaces with sienna — big brown blocks read as mud; ink
  carries large fills.
- Don't spend Monet pastels on UI chrome — they belong to the user's artwork
  (empty-state flourish and toast warning gold excepted).
- Don't introduce a second accent hue (no blue links, no green CTAs;
  `--danger`/`--success` are semantic only).
- Don't bold UI labels beyond 500; prefer size over weight.
- Don't hardcode one-off radii or hex values in components — use the tokens.

## 8. Responsive Behavior

- **Tablet 769–1024**: hide pill-button labels (icons only); the topbar center
  scroll gains edge arrows; the status strip docks bottom-left and hides
  secondary segments.
- **Phone ≤ 768**: the topbar is replaced by a bottom 8-column tool grid
  (62px tall) plus full-width bottom sheets for "more", export, and layers
  (radius `8px 8px 0 0`). Selection actions become a 4-column bar above the
  toolbar. Status becomes a compact bottom-left chip (top-left while a
  selection bar or expanded layer panel is open).
- **≤ 400px**: the tool grid wraps to 2 rows × 4 columns; floating bars lift
  by 122px.
- **Touch**: every control ≥ 44px; `-webkit-tap-highlight-color: transparent`;
  `touch-action: manipulation` on canvas controls.
- **Motion**: `prefers-reduced-motion` collapses all transitions/animations.

## 9. Agent Prompt Guide

Quick reference:

> Cream canvas `#faf9f5` · warm ink `#1c1917` · ink CTA `#2b241d` +
> `--on-ink` label · sienna accent `#a9583e` (small accents only) · hairline
> `rgba(58,48,38,0.16)` · glass chrome `rgba(255,255,255,0.94)` + blur(16px) ·
> radius 4/6/8 · warm shadows `rgba(40,32,26,…)` · 14px/12px ramp, weight
> 400/500 · 44px touch targets (40px desktop topbar).

Ready-made prompts:

- "Add a menu item for X. Follow DESIGN.md: 34px min-height, radius
  `var(--radius)`, hover = `var(--primary-bg)` wash + `var(--primary)` text,
  no shadows."
- "Create a confirm dialog for Y using DESIGN.md tokens: `var(--card-solid)`,
  radius `var(--radius-lg)`, shadow `var(--shadow-lg)`, buttons per Component
  Styles."
- "Add a tool button: 44px `.tbtn`, idle `var(--text-3)`, hover wash + scale
  1.05, active solid `var(--primary)` with a white icon, no glow."
