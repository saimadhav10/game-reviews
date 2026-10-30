---
name: Canary Pop Editorial
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4b4731'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#7c775f'
  outline-variant: '#cdc7aa'
  surface-tint: '#6a5f00'
  primary: '#6a5f00'
  on-primary: '#ffffff'
  primary-container: '#ffe600'
  on-primary-container: '#726600'
  inverse-primary: '#dec800'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e5e2e1'
  on-secondary-container: '#656464'
  tertiary: '#b91e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffddd6'
  on-tertiary-container: '#c72000'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#fde400'
  primary-fixed-dim: '#dec800'
  on-primary-fixed: '#201c00'
  on-primary-fixed-variant: '#504700'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#ffdad3'
  tertiary-fixed-dim: '#ffb4a5'
  on-tertiary-fixed: '#3e0400'
  on-tertiary-fixed-variant: '#8e1400'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-xl:
    fontFamily: Anton
    fontSize: 64px
    fontWeight: '400'
    lineHeight: 68px
    letterSpacing: 0.02em
  headline-xl-mobile:
    fontFamily: Anton
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 52px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: 0.03em
  headline-sm:
    fontFamily: Anton
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.03em
  title-lg:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Space Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Anton
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
spacing:
  gutter: 1.25rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
This design system marries raw comic-strip paneling with modern high-impact digital publishing. Built for gaming journalism, pop-culture platforms, and high-energy interactive media, it projects audacity, precision, and unapologetic attitude. The visual language takes inspiration from graphic novel framing, pulp print treatments, and Japanese pop editorial layouts.

The design movement centers on **High-Contrast Pop Brutalism**:
- Heavy structural black ink lines (2.5px to 3px) define every container, module, and card partition.
- Massive, condensed display typography commands screen real estate with urgent, athletic presence.
- Electric canary yellow accents serve as high-visibility callouts, energetic focal points, and interactive catalysts.
- Utilitarian precision prevents the aesthetic from slipping into chaos: clear grids, strict hierarchy, and razor-sharp typographic discipline ground the comic-strip energy.

## Colors
The palette relies on stark, punchy separation with uncompromising contrast ratios:

- **Primary (`#FFE600`):** Electric Canary Yellow. Used for hero interaction triggers, active state fills, review scores, rating blocks, and highlighted editorial phrases.
- **Secondary (`#111111`):** Deep Ink Black. Used for text headers, panel outlines, structural borders, inverted badges, and solid drop shadows. Never use soft gray where ink black can provide punch.
- **Tertiary (`#FF4422`):** Pop Vermilion. An urgent accent reserved for spoiler reveals, breaking news tags, alert states, and micro-stickers.
- **Neutral Canvas (`#FFFFFF` & `#F4F4F0`):** Crisp White surfaces backed by an ultra-light newsprint tint for card canvas separation.
- **Muted Ink (`#666666`):** Secondary metadata, timestamps, and breadcrumb trails that remain legible against bright surfaces without fighting primary headlines.

## Typography
Typographic contrast is extreme and deliberate. We pair **Anton**—a towering, dense, high-impact condensed display face—with **Space Grotesk**—a technical, geometric grotesque that provides razor-sharp readability for editorial reviews, dense spec tables, and metadata.

- All display headlines rendered in Anton must be styled in uppercase with tight line-height to emulate comic titles and vintage pop placards.
- `body-lg` and `body-md` maintain ample line-height to guarantee high legibility despite the aggressive structural framing around them.
- `label-md` and `label-sm` use bold weights and uppercase casing for metadata, taglines, and ratings to keep information punchy and scannable at micro-scales.

## Layout & Spacing
The layout follows a modular comic-strip panel philosophy, shifting from full-bleed editorial displays down to structured grid panels.

- **Desktop (12 Columns):** Employs an asymmetrical grid simulating comic book gutters. Elements sit inside explicit 2.5px solid black borders, spaced apart by `gutter-desktop` (2rem). Outer canvas margin is pinned to `margin-desktop` (3rem).
- **Tablet (8 Columns):** Panels collapse into balanced paired modules. Margins adjust to 2rem and gutters to 1.5rem.
- **Mobile (4 Columns):** Panels stack sequentially like a vertical webcomic. Canvas margin reduces to 1rem to prioritize content width.
- Structural elements never float ambiguously; they snap decisively to the grid or abut one another with shared or adjacent solid borders.

## Elevation & Depth
In keeping with comic strip pop graphics, this system completely rejects blurred ambient drop shadows, soft lighting, and translucent glassmorphism.

Depth is achieved purely through **Hard Pop Projection**:
- **Primary Elevation:** A solid, hard-edged offset shadow in pure `#111111` with `0px` blur radius (`box-shadow: 4px 4px 0px #111111`).
- **Interactive State (Hover/Focus):** The card or button shifts `-2px, -2px` on the X/Y axes while the hard shadow expands to `6px 6px 0px #111111`.
- **Pressed/Active State:** The element translates `+2px, +2px` with shadow snapping down to `0px 0px 0px #111111`, simulating mechanical button depression.
- **Layer Stacking:** Containers overlap cleanly with explicit 2.5px black borders, yellow accent fills, or white surface panels. Depth is graphic, flat, and tactile.

## Shapes
Shapes in this design system are strictly **Sharp (`roundedness: 0`)**. 

- Every corner on cards, buttons, badges, tabs, and input fields sits at an unapologetic 90-degree angle.
- Outer borders are set to a uniform `2.5px solid #111111` (or `3px` on prominent hero feature frames).
- Speech bubbles and dialogue tail flourishes use angular 45-degree and 90-degree geometric points rather than rounded organic curves.
- This razor-sharp geometric boundary reinforces the ink-and-paper print quality of classic comics.

## Components

### Buttons
- **Primary Button:** Canary yellow (`#FFE600`) background, 2.5px solid `#111111` border, pure black Anton uppercase typography (`label-lg`), and a 4px 4px hard black drop shadow. On hover, shifts up and left with a 6px shadow.
- **Secondary Button:** Pure white background, 2.5px solid `#111111` border, Space Grotesk bold text, 3px 3px hard drop shadow.
- **Inverted / Destructive Button:** Solid black (`#111111`) fill with white or vermilion text and hard yellow offset shadow (`3px 3px 0px #FFE600`).

### Cards & Comic Panels
- Bounded by 2.5px solid black borders with clean white or light newsprint backgrounds.
- Image areas within cards are framed like distinct comic cells, separated by an internal 2.5px divider line.
- Feature headers within cards sit inside a top canary-yellow title bar.

### Badges & Category Stickers
- Small, sharp rectangular chips with bold 2px black borders.
- Backgrounds alternate between `#FFE600` (reviews, highlights), `#FF4422` (breaking, alerts, hot takes), and `#111111` with white text (formats, platforms).
- Text uses uppercase `label-md` with `0.06em` letter spacing.

### Tabs & Segmented Controls
- Sharp, conjoined rectangular tabs sharing an interlocking 2.5px border grid.
- Active tabs feature a solid canary yellow fill with bold black text; inactive tabs use crisp white with a subtle hover color shift to `#FFF9B2`.

### Review & Rating Displays
- Large, bold metric blocks: A dedicated square or vertical panel with a solid yellow fill, framed in 3px black lines, housing the score in massive Anton typography (e.g., "9.5" or "10/10") accompanied by punchy critique stamps ("ESSENTIAL", "VERDICT").

### Spoiler Tags & Text Obfuscation
- Interactive redaction blocks: Unrevealed spoilers appear as solid black rectangular bars (`#111111`) with yellow hazard diagonal striping or a small yellow "SPOILER — CLICK TO REVEAL" label. On click, the black fill snaps instantly to light newsprint with a 2px dotted outline.

### Input Fields & Checkboxes
- **Inputs:** Thick 2px solid black frames, square corners, white background. On focus, the field gains a canary yellow inset or a hard offset shadow (`3px 3px 0px #FFE600`).
- **Checkboxes & Radios:** Pure square checkboxes (never circular radios; both use square motif). Selected state fills with solid yellow, displaying a heavy black graphic checkmark or X.