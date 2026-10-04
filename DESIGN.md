---
version: alpha
name: Knowledge Gym — Alpine Commons
description: A scenic day-and-night learning workspace with quiet reading surfaces.
colors:
  canvas: "#bfd1d8"
  surface: "#eff5f5"
  sand: "#cddde0"
  muted: "#dce8eb"
  line: "#aabfc5"
  control: "#55717b"
  strong: "#193642"
  body: "#304f5b"
  subtle: "#3f5965"
  accent: "#12657a"
  accent-hover: "#0e5366"
  accent-soft: "#d2e7ed"
  sage: "#cfe1dd"
  positive: "#27624f"
  warning: "#874821"
  danger: "#a63844"
  on-accent: "#f4fbfb"
  dark-canvas: "#09141e"
  dark-surface: "#111f2a"
  dark-sand: "#142732"
  dark-muted: "#1a2f3c"
  dark-line: "#354c59"
  dark-control: "#718995"
  dark-strong: "#edf5f8"
  dark-body: "#cad9df"
  dark-subtle: "#a7bdc7"
  dark-accent: "#8bd6dc"
  dark-accent-hover: "#b1e9ed"
  dark-accent-soft: "#173c48"
  dark-sage: "#1d3d3c"
  dark-positive: "#97d9b7"
  dark-warning: "#f4c593"
  dark-danger: "#ffb5be"
  dark-on-accent: "#102b34"
typography:
  headline:
    fontFamily: "var(--font-geist), system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  auth-title:
    fontFamily: "var(--font-geist), system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  body:
    fontFamily: "var(--font-geist), system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  reading:
    fontFamily: "var(--font-geist), system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.8
  label:
    fontFamily: "var(--font-geist), system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
  nav:
    fontFamily: "var(--font-geist), system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  mono:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
rounded:
  control: "8px"
  notice: "12px"
  panel: "16px"
  auth-story: "18px"
  auth-mobile: "22px"
  auth-window: "28px"
  pill: "9999px"
spacing:
  micro: "4px"
  sm: "8px"
  md: "16px"
  panel: "20px"
  gutter: "24px"
  lg: "32px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.strong}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.strong}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "44px"
  auth-field:
    textColor: "{colors.strong}"
    rounded: "{rounded.control}"
    height: "48px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "20px"
  nav-active:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.strong}"
    rounded: "{rounded.control}"
  topic-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
---

# Design System: Knowledge Gym

## Overview

**Creative North Star: "Alpine Commons"**

A quiet learning workspace in an original layered mountain landscape. Daylight uses mist-blue surfaces and deep teal actions; night uses navy surfaces and pale aqua actions. The owner supplied light/dark login references and explicitly requested replacing the former beige background without changing fields or authentication behavior.

The atmosphere belongs behind the task. Authentication uses a translucent window and an illustrated side panel; learning and administration retain near-opaque reading planes, native controls and the existing task hierarchy. Source authority is app/scenic.css, lib/theme.ts, tailwind.config.ts and components/ui.tsx. This is a code-led interpretation of the supplied references, not a pixel-for-pixel screenshot recreation.

**Key Characteristics:**
- Original layered mountain, pine forest, river and day/night sky artwork.
- Persistent light/dark preference, with daylight as the initial default.
- Locally bundled Geist typography and genuine Phosphor icons.
- Translucent authentication, quiet near-opaque learning surfaces.

## Colors

The base color keys describe daylight; dark-prefixed keys are their nighttime counterparts. Runtime utilities resolve through RGB custom properties so opacity variants remain supported. The CSS palettes and contrast-test palettes are checked for synchronization.

### Primary

Teal identifies actions and focus in daylight. Pale aqua takes that role at night, with a dark action foreground rather than white text. The sign-in action uses a restrained same-hue gradient between accent and accent-hover.

### Secondary

Sage/forest tones remain selection and success cues. Warning/danger are semantic colors only, with theme-appropriate foregrounds.

### Neutral

Mist-blue light surfaces and navy night surfaces support the same heading/body/supporting-text hierarchy. Learning planes are 93% surface; the header and rail use 80–82% surface. Auth fields are translucent, with a stronger control boundary.

**The Boundary Rule.** Editable controls use control, not the quieter line color.

## Typography

The existing local Geist family stays shared across authentication, learner and admin screens. Geist Mono remains reserved for code. Task headings are 26px on narrow screens and 30px from the small breakpoint. Auth headings are 30px mobile / 32px desktop; the auth-story statement is 28–38px. Reading retains 16px type with 1.8 line-height.

**The Workhorse Rule.** Preserve the locally served type family and source-language learning content.

## Layout

The app retains its 232px desktop rail from 1024px, its 1320px main cap and its 16/32/48px responsive main gutters. Pagination and learning-choice placement remain unchanged.

Authentication is a centered 1032px-max window with a .88 / 1.12 split. At 767px and below the story is hidden and the form becomes one column, capped at 460px. There is no fixed viewport-height form: short/landscape viewports can scroll. Auth controls are at least 48px high, with 16px input text to avoid sub-16px iOS focus zoom. The mobile frame includes safe-area padding and prefixed Safari blur support. The login form fits the checked 390×844 portrait viewport.

The mobile app theme control sits next to the navigation disclosure; from 640px it sits in the header. This preserves space for the product name on narrow screens.

## Elevation & Depth

The landscape establishes real compositional depth through mountain facets, forest silhouettes and mist layers. The auth window has a diffuse downward shadow, a refracted light edge and 24px backdrop blur; the scene beneath remains distinct. Ordinary study panels stay flat.

**The Reading Plane Rule.** Atmosphere stays behind tasks; reading/editor surfaces do not inherit the auth window's transparency.

## Shapes

Existing controls retain 8px corners, notices 12px and study panels 16px. Auth uses a 28px desktop window, 22px mobile window and 18px story frame. Theme switching is a circular 44px control with a real SVG icon.

## Components

### Authentication

AuthShell supplies the shared scenic frame for login, registration, password recovery and verification. It preserves route-specific children and copy. The form remains steady while scenic layers move; full desktop composition is not squeezed into a mobile screen.

### Scenic background

MountainScene is authored SVG geometry, not a remotely sourced image or a stretched reference screenshot. IDs are instance-specific. A single fixed background serves all routes; auth adds a portrait composition. Small transform-only drift takes 29–38 seconds and fog takes 25–33 seconds. An independent sky band keeps clouds, birds and meteors visible outside the auth window instead of cropping them with the terrain. Daylight adds two six-bird flocks on repeating 24-second passages, staggered by 12 seconds, with 1.6-second wingbeats. Three softly shaded clouds drift over 74/91/107-second cycles. Night pauses the birds and adds five recurring meteor tracks with 9–13-second cycles, staggered .4/2.2/4.2/6.4/8.3-second starts and roughly one-second flights. Reduced motion freezes birds/clouds, disables scenic drift and hides meteors. Hidden tabs and the hidden mobile story pause their decorative loops. Scrollbar thumb/track/hover use the current control/surface/accent tokens in both themes. Snow-cap boundaries are derived from the actual ridge edges, with clipped shading on the same facet as the mountain. No pointer listeners, canvas loop, scrolling hijack or external graphics library is required.

### Theme preference

Light is the default. The kg.theme preference persists locally and synchronizes across tabs. The pre-paint bootstrap reads only this preference, never authentication data. Native form color-scheme follows the selected theme. Theme changes do not trigger auth/learning mutations.

### Fields and actions

Labels, types, autocomplete, required flags, busy/error states and route destinations remain intact. Auth errors sit on a stable readable surface. Ordinary buttons retain 44px minimum targets; auth fields/buttons use 48px. Focus/caret/selection stay themed.

### Learning containers and navigation

Keep the existing module hierarchy, progressive display limits, mobile-local practice region and full-main-width footer pagination. Theme colors apply to shared controls and text. Diagram labels use semantic fills; mastery numbers remain dark on their existing light circles.

## Do's and Don'ts

- Do reuse semantic colors in both themes, including SVG text labels.
- Do keep authentication fields, validation, API calls and redirects unchanged.
- Do keep continuous scenic movement behind content and honor reduced motion.
- Do check iPhone 13 portrait/landscape and narrow mobile layouts.
- Don't ship the reference screenshots as backgrounds or call this a literal recreation.
- Don't put transparent reading text directly on moving terrain.
- Don't introduce fixed-height mobile forms or prevent native page scrolling.
- Don't invent study statistics, outcomes or translated learning content.
