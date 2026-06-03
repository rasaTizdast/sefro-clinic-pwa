---
name: Clinical Precision RTL
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#525657'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b6e70'
  on-tertiary-container: '#eff1f3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Vazirmatn
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Vazirmatn
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Vazirmatn
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Vazirmatn
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Vazirmatn
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Vazirmatn
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Vazirmatn
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
  label-sm:
    fontFamily: Vazirmatn
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Vazirmatn
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  2xl: 3rem
  container-max: 1440px
  gutter: 1rem
  sidebar-width: 280px
  sidebar-collapsed: 80px
---

## Brand & Style

The brand identity centers on clinical excellence, administrative efficiency, and high-end aesthetic medicine. The target audience includes clinic directors and medical practitioners who require a high-precision interface that balances a medical "white-space" feel with the functional density of a modern SaaS tool.

The design style is **Corporate / Modern**, heavily influenced by the "Linear" aesthetic: subtle borders, high-contrast typography, and a "sub-pixel" attention to detail. It employs a refined light/dark balance where surfaces are defined by thin, low-contrast strokes rather than heavy shadows. The interface is optimized for Persian (Farsi) users, ensuring that the visual weight and flow naturally support Right-to-Left (RTL) reading patterns.

**Visual Principles:**
- **Surgical Precision:** Strict adherence to grid systems and consistent 4px/8px scaling.
- **RTL-First Flow:** All UI logic, from navigation to data visualization, originates from the right.
- **Minimal Friction:** Interactive elements are clearly defined by the primary blue, while secondary information recedes into a sophisticated gray scale.

## Colors

The color system is designed for high legibility in clinical environments. The **Primary Blue (#2563eb)** is used for active states, primary actions, and brand reinforcement.

**Color Usage:**
- **Surfaces:** Use surface container colors for main application backgrounds and white (#FFFFFF) for cards and modals to create a layered "stacked" effect.
- **Grays:** A scale from Slate-50 to Slate-900 (Tailwind-inspired) provides the structure for borders, secondary text, and iconography.
- **Functional States:** Green, Amber, and Red are reserved strictly for status indicators (e.g., Appointment Confirmed, Pending Payment, Medical Alert).

## Typography

The design system utilizes **Vazirmatn**, a modern Persian sans-serif, chosen for its exceptional legibility in data-dense SaaS environments and its excellent alignment between Persian and Latin characters.

**RTL Optimization:**
- **Line Height:** Line heights are set slightly higher (1.5 - 1.6) for body text to accommodate Persian ascenders and descenders comfortably.
- **Font Weights:** Use "Medium" (500) for standard labels and "SemiBold/Bold" (600/700) for headers to maintain visual hierarchy in high-density tables.
- **Alignment:** Default text alignment is right. Numerical data in tables should be right-aligned unless specifically used for western-formatted codes.

## Layout & Spacing

The layout utilizes a **fluid grid** system with an 8px base unit. This ensures consistency across mobile, tablet, and desktop views.

**Breakpoints:**
- **Mobile (< 640px):** Single column, 16px side margins. Sidebar transforms into a bottom-sheet or a right-aligned drawer.
- **Tablet (640px - 1024px):** 12-column grid, 24px margins. Sidebar is usually collapsed to icons.
- **Desktop (> 1024px):** 12-column grid, fixed right-hand sidebar. Content follows a max-width of 1440px to prevent excessive line lengths.

**Layout Model:**
The sidebar is anchored to the **right**. Breadcrumbs and navigation paths flow from right to left. Tables and forms expand to fill the primary content area, utilizing flexbox for proportional spacing.

## Elevation & Depth

This design system uses **Tonal Layers** and **Low-contrast outlines** instead of heavy shadows to maintain a clean, clinical feel.

- **Level 0 (Background):** Surface color (#f8fafc). Used for the main app canvas.
- **Level 1 (Cards/Sidebar):** White (#FFFFFF) with a 1px border (#e2e8f0). No shadow.
- **Level 2 (Dropdowns/Menus):** White with a 1px border and a subtle "Soft Ambient" shadow (0 4px 6px -1px rgb(0 0 0 / 0.1)).
- **Level 3 (Modals/Dialogs):** White with a 1px border and a deep, diffused shadow (0 20px 25px -5px rgb(0 0 0 / 0.1)).

Glassmorphism is used sparingly, primarily for the **Header** background (blur: 8px, opacity: 80%) to allow content to scroll beneath it while maintaining context.

## Shapes

We use **Soft (0.25rem)** roundedness to reflect a balance between modern software and professional medical tools.

- **Standard Buttons/Inputs:** 0.25rem (4px).
- **Cards/Containers:** 0.5rem (8px).
- **Modals/Drawers:** 0.75rem (12px).
- **Badges/Chips:** Full pill (9999px) to distinguish them from interactive buttons.

This subtle rounding prevents the interface from feeling "sharp" or intimidating while maintaining a highly structured and organized aesthetic.

## Components

### Sidebar (Right-aligned)
- **Active State:** Primary blue background with white text/icon.
- **Structure:** Hierarchical grouping (e.g., Management, Medical, Finance) with collapsible sections. Icons appear to the right of the label.

### Header
- **Global Search:** Right-aligned icon, Persian placeholder text ("جستجو...").
- **Breadcrumbs:** Separated by a left-facing chevron (‹) reflecting the RTL flow.

### Tables
- **Density:** High. Row height 48px.
- **Header:** Light gray background (#f1f5f9) with 600-weight Persian labels.
- **Actions:** Last column on the left. Uses three-dot vertical menus.

### Forms
- **Labels:** Always right-aligned above the input.
- **Inputs:** 1px border-slate-200. On focus: 1px primary blue border with a 2px blue ring (opacity 10%).
- **Validation:** Error messages appear right-aligned below the input in Error Red.

### Cards
- **Header:** Includes a title and optional action (e.g., "See All") on the left side of the card header.
- **Padding:** Uniform 24px (1.5rem) for main dashboard widgets.

### Charts
- **Palette:** Primarily uses the #2563eb blue. For multiple data sets, use complementary shades of blue and slate-gray to maintain the clinical aesthetic. Avoid vibrant multi-color "rainbow" palettes.
