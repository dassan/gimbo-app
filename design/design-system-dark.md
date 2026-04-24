---
name: Gimbo Editorial Dark
colors:
  surface: '#0f141b'
  surface-dim: '#0f141b'
  surface-bright: '#343941'
  surface-container-lowest: '#090f15'
  surface-container-low: '#171c23'
  surface-container: '#1b2027'
  surface-container-high: '#252a32'
  surface-container-highest: '#30353d'
  on-surface: '#dee2ec'
  on-surface-variant: '#bbcbbb'
  inverse-surface: '#dee2ec'
  inverse-on-surface: '#2c3138'
  outline: '#869486'
  outline-variant: '#3d4a3e'
  surface-tint: '#4ae183'
  primary: '#54e98a'
  on-primary: '#003919'
  primary-container: '#2ecc71'
  on-primary-container: '#005027'
  inverse-primary: '#006d37'
  secondary: '#bec7d2'
  on-secondary: '#29313a'
  secondary-container: '#414a53'
  on-secondary-container: '#b0b9c4'
  tertiary: '#ffbebb'
  on-tertiary: '#68000f'
  tertiary-container: '#ff9592'
  on-tertiary-container: '#8a131e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6bfe9c'
  primary-fixed-dim: '#4ae183'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005228'
  secondary-fixed: '#dae3ee'
  secondary-fixed-dim: '#bec7d2'
  on-secondary-fixed: '#141c24'
  on-secondary-fixed-variant: '#3f4850'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#ffb3b0'
  on-tertiary-fixed: '#410006'
  on-tertiary-fixed-variant: '#8c1520'
  background: '#0f141b'
  on-background: '#dee2ec'
  surface-variant: '#30353d'
typography:
  h1:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.08em
  numeric-display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: -0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin: 32px
---

## Brand & Style

This design system is built on a foundation of **Editorial Modernism** blended with **Glassmorphism**. It is designed for high-net-worth individuals and tech-forward users who demand a sense of professional security and technical sophistication.

The aesthetic avoids the "flatness" often found in finance apps by utilizing deep tonal layering and subtle translucency. By rejecting pure black in favor of deep charcoal gradients, the interface achieves a more expensive, high-end feel. The emotional response is one of calm authority—where complex financial data is presented through clear typography and spacious, structured layouts.

## Colors

The palette centers on a **Deep Charcoal (#0A0C10)** foundation to provide better eye comfort and a sense of luxury compared to absolute black. 

- **Primary Emerald (#2ECC71):** Used specifically for growth, income, and positive financial trajectory. It should be used sparingly as an accent to ensure it retains its "vibrant" impact.
- **Semantic Coral (#FF6B6B):** A modern, softened red used for expenses and alerts, ensuring high legibility without appearing overly aggressive.
- **Surface Layering:** Card surfaces use **#161B22** to create a perceptible lift from the background.
- **Borders:** A consistent **#30363D** stroke is used to define boundaries in the dark environment.

## Typography

The design system utilizes **Inter** exclusively to maintain a systematic, utilitarian aesthetic that feels corporate yet contemporary. 

- **Headings:** Always rendered in pure white (#FFFFFF) with tighter letter-spacing to mimic high-end financial journals.
- **Body & Secondary Text:** Rendered in **#8B949E** to reduce visual noise and establish a clear information hierarchy.
- **Numeric Data:** For account balances, use the "Numeric Display" style with tighter tracking to emphasize precision and scale.

## Layout & Spacing

This design system employs a **Fixed Grid** philosophy for desktop (12-columns, 1200px max-width) and a fluid model for mobile. 

The spacing rhythm is based on a **4px baseline grid**. To achieve the "editorial" look, generous whitespace (48px+) is used between major sections to allow the data to breathe. 

- **Gutters:** 24px fixed to ensure clean vertical lines between financial widgets.
- **Margins:** 32px safe areas on mobile to emphasize a "premium" lack of crowding.

## Elevation & Depth

Depth in this design system is achieved through **Tonal Layering** and **Glassmorphism** rather than traditional heavy shadows.

1.  **Level 0 (Background):** #0A0C10 - The base canvas.
2.  **Level 1 (Cards/Sections):** #161B22 with a 1px solid border of #30363D.
3.  **Level 2 (Modals/Navigation):** Backdrop-blur (20px to 30px) with a semi-transparent fill of #161B22 at 80% opacity. This creates a "glass" effect that maintains the user's context.
4.  **Level 3 (Popovers/Tooltips):** A subtle 0.5 opacity black shadow with a 20px blur is used only at this highest level to provide a slight "float" over the glass layers.

## Shapes

The shape language is disciplined and "Soft" (0.25rem - 0.75rem). This avoids the playfulness of fully rounded "pill" shapes, maintaining a serious, professional tone. 

- **Standard Cards:** 0.5rem (8px) corner radius.
- **Input Fields:** 0.25rem (4px) corner radius for a sharper, more technical appearance.
- **Action Buttons:** 0.5rem (8px) to match cards.
- **Glass Overlays:** 0.75rem (12px) to soften the edges of floating elements.

## Components

- **Buttons:** Primary buttons use the Emerald Green background with black text for maximum contrast. Secondary buttons use a ghost style (border only) with white text.
- **Cards:** Defined by a #161B22 background and a 1px #30363D border. No box-shadow should be used on standard cards.
- **Input Fields:** Dark background (#0A0C10) with a 1px border. Focus state should change the border color to Emerald Green (#2ECC71).
- **Navigation:** Top or side navigation must use the glassmorphic blur effect (30px blur) to provide a sense of depth as content scrolls beneath it.
- **Data Tables:** Use thin 1px horizontal dividers (#30363D) and remove vertical lines to maintain an editorial feel.
- **Chips/Badges:** Small, low-contrast backgrounds (e.g., Emerald Green at 10% opacity) with high-contrast text for status indicators.