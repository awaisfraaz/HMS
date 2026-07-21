---
name: Hospital Management System (HMS)
description: A clean, trustworthy multi-tenant SaaS platform for healthcare operations.
---

<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

# Design System: Hospital Management System (HMS)

## 1. Overview

**Creative North Star: "The Clinical Command Center"**

The HMS visual language is built around trust, high legibility, and operational speed. It rejects the overly flashy Web3 aesthetic—avoiding neon glows, heavy decorative gradients, and scroll-hijacking motion. Instead, it values solid, predictable UI patterns, clear grid layouts, and clean spacing inspired by Tailwind UI. The visual environment must support doctors, receptionists, and admins in high-tempo, stressful tasks.

**Key Characteristics:**
- High data density and grid-aligned metrics for easy clinical scanning.
- Fluid state feedback (hover, focus) that gives receptionists immediate interactive responses.
- Clear structural division between navigation, metrics, and data tables.

## 2. Colors

**The Committed Color Strategy.** Saturated, trustworthy healthcare colors (such as deep medical teal or navy) carry 30–60% of the surface layout (e.g., prominent sidebars, top headers, or primary actions), establishing a distinct, unified brand presence across all tenant hospitals.

### Primary
- **[Primary Healthcare Color]** (oklch() / #HEX): `[To be resolved during implementation. A deep, high-contrast healthcare teal or blue.]`

### Neutral
- **[Ink / Text Neutral]** (#HEX): `[To be resolved during implementation. High-contrast dark charcoal or near-black for body copy.]`
- **[Surface / Background Neutral]** (#HEX): `[To be resolved during implementation. Crisp off-white or soft gray for dashboards.]`

### Named Rules
**The Brand Presence Rule.** Trustworthy branding is established by utilizing saturated primary tones on 30–60% of surface boundaries, while maintaining absolute readability for secondary content.

## 3. Typography

**Display Font:** `[Single sans-serif font family to be chosen at implementation (e.g., Inter, Outfit, or Roboto)]`
**Body Font:** `[Single sans-serif font family to be chosen at implementation]`

**Character:** Clean, technical, and geometric. Using a single font family across display and body roles ensures visual simplicity and maximizes readability of dense tables and scheduling boards.

### Hierarchy
- **Display** (Bold, `[Size]`, `[Line-height]`): Hero statistics and primary page headers.
- **Headline** (Semi-bold, `[Size]`, `[Line-height]`): Section titles and form group headers.
- **Title** (Medium, `[Size]`, `[Line-height]`): Card headers, list items, and modal titles.
- **Body** (Regular, `[Size]`, `[Line-height]`): Form inputs, data table cell contents, and description text. Max line length: 65–75ch.
- **Label** (Medium/Semi-bold, `[Size]`, `[Letter-spacing]`): Table headers, status badges, and helper text.

## 4. Elevation

The system is flat-by-default to maximize screen space and avoid visual noise. Depth is conveyed primarily through clean borders, subtle background tints, and layout division rather than heavy shadows.

### Named Rules
**The Restrained Shadow Rule.** Ambient shadows are reserved exclusively for active, floating elements (e.g., dropdowns, popovers, or open modals) rather than standard layout card panels.

## 5. Components

`[Omitted in Seed Mode. Real components and token references will be documented here once code implementation begins.]`

## 6. Do's and Don'ts

### Do:
- **Do** design for a keyboard-first, mouse-optional receptionist workflow (focus states must be extremely visible).
- **Do** align all dashboard widgets to a consistent visual grid system.
- **Do** ensure text-to-background contrast ratios strictly exceed 4.5:1 for body and placeholder copy.

### Don't:
- **Don't** use cluttered, legacy medical software patterns with unreadably small font sizes, crowded input fields, and heavy borders.
- **Don't** use neon glows, decorative glassmorphic blurs, or heavy gradients that slow down rendering or distract the user.
- **Don't** apply scroll-hijacking or choreographed animation sequences; keep transitions instant or simple (fade/slide).
