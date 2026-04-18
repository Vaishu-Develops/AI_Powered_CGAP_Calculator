 ---
name: au-cgpa-calculator
description: >
  Full-stack frontend skill for building the AU (Anna University) CGPA Calculator — a premium,
  Gen Z–targeted academic tool with OCR marksheet parsing, animated CGPA results, placement
  eligibility, and "What If" grade simulator. Use this skill for ANY component, page, feature, or
  animation within this project. Triggers on: uploading marksheets, OCR extraction UI, CGPA result
  page, subject breakdown tables, classification banners, stat cards, charts, placement eligibility,
  animations, Pearl & Plasma theming, Holographic Terminal theme, or any AU regulation grade logic.
  Also triggers when the user asks about tech stack decisions, library choices, or new feature
  additions to this project.
---

# AU CGPA Calculator — Frontend Skill

## Project Identity

**"Pearl & Plasma meets Holographic Terminal"**
This is not a utility app. It's an emotional, shareable, iPhone-grade academic experience.
Every component should feel like it belongs on a Figma showcase or a Linear product page.

**Core User Promise:** "Upload your marksheet → Get a stunning, shareable CGPA result in seconds."

---

## Tech Stack — Canonical Choices

### Framework & Runtime
```
Next.js 14+         → App Router, Server Components, file-based routing
TypeScript          → Strict mode, all files .tsx/.ts
```

### Styling
```
Tailwind CSS 3.4+   → Utility-first; use CSS variables for theme tokens
tailwind-merge      → Conflict-safe className merging (clsx + twMerge pattern)
clsx                → Conditional classNames
```

> ⚠️ **NEVER hardcode color hex values in components.** Always use CSS variables (see Design Tokens section).

### Animation — The Most Critical Layer
```
Framer Motion 11+   → Page transitions, spring animations, layout animations
                      Use for: entry sequences, CGPA card reveal, banner drops,
                      stat card stagger, chart draw-on, button interactions

GSAP 3 (via @gsap/react)
                    → Complex timeline sequences, odometer roll, particle effects,
                      split-flap animation, liquid fill, SVG path drawing

react-spring        → Physics-based micro-interactions (hover lifts, card bounces)

lottie-react        → JSON Lottie files for: confetti, gear+book spinner,
                      animated badge SVG draw, file-flies-to-folder
```

**Animation Priority Rule:**
- Simple enter/exit/layout → Framer Motion
- Multi-step timelines, number counters, odometers → GSAP
- Particle systems (CGPA particle assemble) → tsParticles or custom canvas
- Celebratory effects (confetti) → `canvas-confetti` (lightweight, 3KB)

### Charts
```
Recharts            → Primary: gradient bars, glow line, area charts (React-native, SSR-safe)
Victory             → Radar/spider chart (better API than Recharts for radar)
d3-scale + custom   → Radial bar chart (Recharts radial is limited)
```

### OCR & File Handling
```
react-dropzone      → Upload zone with shake/reject animations
browser-image-compression → Auto-compress before OCR if image >2MB
react-image-crop    → Optional crop/straighten before OCR
```

### Forms & Validation
```
React Hook Form     → Zero re-render form state
Zod                 → Schema validation (marksheet fields, grade inputs)
```

### State Management
```
Zustand             → Global state: uploaded files, OCR result, CGPA data, theme
                      Keep stores small and domain-scoped
immer               → Immutable state updates in Zustand
```

### UI Component Primitives
```
Radix UI            → Accessible headless: Dialog, Select, Tooltip, Tabs, Collapsible
                      (for What If Simulator panel, grade dropdowns, subject expand)
@radix-ui/react-*   → Install only what's needed, not the full suite
```

### Fonts
```
next/font           → Always use next/font, never <link> to Google Fonts

Primary:    DM Sans (body, labels, UI text)
Monospace:  DM Mono (CGPA numbers, grade values, stat metrics)
Display:    Inter or Sora (classification banner, hero headings)
```

### Utilities
```
date-fns            → If any date handling (session history timestamps)
nanoid              → Unique IDs for session/file keys
react-hot-toast     → Toasts for: OCR errors, save success, copy to clipboard
```

### Export & Sharing
```
html2canvas         → Screenshot result card for share image
jsPDF               → PDF export of full result report
file-saver          → Trigger browser download
xlsx                → Excel export of subject table
```

### PWA
```
next-pwa            → Service worker, manifest, "Add to Home Screen"
                      Cache OCR worker and grade tables offline
```

---

## Design Token System

### CSS Variables (globals.css)

```css
:root {
  /* Pearl & Plasma Theme */
  --bg-primary: #F8F6FF;
  --bg-card: #FFFFFF;
  --bg-card-alt: #F3F0FF;

  --color-primary: #7C3AED;       /* Violet */
  --color-secondary: #8B1A1A;     /* AU Maroon */
  --color-accent-1: #F59E0B;      /* Golden amber */
  --color-accent-2: #EC4899;      /* Hot pink */
  --color-success: #10B981;
  --color-neutral: #6B7280;

  --text-primary: #1E1B4B;
  --text-muted: #9CA3AF;
  --border: #EDE9FE;
  --glow: rgba(124, 58, 237, 0.12);

  /* Spacing / Radius */
  --radius-card: 20px;
  --radius-pill: 9999px;
  --shadow-card: 0 4px 24px rgba(124, 58, 237, 0.10);
  --shadow-card-hover: 0 8px 32px rgba(124, 58, 237, 0.18);
}

[data-theme="holographic"] {
  --bg-primary: #0A0A0F;
  --bg-card: rgba(255, 255, 255, 0.04);
  --bg-card-alt: rgba(124, 58, 237, 0.08);
  --border: rgba(124, 58, 237, 0.25);
  --glow: rgba(124, 58, 237, 0.35);
  /* Glass morphism cards in dark mode */
  --card-backdrop: blur(20px) saturate(180%);
}
```

### Grade Color Map (TypeScript constant)
```typescript
export const GRADE_COLORS = {
  O:   { bg: '#7C3AED', text: '#fff', label: 'Outstanding' },
  'A+':{ bg: '#EC4899', text: '#fff', label: 'Excellent' },
  A:   { bg: '#F59E0B', text: '#fff', label: 'Very Good' },
  'B+':{ bg: '#0EA5E9', text: '#fff', label: 'Good' },
  B:   { bg: '#14B8A6', text: '#fff', label: 'Above Average' },
  C:   { bg: '#F97316', text: '#fff', label: 'Average' },
  U:   { bg: '#EF4444', text: '#fff', label: 'Fail / Arrear' },
  RA:  { bg: '#EF4444', text: '#fff', label: 'Reappear' },
} as const;
```

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, font setup, theme provider
│   ├── page.tsx                # Landing / Upload stage
│   ├── preview/page.tsx        # OCR preview + edit stage
│   └── result/page.tsx         # Results page (the climax)
│
├── components/
│   ├── upload/
│   │   ├── DropZone.tsx        # react-dropzone + shake animation
│   │   ├── FilePreviewGrid.tsx # Thumbnail grid + file count badge
│   │   └── QualityWarning.tsx  # Blur detection warning
│   │
│   ├── ocr/
│   │   ├── OCRScanner.tsx      
│   │   ├── ScanProgress.tsx    # PCB trace / gear+book progress UI
│   │   └── ScanOverlay.tsx     # Green grid box overlay on image
│   │
│   ├── preview/
│   │   ├── SideBySideView.tsx  # Image left, table right
│   │   ├── EditableTable.tsx   # Inline cell editing, amber highlights
│   │   └── SubjectAutosuggest.tsx
│   │
│   ├── result/
│   │   ├── ClassificationBanner.tsx   # Ribbon/stamp/pill/badge variants
│   │   ├── CGPAHeroCard.tsx           # All 10 animation variants (prop-driven)
│   │   ├── StatCards.tsx              # 4-tile metric grid
│   │   ├── PerformanceScale.tsx       # Gradient journey bar
│   │   ├── SubjectTable.tsx           # Sortable, color-coded, expandable
│   │   ├── SemesterChart.tsx          # Chart variant switcher
│   │   ├── WhatIfSimulator.tsx        # Collapsible, live recalculation
│   │   ├── PlacementEligibility.tsx   # Staggered checklist animation
│   │   └── ActionBar.tsx              # Sticky bottom CTA bar
│   │
│   ├── ui/
│   │   ├── GradePill.tsx       # Colored pill with grade label
│   │   ├── BentoCard.tsx       # Base bento cell with hover lift
│   │   ├── GlassCard.tsx       # Holographic theme glass card
│   │   ├── LoadingCopy.tsx     # Rotating micro-copy messages
│   │   └── ConfettiBlast.tsx   # canvas-confetti wrapper
│   │
│   └── layout/
│       ├── ThemeProvider.tsx
│       └── BottomNav.tsx       # Mobile bottom nav
│
├── lib/
│   ├── ocr/
│   │   ├── worker.ts           # Tesseract worker setup
│   │   └── parser.ts           # Extract subject/grade/credit from OCR text
│   │
│   ├── cgpa/
│   │   ├── calculator.ts       # CGPA, GPA, weighted points logic
│   │   ├── regulations.ts      # AU 2017/2019/2021/2024 grade tables
│   │   └── classifier.ts       # Classification logic → First Class etc.
│   │
│   └── placement/
│       └── eligibility.ts      # Company cutoff database
│
├── store/
│   ├── uploadStore.ts          # Files, OCR status
│   ├── marksheetStore.ts       # Extracted data, edited cells
│   └── resultStore.ts          # Final CGPA, classification, history
│
└── types/
    └── index.ts                # Subject, Grade, Marksheet, CGPAResult types
```

---

## AU Regulation Logic

### Grade → Grade Point Map

```typescript
// AU 2021 Regulation (R2021)
export const GRADE_POINTS: Record<string, number> = {
  O:    10,
  'A+':  9,
  A:     8,
  'B+':  7,
  B:     6,
  C:     5,
  U:     0,   // Arrear
  RA:    0,   // Reappear
  SA:    0,   // Short Attendance (treated as arrear)
  W:     0,   // Withheld
};

// CGPA Formula
// GPA (semester) = Σ(Grade Point × Credits) / Σ(Credits)
// CGPA (cumulative) = Σ(all Grade Point × Credits) / Σ(all Credits)
```

### Classification Thresholds (AU)
```typescript
export const CLASSIFICATIONS = [
  { min: 9.0,  label: 'First Class with Distinction (Exemplary)', emoji: '🏆' },
  { min: 8.5,  label: 'First Class with Distinction',             emoji: '🥇' },
  { min: 7.5,  label: 'First Class',                              emoji: '🎓' },
  { min: 6.5,  label: 'Second Class',                             emoji: '📘' },
  { min: 5.0,  label: 'Pass Class',                               emoji: '✅' },
  { min: 0,    label: 'Fail',                                     emoji: '❌' },
];
// Classification is VOID if any arrear exists → show warning
```

---

## Results Page — Animation Sequence

Implement using Framer Motion `useAnimate` + GSAP timeline:

```
t=0.0s  Background fades in (opacity 0→1, 300ms ease-out)
t=0.3s  "Calculating..." text fades OUT (150ms)
t=0.6s  ClassificationBanner drops from y:-60 → y:0 (spring: stiffness 300, damping 25)
t=0.9s  CGPAHeroCard scales from scale:0.7 → scale:1 (spring bounce, duration 600ms)
t=1.2s  StatCards stagger-slide from x:-40 → x:0 (stagger: 120ms each)
t=1.6s  Chart draws itself (strokeDashoffset animation, 800ms ease-in-out)
t=2.0s  ActionBar fades up from y:20 → y:0
t=2.3s  Violet pulse radiates from CGPA number (keyframe ring scale 1→2.5, opacity 1→0)

IF classification >= "First Class":
  t=0.9s  canvas-confetti burst (violet #7C3AED, gold #F59E0B, pink #EC4899)
           spread: 100, particleCount: 180, origin: { y: 0.4 }
```

---

## CGPA Hero Card — Variant System

The `CGPAHeroCard` component accepts a `variant` prop:

```typescript
type CGPAVariant =
  | 'circular-gauge'    // SVG arc, violet→gold gradient stroke
  | 'odometer'          // GSAP stagger digit roll (RECOMMENDED DEFAULT)
  | 'liquid-fill'       // CSS clip-path animated liquid
  | 'frosted-reveal'    // CSS filter blur 20px → 0
  | 'neon-sign'         // text-shadow glow flicker keyframes
  | 'split-flap'        // Airport board, GSAP timeline per digit
  | 'typewriter'        // chars type one by one, blinking cursor
  | 'particle-assemble' // tsParticles or canvas API
  | 'gradient-wipe'     // CSS mask-image wipe reveal
  | 'flip-card'         // CSS perspective + rotateY 180°
```

**Default variant:** `odometer` — most universally satisfying, works on all devices.

For mobile Safari compatibility: avoid `split-flap` and `particle-assemble` as primary on low-end devices. Provide `prefers-reduced-motion` fallback (simple fade) for all variants.

---

## Loading Progress — PCB Trace Implementation

```typescript
// PCB-style circuit trace using SVG + Framer Motion pathLength
// Micro-copy rotates through these strings with 2s interval:
const LOADING_MESSAGES = [
  "Reading your marksheet...",
  "Extracting subject codes...",
  "Cross-checking with AU regulations...",
  "Calculating grade points...",
  "Crunching your CGPA...",
  "Almost there...",
];
```

Use `animate={{ pathLength: 0 → 1 }}` on an SVG `<path>` shaped like a PCB trace (right-angle lines, not curves). Pair with a gear+book Lottie that plays alongside.

---

## Bento Card System

Every result page tile is a `<BentoCard>`:

```typescript
interface BentoCardProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';   // controls grid span
  glowOnHover?: boolean;
  children: React.ReactNode;
}

// Base styles:
// border-radius: var(--radius-card)  → 20px
// box-shadow: var(--shadow-card)
// transition: transform 200ms, box-shadow 200ms
// hover: translateY(-3px), var(--shadow-card-hover)
// Holographic theme: backdrop-filter: var(--card-backdrop)
```

Bento grid layout (CSS Grid):
```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto;
  gap: 16px;
}
/* CGPA hero: col-span-5, stat cards: col-span-3 each, chart: col-span-12 */
```

---

## Subject Table — Interaction Spec

| Interaction | Behavior |
|---|---|
| Click column header | Sort ascending → descending → original |
| Hover row | Violet 3px left border slides in (Framer Motion layoutId) |
| Click row | Expands to show full subject name (Collapsible, Radix) |
| Highest weighted row | Gold `#F59E0B` left border, subtle gold bg tint |
| Arrear row | Red `#EF4444` tint, shake animation on mount |
| OCR low-confidence cell | Amber highlight + pencil icon, click to inline-edit |

---

## What If Simulator — Logic

```typescript
// Recalculate CGPA when user changes a grade in the simulator
function simulateCGPA(
  subjects: Subject[],
  override: { subjectCode: string; newGrade: Grade }
): number {
  const modified = subjects.map(s =>
    s.code === override.subjectCode
      ? { ...s, grade: override.newGrade, gradePoint: GRADE_POINTS[override.newGrade] }
      : s
  );
  return calculateCGPA(modified);
}
// Show delta: +0.16 in green, -0.08 in red, animated number transition
```

---

## Mobile-First Rules

1. **Upload zone** — full viewport height on mobile (`h-[100dvh]`)
2. **Bottom sheet** — use Radix `Dialog` with `data-[state=open]:slide-in-from-bottom` instead of modals
3. **Semester navigation** — horizontal scroll snap (`scroll-snap-type: x mandatory`)
4. **Haptic feedback** — `navigator.vibrate(50)` on CGPA reveal (wrapped in feature detect)
5. **Camera** — `<input type="file" accept="image/*" capture="environment">` for direct camera
6. **Thumb zones** — all primary CTAs in bottom 40% of screen on mobile
7. **Grade pill tap targets** — minimum 44×44px (WCAG AA)

---

## Performance Rules

- **Tesseract.js** runs in a Web Worker — NEVER block main thread
- **Charts** — lazy import Recharts/Victory with `next/dynamic` + `ssr: false`
- **GSAP** — import only used plugins (`gsap/TextPlugin`, `gsap/MotionPathPlugin`)
- **Canvas confetti** — dynamic import, only fires once
- **Images** — always `next/image` with `priority` on marksheet preview
- **OCR worker** — initialize on page load (not on file drop) to hide startup latency

---

## Accessibility Baseline

- All animations respect `prefers-reduced-motion` — provide instant/fade fallback
- Grade pills have `aria-label="Grade: O (Outstanding)"`
- CGPA number has `aria-live="polite"` for screen reader announce
- Keyboard nav: Tab through all table cells; Enter to edit; Escape to cancel
- Color is never the sole differentiator — always pair with icon or label

---

## Emotional Design — Score-Based Effects

```typescript
const SCORE_EFFECTS = {
  9.0:  { confetti: 'gold-rain',   banner: 'Exceptional! 🏆',   color: '#F59E0B' },
  8.5:  { confetti: 'violet-burst', banner: 'Outstanding! 🥇',  color: '#7C3AED' },
  7.5:  { confetti: 'sparkles',    banner: 'First Class! 🎓',   color: '#7C3AED' },
  6.5:  { confetti: null,          banner: 'Well Done! 📘',     color: '#0EA5E9' },
  6.0:  { confetti: null,          banner: 'You Passed ✅',     color: '#10B981' },
  0:    { confetti: null,          banner: 'Keep Going 💪',     color: '#6B7280' },
};
// hasArrear → show supportive message + improvement tips card regardless of CGPA
```

---

## Placement Eligibility Database

```typescript
export const COMPANIES = [
  { name: 'TCS',          cutoff: 6.0,  tier: 'mass' },
  { name: 'Infosys',      cutoff: 6.5,  tier: 'mass' },
  { name: 'Wipro',        cutoff: 6.0,  tier: 'mass' },
  { name: 'Cognizant',    cutoff: 7.0,  tier: 'mass' },
  { name: 'Accenture',    cutoff: 7.5,  tier: 'mid' },
  { name: 'Capgemini',    cutoff: 6.0,  tier: 'mass' },
  { name: 'HCL',          cutoff: 6.0,  tier: 'mass' },
  { name: 'Tech Mahindra',cutoff: 6.0,  tier: 'mass' },
  { name: 'Google',       cutoff: 8.0,  tier: 'dream' },
  { name: 'Microsoft',    cutoff: 8.0,  tier: 'dream' },
  { name: 'Amazon',       cutoff: 7.5,  tier: 'dream' },
  { name: 'Goldman Sachs',cutoff: 9.0,  tier: 'elite' },
  { name: 'Zoho',         cutoff: 7.0,  tier: 'mid' },
  { name: 'Freshworks',   cutoff: 7.5,  tier: 'mid' },
] as const;
// Checkmarks animate in with stagger 80ms each using Framer Motion
// Progress bar at bottom: eligibleCount / total * 100
```

---

## Package.json — Key Dependencies Snapshot

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "tailwind-merge": "^2.3.0",
    "clsx": "^2.1.0",
    "framer-motion": "^11.2.0",
    "gsap": "^3.12.5",
    "@gsap/react": "^2.1.0",
    "react-spring": "^9.7.3",
    "lottie-react": "^2.4.0",
    "recharts": "^2.12.0",
    "victory": "^37.0.0",
    "tesseract.js": "^5.0.0",
    "react-dropzone": "^14.2.0",
    "browser-image-compression": "^2.0.2",
    "zustand": "^4.5.0",
    "immer": "^10.1.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-tooltip": "^1.0.7",
    "react-hook-form": "^7.51.0",
    "zod": "^3.23.0",
    "canvas-confetti": "^1.9.2",
    "html2canvas": "^1.4.1",
    "jspdf": "^2.5.1",
    "file-saver": "^2.0.5",
    "xlsx": "^0.18.5",
    "react-hot-toast": "^2.4.1",
    "nanoid": "^5.0.0",
    "next-pwa": "^5.6.0"
  }
}
```

---

## Anti-Patterns — Never Do These

- ❌ Don't use `localStorage` for OCR results — use Zustand + session only
- ❌ Don't run Tesseract on the main thread — always Web Worker
- ❌ Don't use modals for inline edits — use inline cell editing (contentEditable or input)
- ❌ Don't hardcode hex colors — always `var(--color-primary)` or Tailwind token
- ❌ Don't use `alert()` / `confirm()` — use react-hot-toast or Radix Dialog
- ❌ Don't import all of GSAP — tree-shake to only used modules
- ❌ Don't block animation sequence for slow networks — show result immediately, load charts async
- ❌ Don't skip `prefers-reduced-motion` — required for accessibility
- ❌ Don't collapse the bento layout to a simple stacked list on desktop — maintain the hierarchy
- ❌ Don't use `<form>` elements — use React Hook Form with `handleSubmit` only

---

## Quick Reference — Most-Used Patterns

```typescript
// Card with hover lift (Framer Motion)
<motion.div
  className="bento-card"
  whileHover={{ y: -3, boxShadow: 'var(--shadow-card-hover)' }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
/>

// Stagger children entry
const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const item = { hidden: { x: -40, opacity: 0 }, show: { x: 0, opacity: 1 } };

// Grade pill
<span style={{ background: GRADE_COLORS[grade].bg }} className="px-3 py-1 rounded-full text-white font-semibold text-sm">
  {grade}
</span>

// CGPA odometer (GSAP)
gsap.to(counter, { innerText: cgpa, duration: 1.5, snap: { innerText: 0.01 }, ease: 'power2.out' });

// Confetti burst
import confetti from 'canvas-confetti';
confetti({ particleCount: 180, spread: 100, colors: ['#7C3AED', '#F59E0B', '#EC4899'], origin: { y: 0.4 } });
```
