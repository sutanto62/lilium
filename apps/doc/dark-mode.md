# Dark Mode Design System

## Overview

Dark mode is enabled via Tailwind's `class` strategy (`darkMode: 'class'` in `tailwind.config.ts`).
Flowbite's `<DarkMode />` component (mounted in `Footer.svelte`) toggles the `dark` class on `<html>`.
All dark mode styling uses Tailwind's `dark:` variant — never JavaScript style overrides.

---

## Color Token Reference

Use these pairings consistently. **Never use a light-only class without its `dark:` counterpart.**

### Backgrounds

| Role | Light | Dark |
|---|---|---|
| Page / root | `bg-gray-50` | `dark:bg-gray-900` |
| Card / panel | `bg-white` | `dark:bg-gray-800` |
| Elevated / nested | `bg-gray-100` | `dark:bg-gray-700` |
| Input field | `bg-white` | `dark:bg-gray-700` |
| Danger surface | `bg-red-50` | `dark:bg-red-900/20` |
| Success surface | `bg-green-50` | `dark:bg-green-900/20` |
| Warning surface | `bg-yellow-50` | `dark:bg-yellow-900/20` |
| Overlay / modal | `bg-black/50` | *(unchanged — overlay is always dark)* |

### Text

| Role | Light | Dark |
|---|---|---|
| Primary / headings | `text-gray-900` | `dark:text-gray-100` |
| Body copy | `text-gray-700` | `dark:text-gray-300` |
| Secondary / muted | `text-gray-500` | `dark:text-gray-400` |
| Placeholder | `text-gray-500` | `dark:text-gray-400` |
| Danger text | `text-red-800` | `dark:text-red-400` |
| Success text | `text-green-800` | `dark:text-green-400` |
| Inverted (on dark bg) | `text-white` | *(unchanged)* |
| **Never use** | `text-black` | *(invisible on dark bg — use `text-gray-900` instead)* |

### Links (global, set in `app.css`)

```css
a { color: var(--color-primary-600); }      /* light */
.dark a { color: var(--color-primary-400); } /* dark  */
```

Primary-600 maps to `#0066B3` (dark blue — readable on white).
Primary-400 maps to `#3399FF` (lighter blue — readable on `gray-900`).

### Borders

| Role | Light | Dark |
|---|---|---|
| Default border | `border-gray-200` | `dark:border-gray-700` |
| Strong border | `border-gray-900` | `dark:border-gray-100` |
| Danger border | `border-red-200` | `dark:border-red-800` |
| Input border | `border-gray-300` | `dark:border-gray-600` |

### Interactive Elements (buttons, icon-buttons)

| State | Light | Dark |
|---|---|---|
| Neutral idle | `bg-gray-200 text-gray-600` | `dark:bg-gray-700 dark:text-gray-300` |
| Neutral hover | `hover:bg-gray-300` | `dark:hover:bg-gray-600` |
| Danger idle | `bg-red-200 text-gray-600` | `dark:bg-red-900 dark:text-gray-300` |
| Danger hover | `hover:bg-gray-300` | `dark:hover:bg-red-800` |
| Success hover | `hover:bg-green-300` | `dark:hover:bg-green-800` |

### Table / List Rows

| State | Light | Dark |
|---|---|---|
| Row hover | `hover:bg-gray-100` | `dark:hover:bg-gray-700` |
| Row border | `border-gray-100` | `dark:border-gray-700` |
| Group header row | `bg-gray-100` | `dark:bg-gray-700` |

### Navigation

| Element | Light | Dark |
|---|---|---|
| Admin navbar bg | `bg-primary-100` | `dark:bg-primary-700` |
| Nav subtitle | `text-gray-600` | `dark:text-gray-300` |
| Brand title | `text-gray-900` | `dark:text-white` |

---

## Tailwind Configuration

`apps/tailwind.config.ts` — no changes needed. Dark mode is already set to `'class'`.

The primary color scale used for links and navigation:

| Token | Hex | Use |
|---|---|---|
| `primary-400` | `#3399FF` | Dark mode links |
| `primary-600` | `#0066B3` | Light mode links |
| `primary-100` | `#CCE5FF` | Light navbar bg |
| `primary-700` | `#005299` | Dark navbar bg |

---

## Per-Component Reference

### Root Layout (`routes/+layout.svelte`)

```svelte
<main class="mx-auto bg-gray-50 dark:bg-gray-900">
  <div class="container mx-auto px-4 pt-20 lg:px-0 dark:bg-gray-900">
```

### Public Layout (`routes/f/+layout.svelte`, `routes/lingkungan/+layout.svelte`)

```svelte
<div class="container mx-auto px-4 pb-8 pt-8 dark:bg-gray-900 sm:pt-8 lg:px-0">
```

### Footer (`components/Footer.svelte`)

- `<Footer>` itself: `bg-transparent` — inherits page background. ✓
- Heading "Tentang Kami": `text-gray-900 dark:text-white`. ✓
- Body `<ul>`: `text-gray-700 dark:text-gray-400`. ✓
- HR divider: `border-gray-200 dark:border-gray-700`. ✓
- GitHub icon: `text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white`. ✓

### FeatureCard (`components/FeatureCard.svelte`)

```svelte
<h5 class="... text-gray-900 dark:text-white">
<p  class="... text-gray-700 dark:text-gray-400">
```

Flowbite's `<Card>` handles its own dark background. ✓

### JadwalKonfirmasiDetail (`components/jadwal/JadwalKonfirmasiDetail.svelte`)

```svelte
<!-- Card wrapper -->
<Card class="... bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100">

<!-- Delete button -->
class="... bg-red-200 text-gray-600 hover:bg-gray-300
        dark:bg-red-900 dark:text-gray-300 dark:hover:bg-red-800"

<!-- Download button -->
class="... bg-gray-200 text-gray-600 hover:bg-gray-300
        dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"

<!-- Footer timestamp row -->
class="... border-gray-200 dark:border-gray-600 dark:text-gray-400"
```

### JadwalKonfirmasi (`components/jadwal/JadwalKonfirmasi.svelte`)

```svelte
<!-- PIC / edit buttons -->
class="... bg-gray-200 text-gray-600 hover:bg-green-300
        dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-green-800"

<!-- Table row hover -->
<TableBodyRow class="hover:bg-gray-100 dark:hover:bg-gray-700">
```

### JadwalTimeline (`components/jadwal/JadwalTimeline.svelte`)

```svelte
<p   class="... text-gray-500 dark:text-gray-400">    <!-- church name -->
<div class="... text-gray-900 dark:text-gray-100">    <!-- stats area -->
<UsersOutline class="text-gray-500 dark:text-gray-400" />
```

### UsherDutyTable (`routes/lingkungan/UsherDutyTable.svelte`)

Already fully implemented. Reference pattern for new components:

```svelte
<!-- Select / input -->
class="... bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
class="... border-gray-300 dark:border-gray-600"

<!-- Error alert -->
class="... bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
class="... text-red-800 dark:text-red-400"

<!-- Empty state -->
class="... border-gray-200 dark:border-gray-700"
class="... text-gray-600 dark:text-gray-400"

<!-- Table header -->
<th class="... text-gray-900 dark:text-gray-100">
<!-- Group header row -->
class="... bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
<!-- Row hover -->
class="hover:bg-gray-50 dark:hover:bg-gray-800"
<!-- Badge -->
class="... bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
```

---

## Rules for New Components

1. **Never use `text-black`** — invisible on `dark:bg-gray-900`. Use `text-gray-900 dark:text-gray-100`.
2. **Every `bg-white` needs `dark:bg-gray-800`**. Every `bg-gray-50` needs `dark:bg-gray-800` or `dark:bg-gray-900`.
3. **Every `bg-gray-100`/`bg-gray-200` (surface) needs a dark counterpart** (`dark:bg-gray-700`).
4. **Every text class below `text-gray-900` needs a `dark:` pair** — see the Text table above.
5. **Danger/success/warning surfaces**: Use `/20` opacity variant on dark (`dark:bg-red-900/20`) to avoid overly saturated backgrounds.
6. **Flowbite components** (`<Card>`, `<Table>`, `<Navbar>`) handle their own dark backgrounds — do not add `dark:bg-*` to their wrappers unless overriding.
7. **Print styles** (`print:hidden`, `print:bg-white`) are exempt — they target physical output, not dark mode.

---

## Checklist for New Components

Before merging a new Svelte component, verify:

- [ ] No bare `text-black` usage
- [ ] All `bg-white` / `bg-gray-*` surfaces have a `dark:bg-*` counterpart
- [ ] All text color classes have a `dark:text-*` counterpart
- [ ] All `border-*` classes have a `dark:border-*` counterpart
- [ ] Interactive elements (buttons, rows) have `dark:hover:*` states
- [ ] Danger/success/warning alerts use the token pairs from this doc
- [ ] Links inherit the global `app.css` dark override (no custom link color needed unless intentional)

---

## Known Out-of-Scope Areas

These components intentionally do not support dark mode:

| Component | Reason |
|---|---|
| `/admin/tatib/[id]/cetak` (print page) | Print-only route; dark mode unnecessary |
| `PostHogDemo.svelte` | Dev/debug component, not user-facing |
