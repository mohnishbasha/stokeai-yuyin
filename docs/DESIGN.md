# Yuyin Design System

Version: 0.1.0
Status: Draft
Date: 2026-11-10

This document supersedes the design seed in the build prompt once it is committed. Where the two differ, this document wins. Every colour, type, and spacing value in the product comes from the tokens defined here and from nowhere else.

Contents: 1 Design principles, 2 Color tokens, 3 Typography, 4 Spacing, 5 Component inventory, 6 Wireframes, 7 Signature element, 8 Motion, 9 Accessibility, 10 Content voice, 11 Anti-patterns.

---

## 1. Design principles

1. **A precise instrument.** The interface looks like a measuring tool: dark, quiet, one warm accent. It shows state and measurements, not decoration.
2. **Devanagari is a first-class script.** Every layout, input, table cell, and truncation rule is checked with Hindi text before it ships. Hindi strings appear beside English ones as equals.
3. **Show the request and the response.** Wherever a feature has an API call behind it, the screen can show that call as curl, TypeScript, or Python.
4. **Measured or absent.** A number on screen comes from a measurement, a ledger, or a config file. If none exists, the screen says so. No invented figures.
5. **Cost is visible before it is incurred.** Code point counts, estimated cost, and balance are shown next to the action that spends credit.
6. **One accent, one animation.** A single accent colour per screen. The pulse line is the only animated element.
7. **Keyboard complete.** Every action reachable without a pointer, with a visible focus ring, in both themes.
8. **Every state is designed.** Empty, loading, error, and disabled states are specified with the same care as the default state, and each is reachable through a query flag in the mock layer.

---

## 2. Color tokens

Tokens are CSS variables. Dark is the default theme; light is selected by `data-theme="light"` or the user's OS preference when the user has not chosen. Components must reference tokens, never hex values.

Contrast ratios below were computed with the WCAG 2.x relative luminance formula. An automated test over this table runs in CI (S2-T08) and fails the build if any required pair drops below its threshold. Thresholds: 4.5:1 for text under 24 px (or under 18.66 px bold), 3:1 for large text, UI component boundaries, focus indicators, and graphical objects.

### 2.1 Dark theme (default)

| Token | Hex | Usage |
|---|---|---|
| `--bg-0` | `#0B0D10` | Page background |
| `--bg-1` | `#12151A` | Panels, cards, sidebar |
| `--bg-2` | `#1A1E25` | Raised surfaces, inputs, table header |
| `--bg-3` | `#242A33` | Hover and selected rows, active tab fill |
| `--line` | `#2B323C` | Decorative dividers and panel borders (not a control boundary) |
| `--line-strong` | `#6B7686` | Borders of interactive controls (inputs, selects, checkboxes) |
| `--text-0` | `#F2F4F7` | Primary text, headings |
| `--text-1` | `#B4BCC8` | Secondary text, labels, table body |
| `--text-2` | `#7C8696` | Tertiary text, placeholders, helper text. Never on `--bg-3` |
| `--accent` | `#F5A524` | Marigold: primary action fill, pulse line, focus ring, links |
| `--accent-ink` | `#1A1200` | Text and icons on an accent fill |
| `--accent-dim` | `#F5A52433` | Focus halo, selected glow behind a focus ring |
| `--ok` | `#3DD68C` | Success text and icons |
| `--warn` | `#F5A524` | Warning text and icons (same value as accent; see rule below) |
| `--err` | `#F2555A` | Error text and icons, destructive action fill |
| `--info` | `#5AA9F2` | Informational text and icons |

Required dark pairs (computed):

| Foreground | Background | Ratio | Threshold | Result |
|---|---|---|---|---|
| `--text-0` | `--bg-0` | 17.66 | 4.5 | Pass |
| `--text-0` | `--bg-1` | 16.60 | 4.5 | Pass |
| `--text-0` | `--bg-2` | 15.17 | 4.5 | Pass |
| `--text-0` | `--bg-3` | 13.11 | 4.5 | Pass |
| `--text-1` | `--bg-0` | 10.16 | 4.5 | Pass |
| `--text-1` | `--bg-1` | 9.55 | 4.5 | Pass |
| `--text-1` | `--bg-2` | 8.73 | 4.5 | Pass |
| `--text-1` | `--bg-3` | 7.54 | 4.5 | Pass |
| `--text-2` | `--bg-0` | 5.29 | 4.5 | Pass |
| `--text-2` | `--bg-1` | 4.97 | 4.5 | Pass |
| `--text-2` | `--bg-2` | 4.54 | 4.5 | Pass |
| `--text-2` | `--bg-3` | 3.93 | 4.5 | **Fail: forbidden pairing** |
| `--accent` | `--bg-0` | 9.53 | 4.5 | Pass |
| `--accent` | `--bg-1` | 8.96 | 4.5 | Pass |
| `--accent` | `--bg-2` | 8.19 | 4.5 | Pass |
| `--accent-ink` | `--accent` | 9.10 | 4.5 | Pass |
| `--ok` | `--bg-0` / `--bg-1` / `--bg-2` | 10.37 / 9.75 / 8.91 | 4.5 | Pass |
| `--err` | `--bg-0` / `--bg-1` / `--bg-2` | 5.77 / 5.42 / 4.95 | 4.5 | Pass |
| `--info` | `--bg-0` / `--bg-1` / `--bg-2` | 7.78 / 7.31 / 6.68 | 4.5 | Pass |
| `--line-strong` | `--bg-0` / `--bg-1` / `--bg-2` | 4.23 / 3.97 / 3.63 | 3.0 | Pass (control boundary) |
| `--accent` focus ring | `--bg-0` / `--bg-1` / `--bg-2` | 9.53 / 8.96 / 8.19 | 3.0 | Pass |
| `--line` | `--bg-0` | 1.50 | n/a | Decorative only |

### 2.2 Light theme

The seed values for three light tokens fail AA when measured. This document overrides them. The seed value is kept in the notes column so the change is traceable.

| Token | Hex | Usage | Note |
|---|---|---|---|
| `--bg-0` | `#FBFAF7` | Page background | Seed |
| `--bg-1` | `#FFFFFF` | Panels, cards, sidebar | Seed |
| `--bg-2` | `#F3F1EC` | Raised surfaces, inputs, table header | Seed |
| `--bg-3` | `#E9E6DF` | Hover and selected rows | Seed |
| `--line` | `#DAD6CC` | Decorative dividers and panel borders | Seed |
| `--line-strong` | `#7A828E` | Borders of interactive controls | New |
| `--text-0` | `#14171C` | Primary text | Seed |
| `--text-1` | `#474E5A` | Secondary text | Seed |
| `--text-2` | `#5F6775` | Tertiary text, placeholders | Override. Seed `#7A8290` measured 3.71 on `--bg-0`, below 4.5 |
| `--accent` | `#9A5A00` | Primary action fill, pulse line, focus ring, links | Override. Seed `#C77700` measured 3.32 on `--bg-0` and 3.46 with white ink |
| `--accent-ink` | `#FFFFFF` | Text on accent fill | Seed |
| `--accent-dim` | `#9A5A0026` | Focus halo | New |
| `--ok` | `#1A7F4E` | Success | New |
| `--warn` | `#8A5A00` | Warning | New |
| `--err` | `#B02E33` | Error, destructive fill | New |
| `--info` | `#2A6FB8` | Information | New |

Required light pairs (computed):

| Foreground | Background | Ratio | Threshold | Result |
|---|---|---|---|---|
| `--text-0` | `--bg-0` / `--bg-1` / `--bg-2` / `--bg-3` | 17.21 / 17.96 / 15.91 / 14.41 | 4.5 | Pass |
| `--text-1` | `--bg-0` / `--bg-1` / `--bg-2` / `--bg-3` | 8.03 / 8.38 / 7.43 / 6.73 | 4.5 | Pass |
| `--text-2` (override) | `--bg-0` / `--bg-1` / `--bg-2` / `--bg-3` | 5.46 / 5.70 / 5.05 / 4.57 | 4.5 | Pass |
| `--accent` (override) | `--bg-0` / `--bg-1` / `--bg-2` | 5.24 / 5.47 / 4.85 | 4.5 | Pass |
| `--accent-ink` | `--accent` (override) | 5.47 | 4.5 | Pass |
| `--ok` | `--bg-0` / `--bg-1` / `--bg-2` | 4.80 / 5.01 / 4.44 | 4.5 | Fails on `--bg-2` (4.44): do not place `--ok` body text on `--bg-2`; use on `--bg-0` or `--bg-1` only |
| `--err` | `--bg-0` / `--bg-1` / `--bg-2` | 5.18 / 5.41 / 4.79 | 4.5 | Pass |
| `--info` | `--bg-0` / `--bg-1` / `--bg-2` | 4.95 / 5.17 / 4.58 | 4.5 | Pass |
| `--warn` | `--bg-0` / `--bg-1` / `--bg-2` | 5.68 / 5.93 / 5.25 | 4.5 | Pass |
| `--line-strong` | `--bg-0` / `--bg-1` / `--bg-2` | 3.72 / 3.88 / 3.44 | 3.0 | Pass (control boundary) |
| `--accent` focus ring | `--bg-0` / `--bg-1` / `--bg-2` | 5.24 / 5.47 / 4.85 | 3.0 | Pass |

The CI contrast test is the source of truth. Any disagreement between it and these hand-computed figures is a defect in this table.

### 2.3 Colour rules

- Status is never conveyed by colour alone. Every status pairs colour with an icon and a text label.
- `--warn` equals `--accent` in dark. A warning is therefore always accompanied by a warning icon and the word, so it cannot be confused with a primary action. A warning region has no filled button in `--accent`.
- One accent per screen: no second hue is introduced for emphasis. `--ok`, `--warn`, `--err`, `--info` appear only as status.
- `--line` is decorative. Any boundary that identifies an interactive control uses `--line-strong`.
- Charts use `--accent` for the primary series, `--text-1` for the second, and dashed or dotted strokes plus direct labels for further series. They do not rely on hue to be told apart.
- Forced-colours mode: borders use `CanvasText`, the focus ring uses `Highlight`, and the pulse line uses `CanvasText`.

---

## 3. Typography

### 3.1 Families

| Role | Family | Fallback stack |
|---|---|---|
| Sans (UI and prose) | IBM Plex Sans | `system-ui, sans-serif` |
| Devanagari | IBM Plex Sans Devanagari | `"Noto Sans Devanagari", sans-serif` |
| Mono (code, numbers) | IBM Plex Mono | `ui-monospace, monospace` |

The Latin and Devanagari faces are listed together in one `font-family` so that a Hinglish line falls through per glyph. Fonts are self-hosted as WOFF2 with `font-display: swap`, subset into Latin, Latin Extended, and Devanagari, and preloaded for the weights used above the fold.

### 3.2 Scale

| Style | Size / line height (px) | Weight | Devanagari size / line height | Use |
|---|---|---|---|---|
| display | 44 / 52 | 500 | 44 / 56 | Marketing home headline only |
| h1 | 32 / 40 | 500 | 32 / 44 | Page title |
| h2 | 24 / 32 | 500 | 24 / 36 | Section title |
| h3 | 18 / 26 | 600 | 18 / 30 | Panel title, card title |
| body | 15 / 24 | 400 | 15 / 28 | Prose, form text, table body |
| small | 13 / 20 | 400 | 13 / 24 | Helper text, captions, badges |
| mono | 13 / 20 | 400 | n/a | Code, keys, IDs, numbers in tables and meters |

Rules:

- Weights 400, 500, 600 only. No bold above 600, no italics for emphasis in Devanagari.
- Numbers in tables, meters, the TTFA readout, and the balance use the mono face with `font-variant-numeric: tabular-nums`.
- Body prose line length is 60 to 75 characters. Documentation prose caps at 72ch.
- No letter-spacing on Devanagari. Uppercase transforms are not applied to Devanagari and are avoided for Latin labels longer than one word.
- Truncation uses CSS ellipsis only on single-line identifiers. Text containing conjuncts is never cut by character count in script; clip on grapheme cluster boundaries when truncating in code.

### 3.3 Devanagari rules

1. Devanagari text gets a line height 4 px larger than Latin at the same size (see scale). Anything holding user text (textarea, preview, transcript, table cell) switches line height when the text contains Devanagari, using `:lang(hi)` and a `lang` attribute set from detection.
2. Set `lang="hi"` on Hindi spans and `lang="hi-Latn"` on romanised Hindi so screen readers and hyphenation pick correct rules. Hinglish mixed text gets `lang="hi"` on the container and `lang="en"` on embedded English spans where it can be determined.
3. Shirorekha (headline bar) must connect across adjacent glyphs. Do not apply `letter-spacing`, `text-rendering: optimizeSpeed`, or font-synthesised bold or italic.
4. Containers must not clip ascenders, matras above the line (such as the i-matra and the anusvara) or below the line (such as the u-matra). Inputs have at least 4 px vertical padding extra for Devanagari.
5. Never break inside a conjunct or between a consonant and its matra. Use `overflow-wrap: anywhere` only in code and key contexts, not in prose.
6. Numerals: UI uses Latin digits for counts, money, and codes. User text is rendered as entered, including Devanagari digits.
7. Fixture: S2-T08 renders 50 Devanagari strings (conjuncts, matras, nukta, chandrabindu, ZWJ and ZWNJ cases) as a snapshot in both themes at each type size.
8. Code point counts are shown as code points, and the helper text states that a Devanagari conjunct counts as more than one.

### 3.4 Font licence record

| Face | Expected licence | Status | Verified by | Date | Source URL recorded |
|---|---|---|---|---|---|
| IBM Plex Sans | SIL Open Font License 1.1 | To be verified | [owner] | [date] | [URL of licence file in the downloaded package] |
| IBM Plex Sans Devanagari | SIL Open Font License 1.1 | To be verified | [owner] | [date] | [URL] |
| IBM Plex Mono | SIL Open Font License 1.1 | To be verified | [owner] | [date] | [URL] |

SIL OFL is expected but not yet confirmed. Before the fonts ship, the executing agent downloads the package, reads the licence file inside it, and fills in this table. The licence text is shipped alongside the font files and linked from the site footer. If any face is found to carry different terms, the font is replaced and this section updated.

---

## 4. Spacing

### 4.1 Scale

4 px base unit.

| Token | px | Typical use |
|---|---|---|
| `--space-1` | 4 | Icon to label gap, inline badge padding |
| `--space-2` | 8 | Gap inside a control, tight stacks |
| `--space-3` | 12 | Input padding, list item gap |
| `--space-4` | 16 | Panel padding, form field gap |
| `--space-5` | 24 | Gap between panels, section padding on mobile |
| `--space-6` | 32 | Section padding on tablet, page gutter on desktop |
| `--space-7` | 48 | Between page sections |
| `--space-8` | 64 | Marketing section rhythm |
| `--space-9` | 96 | Marketing hero vertical padding |

No other spacing value appears in the product. Component heights: controls 36 px default, 44 px for touch (minimum target 24 px by 24 px under WCAG 2.2; Yuyin uses 36 px minimum and 44 px on coarse pointers).

### 4.2 Radius

| Token | px | Use |
|---|---|---|
| `--radius-control` | 6 | Buttons, inputs, selects, badges, tabs |
| `--radius-panel` | 10 | Panels, dialogs, code blocks, toasts |

### 4.3 Elevation

One elevation level. A raised surface is `--bg-2` with a 1 px `--line` border (and `--line-strong` if it is interactive). There are no drop shadows, no blur, no backdrop filters. A dialog is distinguished from the page by a flat `--bg-0` scrim at 72 percent opacity and its own `--bg-2` fill and border.

### 4.4 Layout grid

| Breakpoint | Width | Columns | Gutter | Page margin |
|---|---|---|---|---|
| sm | under 640 | 4 | 16 | 16 |
| md | 640 to 1023 | 8 | 24 | 32 |
| lg | 1024 to 1439 | 12 | 24 | 32 |
| xl | 1440 and up | 12 (max content 1200) | 32 | auto |

Console uses a 240 px fixed sidebar at lg and above and a top bar with a disclosure menu below. The page must reflow at 320 px wide with no horizontal scrolling except inside code blocks and tables.

---

## 5. Component inventory

All components are in `components/ui/`. Each has a Storybook story (or an equivalent preview route) and a behaviour unit test. All user-visible strings come from the messages file. The shared states below apply unless a component says otherwise.

Shared state rules:

- **Default:** `--bg-2` fill for inputs, `--line-strong` border.
- **Hover:** fill moves one step up (`--bg-3`); text colour unchanged.
- **Focus:** 2 px `--accent` ring with 2 px offset, plus an `--accent-dim` halo. Never removed, never colour-only on a transparent background (the ring is always present for `:focus-visible`).
- **Active:** pressed state, fill one step up from hover, no transform.
- **Disabled:** `aria-disabled="true"` (not the `disabled` attribute where the control must stay focusable to explain why), text `--text-2`, no hover response, a tooltip or helper text states the reason.
- **Loading:** `aria-busy="true"`, control keeps its width, spinner is replaced by a static three-dot mark under reduced motion.
- **Error:** `--err` border (plus icon and message text linked by `aria-describedby`); colour is never the only signal.

The 20 components: Button, Input, Textarea, Select, VoicePicker, Table, Tabs, Dialog, Toast, Badge, CodeBlock, KeyReveal, BalanceMeter, UsageChart, EmptyState, ErrorState (the 16 in S2-T02), plus PulseLine, Toggle, Banner, and AppNav, which the screens require.

### 5.1 Button

- **Purpose:** trigger an action. Variants: primary (accent fill, one per view), secondary (outline), ghost (text), destructive (`--err` fill, confirmation required).
- **Anatomy:** container, optional leading icon, label, optional trailing icon, optional spinner slot.
- **States:** default (fill or outline), hover (fill one step), focus (ring), active (pressed fill), disabled (`aria-disabled`, reason in tooltip), loading (spinner, label retained, click ignored), error (not applicable; the failure is shown by an adjacent message or Toast).
- **Keyboard:** Tab to focus; Enter and Space activate; Space activates on keyup.
- **Do:** label with a verb and an object ("Create API key", "कुंजी बनाएं").
- **Do not:** use two primary buttons in one view, or use a button that navigates (use a link).

### 5.2 Input

- **Purpose:** single-line text, number, email, or secret entry.
- **Anatomy:** label (always visible), control, optional prefix or suffix, helper text, error text, optional character or code point counter.
- **States:** default, hover, focus (ring), active (typing), disabled, loading (async validation spinner in suffix), error (`--err` border, icon, message, `aria-invalid`).
- **Keyboard:** Tab in and out; Escape clears only when a clear button is focused; Enter submits the enclosing form.
- **Do:** keep the label visible and put format hints in helper text ("Letters, digits, hyphen").
- **Do not:** use the placeholder as the label or as the only instruction.

### 5.3 Textarea

- **Purpose:** multi-line text, primarily the synthesis input. Includes a **code point counter** that counts exactly as the gateway counts (Unicode code points after normalisation to NFC, not UTF-16 units and not graphemes), using the shared counting helper.
- **Anatomy:** label, control with Devanagari-aware line height, counter (mono, tabular), estimated cost line, helper, error text, optional resize handle.
- **States:** default, hover, focus, active, disabled, loading (while the normalised preview is fetched, counter stays live), error (over limit: counter turns `--err` with icon and text "N over the limit", submit disabled with reason).
- **Keyboard:** Tab leaves the field (Tab is not captured); Ctrl or Cmd plus Enter submits when the host form enables it, and the shortcut is shown in helper text.
- **Do:** show the count and estimated cost next to the Play action as the user types.
- **Do not:** truncate pasted text silently; state the limit and let the user choose.

### 5.4 Select

- **Purpose:** choose one option from a short list (language, format, pace preset).
- **Anatomy:** label, trigger showing the current value, listbox popup, option rows, helper, error.
- **States:** default, hover, focus, active (popup open), disabled, loading (options being fetched, trigger shows "Loading"), error.
- **Keyboard:** Enter, Space, or Down opens; Up and Down move; Home and End jump; type-ahead selects by prefix; Escape closes and returns focus to the trigger; Enter selects. Follows the ARIA listbox pattern (`aria-activedescendant`).
- **Do:** show the option's native name and its English name for languages ("हिन्दी, Hindi").
- **Do not:** use a Select for fewer than three options that fit inline (use a segmented Tabs or radio group).

### 5.5 VoicePicker

- **Purpose:** choose a voice and audition it.
- **Anatomy:** filter row (language, style), list of voice rows (name, language tags, short description, sample play button, selection indicator), selected summary. Sample audio is a short prerecorded clip, never autoplayed.
- **States:** default, hover (row fill), focus (row ring), active (selected row has check icon and `aria-selected`), disabled (voice not available to this plan, with reason), loading (sample fetching, play button shows spinner), error (sample failed: inline message and retry).
- **Keyboard:** the list is a listbox; Up and Down move, Enter selects, Space plays or pauses the sample of the focused row, Escape stops playback. Tab moves between filter row, list, and summary.
- **Do:** show the language tags per voice so Hinglish suitability is visible.
- **Do not:** autoplay a sample on focus or hover.

### 5.6 Table

- **Purpose:** tabular records (keys, ledger, audit log, orgs).
- **Anatomy:** caption (visually hidden or visible), header row with sortable headers, body rows, optional row actions column, footer with pagination and row count, optional bulk selection column.
- **States:** default, hover (row `--bg-3`), focus (cell or row ring), active (selected row), disabled (row greyed, text `--text-2` only on `--bg-1`), loading (skeleton rows with static fill under reduced motion), error (ErrorState inside the table region).
- **Keyboard:** Tab reaches the first interactive element; headers that sort are buttons (Enter or Space toggles, `aria-sort` updated); row actions are in the tab order; pagination is a nav landmark. Tables with row-level navigation expose the primary link in the first cell.
- **Do:** right-align numbers in mono with tabular figures; give each column a header.
- **Do not:** use a table for layout, or hide the only copy of an action behind hover.

### 5.7 Tabs

- **Purpose:** switch between peer views in the same context (code language, usage range).
- **Anatomy:** tablist, tabs, tab panel. Active tab has `--bg-3` fill and a 2 px `--accent` underline.
- **States:** default, hover, focus (ring on the tab), active (selected), disabled (`aria-disabled`), loading (panel shows skeleton; tab stays enabled), error (panel shows ErrorState).
- **Keyboard:** the selected tab is the single tab stop; Left and Right move between tabs; Home and End jump; Tab moves into the panel. Automatic activation for cheap panels, manual (Enter or Space) for panels that load data.
- **Do:** keep tab labels to one or two words.
- **Do not:** nest Tabs inside Tabs.

### 5.8 Dialog

- **Purpose:** a focused task or confirmation that blocks the page. Used for destructive confirmations and short forms.
- **Anatomy:** scrim, container (`role="dialog"`, `aria-modal`), title, description, body, footer with actions (primary last), close button.
- **States:** default, hover (on buttons), focus (ring; initial focus on the first field, or on the safest action for destructive dialogs), active, disabled (confirm button until a typed confirmation matches), loading (confirm shows spinner, Escape disabled during a non-cancellable request), error (inline error summary at the top of the body, focus moves to it).
- **Keyboard:** focus is trapped; Escape closes (unless loading); Tab and Shift+Tab cycle; focus returns to the trigger on close. The rest of the page is inert.
- **Do:** name the consequence in the title ("Revoke key sk_live_...a91f?").
- **Do not:** open a dialog on page load or stack dialogs.

### 5.9 Toast

- **Purpose:** short, non-blocking confirmation or notice of something that already happened.
- **Anatomy:** icon, message, optional single action, close button. Rendered in a polite live region.
- **States:** default, hover (timer paused), focus (timer paused, ring on action or close), active, disabled (not applicable), loading (a toast may show "Working" and later be replaced by its result), error (`--err` icon, stays until dismissed).
- **Keyboard:** a hotkey (F8) moves focus to the toast region; Tab reaches action and close; Escape dismisses. Success toasts last at least 6 seconds, pause on hover and focus, and never carry the only copy of important information.
- **Do:** state the outcome and where to find it ("Key created. Copy it now; it is shown once.").
- **Do not:** use a toast for errors that block the task; use an inline message or ErrorState.

### 5.10 Badge

- **Purpose:** compact status or category label (key status, invoice status, role).
- **Anatomy:** icon, text. No interactive behaviour.
- **States:** default (neutral, `--bg-3` fill, `--text-1`), status variants ok, warn, err, info (each with its icon and text), hover, focus, active, disabled, loading, and error are not applicable because a badge is not interactive. If a badge is made a link it becomes a Button or link and follows those rules.
- **Keyboard:** not focusable.
- **Do:** pair colour with an icon and a word ("Active", "Revoked").
- **Do not:** use a badge as a button, or rely on colour alone.

### 5.11 CodeBlock

- **Purpose:** display code or a request and let the user copy it. Tabs for curl, TypeScript, Python.
- **Anatomy:** language Tabs, code region (mono, horizontally scrollable, `tabindex="0"`, labelled), Copy button, optional filename or caption, a notice when a key placeholder is shown.
- **States:** default, hover (Copy button visible), focus (ring on the region and on Copy), active (Copy pressed, label changes to "Copied" for 2 seconds in a polite live region), disabled (Copy disabled when the code is empty), loading (skeleton lines while a snippet is generated), error (copy failed: label "Copy failed, select the text" and the text stays selectable).
- **Keyboard:** Tab reaches the tab list, the code region (scrollable), and Copy; Left and Right switch languages; Enter or Space on Copy copies. The selected language persists per user.
- **Do:** use a placeholder such as `YUYIN_API_KEY` from the environment in every sample.
- **Do not:** show a real key, or syntax-colour with hues beyond `--accent`, `--text-0`, `--text-1`, `--text-2`.

### 5.12 KeyReveal

- **Purpose:** show a newly created secret exactly once.
- **Anatomy:** warning Banner ("Shown once"), key text in mono (selectable), Copy button, "I have stored this key" checkbox, Done button.
- **States:** default (key visible), hover, focus (ring), active, disabled (Done disabled until the checkbox is ticked), loading (key being minted, shows skeleton), error (mint failed: ErrorState with retry; no partial key shown).
- **Keyboard:** focus moves to the key on open; Copy by Enter or Space; Escape does not dismiss until the checkbox is ticked (the dialog states why). On close the key is cleared from memory and cannot be recovered.
- **Do:** show the curl command that uses the key next to it.
- **Do not:** store the key in local storage, log it, or show it again after Done.

### 5.13 BalanceMeter

- **Purpose:** show prepaid credit remaining and how long it lasts at recent usage.
- **Anatomy:** label, balance figure (mono, formatted from integer micro-USD by the single money helper), horizontal bar with a text value, low-balance threshold marker, "Top up" link.
- **States:** default (bar in `--accent`), hover (tooltip with the exact amount), focus (ring on Top up), active, disabled (not applicable), loading (figure replaced by a placeholder, `aria-busy`), error (balance unavailable: "Balance unavailable" with retry; the bar is hidden).
- **Keyboard:** the meter is `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and a text value; only the Top up link is focusable.
- **Do:** state the unit and the currency in text.
- **Do not:** animate the bar when the value changes, or colour it red without a text warning ("Low balance").

### 5.14 UsageChart

- **Purpose:** show usage over time (code points per day, requests, spend).
- **Anatomy:** title, range Tabs, plot (bars or line), axes with labelled units, direct series labels, a data table toggle, a legend only if more than one series.
- **States:** default, hover (value tooltip, also shown on focus), focus (ring on the plot; arrow keys move between data points), active (selected point), disabled (not applicable), loading (placeholder frame), error (ErrorState in plot area).
- **Keyboard:** the plot is one tab stop; Left and Right move across points, Home and End jump; Enter pins the tooltip; the "View as table" toggle exposes the same data as a Table. Each point is announced with date and value.
- **Do:** start the y axis at zero for bars; label units on the axis.
- **Do not:** use gradients, 3D, or colour as the only way to tell series apart.

### 5.15 EmptyState

- **Purpose:** explain a region that has no data yet and give the next step.
- **Anatomy:** short title, one sentence of context, one primary action, optional secondary link to docs. No illustration.
- **States:** default; hover, focus, and active apply to the action only; disabled (action disabled with reason when the role lacks permission); loading (not applicable, use skeleton); error (not applicable, use ErrorState).
- **Keyboard:** the action is the only tab stop.
- **Do:** say what will appear and how to make it appear ("No API keys yet. Create one to send your first request.").
- **Do not:** use clip art, jokes, or a generic "Nothing here".

### 5.16 ErrorState

- **Purpose:** explain a failure to load or complete a region and offer recovery.
- **Anatomy:** error icon, title, cause in plain words, request or trace ID in mono (copyable), primary action (Retry), secondary link (status page or docs).
- **States:** default; hover, focus, and active apply to actions; disabled (Retry disabled with a countdown text while rate limited, with `Retry-After` honoured); loading (Retry shows spinner); error (a second failure updates the text and keeps the trace ID).
- **Keyboard:** focus moves to the title when the state replaces content (`tabindex="-1"`); Retry is the first tab stop. Announced with `role="alert"` only when the failure follows a user action.
- **Do:** show the error code and trace ID so support can find the request.
- **Do not:** show stack traces, or blame the user.

### 5.17 PulseLine

- **Purpose:** the signature element (section 7). Shows request progress and live audio level as one line, with a TTFA readout.
- **Anatomy:** SVG or canvas line, left readout (mono, milliseconds), status text node (visually hidden live region), optional label ("measured in this browser, including network").
- **States:** default (idle: flat line in `--accent`), hover (not applicable), focus (the readout and play controls hold focus, not the line), active (streaming: live waveform), disabled (dimmed flat line in `--text-2` with reason when synthesis unavailable), loading (waiting for first audio: line flat, readout counting up), error (line flat in `--text-2`, readout shows "Failed" and the error code).
- **Keyboard:** the line itself is not focusable; Space toggles play and pause on the host player control; Escape cancels an in-flight request.
- **Do:** pair the line with a text alternative ("Audio playing, 480 ms to first audio" where the figure comes from the live measurement).
- **Do not:** place a second animated element beside it, or use the line as decoration where no audio or request exists.

### 5.18 Toggle

- **Purpose:** switch a binary setting that applies immediately (show normalised text, email alerts).
- **Anatomy:** label, switch track and thumb (`role="switch"`), state text ("On" or "Off"), helper text.
- **States:** default, hover, focus (ring on the track), active (pressed), disabled (with reason), loading (saving: thumb shows spinner, state text "Saving"), error (reverts and shows inline error).
- **Keyboard:** Space toggles; Enter does not (per switch pattern); Tab moves on.
- **Do:** make the label describe the on state ("Show normalised text").
- **Do not:** use a Toggle for a setting that needs a Save button.

### 5.19 Banner

- **Purpose:** persistent, page-level message: incident, low balance, test mode, one-time key warning.
- **Anatomy:** icon, message, optional action link, optional dismiss button (dismiss absent for incidents).
- **States:** default (status variants with icon and text), hover and active on the action, focus (ring), disabled (not applicable), loading (not applicable), error (banner variant err).
- **Keyboard:** the action and dismiss are tab stops; the banner is `role="status"` (or `role="alert"` for incidents appearing after load).
- **Do:** link to the status page for incidents and give the start time in the user's locale.
- **Do not:** stack more than one banner; the highest severity shows and the rest are listed in a count link.

### 5.20 AppNav

- **Purpose:** primary navigation for marketing, console, operator, and docs shells (sidebar or top bar).
- **Anatomy:** product mark, section links, organization switcher (console), theme switch, user menu, skip link ("Skip to main content") as the first focusable element, 2 px page-top PulseLine progress indicator in the console.
- **States:** default, hover (`--bg-3`), focus (ring), active (current page has `aria-current="page"`, `--bg-3` fill and a 2 px `--accent` marker), disabled (links the role cannot use are omitted, not greyed), loading (organization switcher shows a skeleton), error (switcher failed: shows current org name only with a retry link).
- **Keyboard:** Tab through links in visual order; the disclosure menu on small screens opens with Enter or Space and closes with Escape; landmarks are `nav` with distinct labels.
- **Do:** keep the same item order across themes and viewports.
- **Do not:** hide navigation behind hover, or use icon-only items without text labels.

---

## 6. Wireframes

Conventions: wireframes are structural, not pixel-exact. Square brackets `[ ]` are controls, `( )` radio or selected, `{ }` placeholder data from a config or measurement, `....` is body text. The console frame is abbreviated as `NAV` (the AppNav of 5.20) after the first wireframe in each group. Every screen has a loading skeleton, an empty state, and an error state reachable through the mock layer's `?state=empty|loading|error` flag, in both themes. No figure shown here is a real or sample measurement.

Shared console frame (referred to as NAV):

```
+----------+
| Yuyin    |
| [Org  v] |
| Playgrnd |
| API keys |
| Usage    |
| Billing  |
| Lexicon  |
| Voices   |
| Team     |
| Settings |
| [theme]  |
+----------+
```

### 6.1 Marketing (11 screens)

Marketing frame: top bar with product mark, links (Product, Pricing, Benchmarks, Docs), a theme switch, Sign in, and a primary "Get an API key". Footer: product, docs, legal links, status link, licence note for fonts.

**M1. Home (with live demo)**

```
+----------------------------------------------------------------+
| Yuyin     Product Pricing Benchmarks Docs   [theme] Sign in [Get an API key] |
+----------------------------------------------------------------+
| Speech that starts before the sentence ends.                   |
| Streaming text-to-speech for Hindi, Hinglish and English.      |
| [Get an API key]   [Read the quickstart]                       |
|                                                                |
| +------ Demo (limited, no sign-in) ------------------------+  |
| | Voice [Select v]  Language [Select v]                      |  |
| | [ Textarea: sample text ....................... ]  n/200   |  |
| | [Play]   {TTFA} ms  ______/\/\/\/\/\______ (pulse line)    |  |
| | measured in this browser, including network                |  |
| +------------------------------------------------------------+  |
| What it reads: rupee amounts, dates, phones, OTPs, acronyms     |
| [table: written form | spoken form (Hindi) | spoken (English)]  |
| Code: [curl|TypeScript|Python]  ........  [Copy]               |
+----------------------------------------------------------------+
| Footer                                                         |
+----------------------------------------------------------------+
```
Notes: Demo has a fixed voice set and a 200 code point limit; the counter reads the shared helper. States: idle flat line, waiting (readout counting), playing, budget exhausted (inline message "Today's demo budget is used. Create a free account to continue."), rate limited (retry time), error (code and trace ID). No autoplay; sample texts are original and do not resemble real bank messages. No numbers on the page other than the live readout and the limit.

**M2. Pricing**

```
+----------------------------------------------------------------+
| Marketing top bar                                              |
+----------------------------------------------------------------+
| Pricing                                                        |
| Prepaid credit. You pay for what you synthesise.               |
|                                                                |
| +--------------------+ +--------------------+                  |
| | Pay as you go      | | Self-host          |                  |
| | {rate from         | | Licence per node   |                  |
| |  config/pricing}   | | {from config}      |                  |
| | per {unit}         | | [Contact us]       |                  |
| | [Get an API key]   | |                    |                  |
| +--------------------+ +--------------------+                  |
| How characters are counted: code points after NFC (example     |
| table, Hindi and English side by side)                         |
| Top-up amounts: {from config/pricing.toml}                     |
| Refunds: link to Refunds page        FAQ: link                 |
+----------------------------------------------------------------+
```
Notes: Every rate, minimum, and top-up amount is read from `config/pricing.toml` at build time; none is typed in the page. States: config missing shows "Pricing is not published yet." and hides the cards. Currency formatted by the money helper from integer micro-USD.

**M3. Benchmarks**

```
+----------------------------------------------------------------+
| Marketing top bar                                              |
+----------------------------------------------------------------+
| Benchmarks                                                     |
| Hardware: {from results file}   Corpus: {name, link}           |
| Method: [link to method]        Date: {result date}            |
|                                                                |
| Time to first audio   p50 {..}  p95 {..}  p99 {..}             |
| Real-time factor      {..}                                     |
| Capacity per node     {measured, from bench/results}           |
| [View as table]  [Download results file]                       |
+----------------------------------------------------------------+
```
Notes: Rendered at build time from the latest file in `bench/results/`; no hand-typed number (a lint rule checks). States: no result file for the production instance class shows "No benchmark has been published for this instance class." and the method link only. A stale result (older than the configured age) shows a dated notice.

**M4. Custom voice**

```
+----------------------------------------------------------------+
| Marketing top bar                                              |
+----------------------------------------------------------------+
| Custom voice                                                   |
| A voice built from recordings you own or are licensed to use.  |
| Steps: 1 Request   2 Consent and rights review                 |
|        3 Recording guide   4 Build and review   5 Delivery     |
| Requirements: consent form, recording specification (link)     |
| Not accepted: voices of people who have not consented          |
| [Request a custom voice]  (signs in, opens Console form)       |
| Lead time and price: {from config or "quoted per request"}     |
+----------------------------------------------------------------+
```
Notes: Content describes the consent process plainly. States: signed-out users are sent through sign-in and returned to the request form. Lead time is shown only if present in config.

**M5. FAQ**

```
+----------------------------------------------------------------+
| Marketing top bar                                              |
+----------------------------------------------------------------+
| Frequently asked questions          [Search questions        ] |
| Topics: Billing | Languages | Data | Limits | Self-host        |
| > How is a character counted?                                  |
|   answer text ......................................           |
| > Does Yuyin read my text aloud to others?                     |
| > What happens when capacity is full?                          |
| > Can I run it in my own data centre?                          |
| Still stuck?  [Contact support]                                |
+----------------------------------------------------------------+
```
Notes: Accordion built from disclosure buttons (`aria-expanded`). Search filters on the client; empty result says "No matching question" with a link to Contact. Answers contain no latency or capacity numbers.

**M6. About**

```
+----------------------------------------------------------------+
| Marketing top bar                                              |
+----------------------------------------------------------------+
| About Yuyin                                                    |
| What we are building and why.             (prose, 72ch)        |
| Why Hindi, Hinglish, and English together.                     |
| The name: yuyin is the Mandarin word for speech.               |
| Company: Serverless Ventures LLC, {address from config}        |
| [Contact]  [Status]  [Changelog]                               |
+----------------------------------------------------------------+
```
Notes: Text only; no team photos, logos, or customer counts unless supplied by the owner. States: static page with no dynamic states.

**M7. Contact**

```
+----------------------------------------------------------------+
| Marketing top bar                                              |
+----------------------------------------------------------------+
| Contact                                                        |
| +---------------------------+  Sales and self-host: {email}    |
| | Name        [Input     ]  |  Support: {email}                |
| | Email       [Input     ]  |  Security reports: {email}       |
| | Topic       [Select v  ]  |  Response time: {from config}    |
| | Message     [Textarea  ]  |                                  |
| | [Send message]            |                                  |
| +---------------------------+                                  |
+----------------------------------------------------------------+
```
Notes: Validation messages appear inline on blur and in a summary on submit (focus moves to the summary). States: sending (button loading), sent (confirmation text replaces the form, reference ID shown), error (message kept, retry). Bot protection is non-visual and has an accessible fallback.

**M8. Terms**

```
+----------------------------------------------------------------+
| Marketing top bar                                              |
+----------------------------------------------------------------+
| Terms of Service            Effective: {date}  Version {n}     |
| +-----------+  1. Agreement                                    |
| | Contents  |  .....                                           |
| | 1 Agrmt   |  2. Accounts and keys                            |
| | 2 Accts   |  .....                                           |
| | ...       |  (long-form prose, 72ch)                         |
| +-----------+  [Download PDF]  [Previous versions]             |
+----------------------------------------------------------------+
```
Notes: Stub text until counsel supplies the final terms; the page states "Draft, pending legal review" while that is true. Sticky contents list uses anchor links with `aria-current`. Hindi version link appears only when a translation exists.

**M9. Privacy**

```
+----------------------------------------------------------------+
| Marketing top bar                                              |
+----------------------------------------------------------------+
| Privacy Policy              Effective: {date}  Version {n}     |
| What we store: [table: data | purpose | retention {config}]    |
| Text sent for synthesis: {retention statement from config}     |
| Sub-processors: [table: name | purpose | region]               |
| Your rights and how to exercise them   [Contact privacy]       |
+----------------------------------------------------------------+
```
Notes: Retention and sub-processor tables are read from config so the page cannot drift from behaviour. Stub states "Draft, pending legal review" until final. No dynamic states.

**M10. Acceptable use**

```
+----------------------------------------------------------------+
| Marketing top bar                                              |
+----------------------------------------------------------------+
| Acceptable Use Policy       Effective: {date}  Version {n}     |
| Not allowed:  impersonation without consent                    |
|               deceptive or fraudulent calls and messages       |
|               content that harms or harasses                   |
| Required:     disclose synthetic speech where law requires     |
| Enforcement: review, suspension, termination                   |
| Report abuse: [Report form link]   Appeals: {email}            |
+----------------------------------------------------------------+
```
Notes: Plain list format with a short reason beside each rule. Links to the abuse report path. Stub until final legal text.

**M11. Refunds**

```
+----------------------------------------------------------------+
| Marketing top bar                                              |
+----------------------------------------------------------------+
| Refunds                     Effective: {date}  Version {n}     |
| Prepaid credit: when it can be refunded {from policy}          |
| Unused credit: {rule}      Failed requests: credited back      |
| How to ask: [Contact billing]  Processing time: {config}       |
| Worked example table: purchase | used | refundable             |
+----------------------------------------------------------------+
```
Notes: The worked example uses clearly labelled illustrative amounts formatted by the money helper, marked "Example only". Stub until counsel signs off.

### 6.2 Console (10 screens)

Console frame: NAV at left, content at right, 2 px PulseLine progress indicator at the page top during navigation and requests, Banner slot under it.

**C1. Onboarding**

```
+----------+---------------------------------------------------+
| NAV      | Welcome. Three steps to hear your first audio.    |
|          | (1)-----(2)-----(3)           [Skip for now]      |
|          | Step 1 of 3: Create your first key                |
|          |  Name [Input: Default key]  [Create key]          |
|          | Step 2: Send a request                            |
|          |  [curl|TypeScript|Python] ......... [Copy]        |
|          |  (uses the key above, held in the page only)      |
|          | Step 3: Hear it                                   |
|          |  [Voice v] [Play] ____/\/\____ {TTFA} ms          |
|          |                              [Go to playground]   |
+----------+---------------------------------------------------+
```
Notes: Steps are skippable and resumable; progress is a list with `aria-current="step"`. The KeyReveal dialog shows the key once at step 1. States: key creation failed, playback failed (code and trace ID), complete (all steps ticked, link to docs).

**C2. Playground**

```
+----------+---------------------------------------------------+
| NAV      | Playground                                        |
|          | +--------------------+ +------------------------+ |
|          | | Text               | | Voice [VoicePicker]    | |
|          | | [Textarea ....... ]| | Language [Select v]    | |
|          | | n code points      | | Format [Select v]      | |
|          | | est. cost {amount} | | Pace [-----o----] {x}  | |
|          | | [x] Show normalised| |                        | |
|          | |   text             | |                        | |
|          | +--------------------+ +------------------------+ |
|          | [Play]  {TTFA} ms ____/\/\/\____ (pulse line)     |
|          | measured in this browser, including network       |
|          | Normalised: "...." (when toggle on)               |
|          | Copy as [curl|TypeScript|Python] ........ [Copy]  |
+----------+---------------------------------------------------+
```
Notes: Uses a short-lived, organization-scoped token minted by the console; no long-lived key is in the browser. Normalised text comes from the normalise endpoint. States: empty text (Play disabled with reason), over limit, balance zero (Banner with top-up link), streaming, ended, error with code and trace ID. TTFA is labelled as measured in this browser.

**C3. API keys**

```
+----------+---------------------------------------------------+
| NAV      | API keys                       [Create API key]   |
|          | +-----------------------------------------------+ |
|          | | Name    | Prefix     | Created | Last used |    | |
|          | |         |            |         |           |    | |
|          | | {name}  | yuyin_...a91f | {date}| {date}   |[Revoke]| |
|          | +-----------------------------------------------+ |
|          | Showing {n} of {n}            [Prev] [Next]       |
|          | Keys are shown once at creation. Store them in    |
|          | an environment variable.                          |
+----------+---------------------------------------------------+
```
Notes: Only the prefix and the last four characters are displayed after creation. Create opens a Dialog, then KeyReveal. Revoke opens a destructive Dialog. States: empty (EmptyState with Create), no permission (button disabled with reason: role must be owner, admin, or developer), loading, error.

**C4. Usage**

```
+----------+---------------------------------------------------+
| NAV      | Usage                  Range [7d|30d|90d|Custom]  |
|          | +-----------------------------------------------+ |
|          | | UsageChart: code points per day               | |
|          | | [View as table]                               | |
|          | +-----------------------------------------------+ |
|          | Totals: code points {n}   requests {n}  spend {$} |
|          | By key: [Table: key | code points | requests]     |
|          | By voice: [Table: voice | code points]            |
|          | [Export CSV]                                      |
+----------+---------------------------------------------------+
```
Notes: Data comes from the ledger and the usage store; dates in the user's locale and UTC on export. States: no usage yet (EmptyState with link to Quickstart), loading placeholder, error, partial data (Banner: "Today's figures update every few minutes", with the interval from config).

**C5. Billing and top-up**

```
+----------+---------------------------------------------------+
| NAV      | Billing                                           |
|          | +----------------------+ +---------------------+  |
|          | | Balance              | | Top up              |  |
|          | | BalanceMeter {amt}   | | ( ) {amt}  ( ) {amt}|  |
|          | | Low-balance alert    | | ( ) Other [Input]   |  |
|          | |  [Toggle]  at {amt}  | | [Pay with card]     |  |
|          | +----------------------+ +---------------------+  |
|          | Ledger: [Table: date | type | amount | balance]   |
|          | Invoices: [Table: date | amount | [Download]]     |
|          | Billing details [Edit]                            |
+----------+---------------------------------------------------+
```
Notes: Top-up amounts come from config and the payment flow is hosted by the payment provider; the console never sees card numbers. Amounts formatted from integer micro-USD. States: payment pending (Badge "Pending"), payment failed (ErrorState with reason), role lacks billing access (read-only view, top-up disabled with reason), empty ledger.

**C6. Lexicon**

```
+----------+---------------------------------------------------+
| NAV      | Lexicon             [Add entry] [Import CSV]      |
|          | Pronunciation overrides for your organization.    |
|          | +-----------------------------------------------+ |
|          | | Written | Language | Spoken as | Test | Edit |  | |
|          | | {text}  | hi       | {text}    | [>]  | [..] |  | |
|          | +-----------------------------------------------+ |
|          | Try it:  [Input: word]  [Play]  ___/\/\___        |
|          | Entries: {n} of {limit from config}               |
+----------+---------------------------------------------------+
```
Notes: Entries are applied to synthesis for the organization. The "Spoken as" column renders with Devanagari line height when needed. States: empty (EmptyState with an example row), import errors (list by line number), limit reached (Add disabled with reason), loading, error.

**C7. Voices**

```
+----------+---------------------------------------------------+
| NAV      | Voices                                            |
|          | Filter: Language [v]  Style [v]   [Search     ]   |
|          | +-----------------------------------------------+ |
|          | | VoicePicker rows:                             | |
|          | | (o) {name}  hi, en  {description}   [> Play]  | |
|          | |     voice id: {id} [Copy]                     | |
|          | +-----------------------------------------------+ |
|          | Custom voices: [Table: name | status | Badge]     |
|          | [Request a custom voice]                          |
+----------+---------------------------------------------------+
```
Notes: Voice ID is copyable for use in API calls. Samples never autoplay. States: no custom voices (EmptyState with request link), sample failed (inline retry), voice not on the current plan (row disabled with reason).

**C8. Custom voice request**

```
+----------+---------------------------------------------------+
| NAV      | Request a custom voice                            |
|          | Step 1 Details  2 Consent  3 Recordings  4 Review |
|          | Voice name       [Input]                          |
|          | Languages        [x] Hindi [x] English [ ] Hinglish|
|          | Intended use     [Textarea]                       |
|          | Speaker consent  [Upload signed form]  status     |
|          | Recordings       [Upload]  list of files           |
|          | [x] I confirm I have the rights to use these      |
|          | [Back]                              [Submit request]  |
+----------+---------------------------------------------------+
```
Notes: Submit stays disabled until the consent form and the rights confirmation exist, with reason. Uploads show per-file progress as text. States: draft saved, submitted (reference ID and expected review text from config), rejected (reason shown with resubmit action), upload failed per file with retry.

**C9. Team**

```
+----------+---------------------------------------------------+
| NAV      | Team                              [Invite member] |
|          | +-----------------------------------------------+ |
|          | | Member   | Email   | Role v  | Status |        | |
|          | | {name}   | {email} | Owner   | Active |        | |
|          | | {name}   | {email} | [Dev v] | Invited|[Remove]| |
|          | +-----------------------------------------------+ |
|          | Roles: owner, admin, developer, billing           |
|          | [Role descriptions table]                         |
+----------+---------------------------------------------------+
```
Notes: Role changes and removals use a confirmation Dialog; the last owner cannot be removed or demoted (control disabled with reason). Invite Dialog takes an email and role. States: only member (EmptyState prompting an invite), pending invites with resend, insufficient role (read-only).

**C10. Settings**

```
+----------+---------------------------------------------------+
| NAV      | Settings                                          |
|          | Tabs: [Organization] Security  Notifications  Data|
|          | Organization name  [Input]                        |
|          | Default voice      [VoicePicker summary]          |
|          | Default language   [Select v]                     |
|          | Interface language [Select: English | हिन्दी]    |
|          | Theme              (o) Dark ( ) Light ( ) System  |
|          | [Save changes]                                    |
|          | Danger zone: [Delete organization]                |
+----------+---------------------------------------------------+
```
Notes: Interface language is limited to languages that have a complete messages file. Data tab states the retention behaviour from config. Delete requires typed confirmation in a Dialog. States: unsaved changes (warns on leave), saving, saved (Toast), error.

### 6.3 Operator (7 screens)

Operator frame: a distinct top bar labelled "Operator" with a text label (not colour alone), the NAV listing Organizations, Ledger, Abuse, Custom voices, Capacity, Audit. Access is an allowlist; non-listed users see a 404. Every mutating action requires a reason string and writes to the audit log.

**O1. Organizations**

```
+----------+---------------------------------------------------+
| OPERATOR | Organizations                [Search name, id   ] |
|          | Filter: Status [v]  Plan [v]  Flag [v]            |
|          | +-----------------------------------------------+ |
|          | | Name | Org id | Created | Balance | Status |>| |
|          | | {..} | {id}   | {date}  | {amt}   | Badge  |  | |
|          | +-----------------------------------------------+ |
|          | {n} results            [Prev] [Next]              |
+----------+---------------------------------------------------+
```
Notes: Reads through the operator repository with tenant context set explicitly per row. Rows link to the detail screen. States: no match (EmptyState), loading, error with trace ID.

**O2. Organization detail**

```
+----------+---------------------------------------------------+
| OPERATOR | {Org name}   {org id}   Badge {status}            |
|          | Tabs: [Overview] Keys Usage Ledger Flags Notes    |
|          | Owner {email}   Created {date}   Plan {plan}      |
|          | Balance {amt}     [Adjust ledger] [Suspend]       |
|          | Recent usage: UsageChart                          |
|          | Recent events: [Table: time | event | actor]       |
|          | Abuse flags: {n}   Custom voice requests: {n}     |
+----------+---------------------------------------------------+
```
Notes: Suspend and unsuspend need a reason and a confirmation Dialog. Keys show prefix only. States: suspended (Banner at top), not found, loading, error.

**O3. Ledger adjustments**

```
+----------+---------------------------------------------------+
| OPERATOR | Ledger adjustments                                |
|          | Organization [Input id or name]                   |
|          | Type ( ) Credit ( ) Debit ( ) Refund              |
|          | Amount [Input]   Currency {USD}                   |
|          | Reason (required) [Textarea]                      |
|          | Preview: balance {before} -> {after}              |
|          | [Apply adjustment]                                |
|          | Recent adjustments: [Table: time | org | amount |  |
|          |                      reason | operator]           |
+----------+---------------------------------------------------+
```
Notes: Amounts are integer micro-USD underneath. Adjustments are append-only; there is no edit, only a reversing entry. Apply opens a confirmation Dialog repeating the amount and org. States: validation error, would-go-negative warning (Banner), failed (nothing applied, stated), applied (Toast with ledger entry ID).

**O4. Abuse queue**

```
+----------+---------------------------------------------------+
| OPERATOR | Abuse queue    Filter: Status [v] Severity [v]    |
|          | +-----------------------------------------------+ |
|          | | Opened | Org | Source | Severity | Status | > | |
|          | +-----------------------------------------------+ |
|          | Case {id}                                         |
|          | Summary ....  Evidence: [links, redacted text]    |
|          | Timeline: [list]                                  |
|          | Actions: [Warn] [Suspend org] [Dismiss] [Escalate]|
|          | Reason (required) [Textarea]                      |
+----------+---------------------------------------------------+
```
Notes: Evidence text is shown redacted by default with an explicit reveal that is audited. Actions write a reason to the audit log. States: queue empty (EmptyState "No open cases"), case already actioned by another operator (conflict message, reload), loading, error.

**O5. Custom voice queue**

```
+----------+---------------------------------------------------+
| OPERATOR | Custom voice queue   Filter: Stage [v]            |
|          | +-----------------------------------------------+ |
|          | | Request | Org | Stage | Submitted | Owner |  >| |
|          | +-----------------------------------------------+ |
|          | Request {id}                                      |
|          | Consent form: [View] status {verified|pending}    |
|          | Recordings: [list with play] checks {pass|fail}   |
|          | Notes [Textarea]                                  |
|          | [Approve] [Request changes] [Reject]              |
+----------+---------------------------------------------------+
```
Notes: Approval is blocked until consent is marked verified (control disabled with reason). Recording playback never autoplays. States: empty queue, stage changes recorded in audit, asset unavailable (error with retry).

**O6. Fleet capacity**

```
+----------+---------------------------------------------------+
| OPERATOR | Fleet capacity               Updated {time}       |
|          | Nodes: [Table: node | class | state | active |    |
|          |                      sessions | limit]            |
|          | Admission: {open|shedding|closed}  [Change]       |
|          | Queue depth: {n}   Rejections (503): {n}          |
|          | UsageChart: active sessions over time             |
|          | Incident banner: [Create incident] [Resolve]      |
+----------+---------------------------------------------------+
```
Notes: All figures come from live gateway metrics; if metrics are unavailable the region shows "Metrics unavailable" and the time of the last good read, with no estimate. Creating an incident publishes the status banner within the configured interval. Changing admission needs a reason and confirmation.

**O7. Audit log**

```
+----------+---------------------------------------------------+
| OPERATOR | Audit log                                         |
|          | Filters: Actor [v] Action [v] Org [Input]         |
|          |          From [date] To [date]   [Apply] [Export] |
|          | +-----------------------------------------------+ |
|          | | Time (UTC) | Actor | Action | Target | Reason | | |
|          | | {..}       | {..}  | {..}   | {..}   | {..}   | | |
|          | +-----------------------------------------------+ |
|          | {n} entries                [Prev] [Next]          |
+----------+---------------------------------------------------+
```
Notes: Read-only and append-only; rows expand to show the before and after values. Times are stored in UTC and displayed in the operator's locale with a UTC toggle. States: no results, loading, export in progress and ready (Toast), error.

### 6.4 Docs (6 screens)

Docs frame: top bar with product mark, search field (`/` focuses it), version label, theme switch; left sidebar of sections; right "On this page" list at lg and above. Content is MDX.

**D1. Quickstart**

```
+------------------------------------------------------------------+
| Yuyin Docs   [Search docs  /]   v{version}   [theme]  Console     |
+----------+------------------------------------+------------------+
| Sidebar  | Quickstart: key to audio in 3 steps| On this page     |
| Quickstart| 1. Get an API key   [Console link]| 1 Get a key      |
| API ref  | 2. Make a request                  | 2 Request        |
| Guides   |    [curl|TypeScript|Python] [Copy]| 3 Hear it        |
| SDKs     | 3. Play the audio                  |                  |
| Self-host|    ....                            | Next: Streaming  |
| Changelog| [< Previous]            [Next >]   |                  |
+----------+------------------------------------+------------------+
```
Notes: Every code sample is executed in CI against the local stack and uses an environment variable for the key. States: search no result ("No results for {query}"), code tab persisted, page not found with links to sections.

**D2. API reference**

```
+------------------------------------------------------------------+
| Docs top bar                                                     |
+----------+------------------------------------+------------------+
| Endpoints| POST /v1/speech                    | Example          |
| Speech   | Description ....                   | [curl|TS|Python] |
| Stream   | Parameters: [Table: name | type |  | Request          |
| Normalise|             required | description]| Response         |
| Voices   | Request body ....                  | [200|400|402|429]|
| Lexicon  | Responses [Table: code | meaning]  |                  |
| Errors   | Errors: link to Errors guide       |                  |
+----------+------------------------------------+------------------+
```
Notes: Generated from `api/openapi.yaml` at build time; the build fails if the file is invalid. Error codes list the retry rule per code. States: schema section collapsed by default with an expand control, deprecated endpoint Badge with replacement link.

**D3. Guides**

```
+------------------------------------------------------------------+
| Docs top bar                                                     |
+----------+------------------------------------+------------------+
| Guides   | Normalisation: what is read how    | On this page     |
| Streaming| Intro ....                         | Numbers          |
| WebSocket| [Table: written | Hindi reading |  | Dates            |
| Normalise|          English reading]          | Phone numbers    |
| Languages| Try it: [Input] [Play] ___/\/\___  | Acronyms         |
| Voices   | Callout: note .....                |                  |
| Billing  | [< Previous]            [Next >]   | Feedback: [Yes][No]|
+----------+------------------------------------+------------------+
```
Notes: Guides list: streaming over REST, streaming over WebSocket with an LLM, normalisation, languages and code-switching, voices, pace and formats, billing and character counting, errors and retries, rate limits and capacity, security and data handling. Hindi and English examples sit side by side in tables. Inline "Try it" uses the limited demo route.

**D4. SDKs**

```
+------------------------------------------------------------------+
| Docs top bar                                                     |
+----------+------------------------------------+------------------+
| SDKs     | SDKs                               | On this page     |
| TypeScript| Tabs: [TypeScript] [Python]       | Install          |
| Python   | Install  [Copy]                    | Speak            |
|          |  npm install @yuyin-tts/sdk        | Stream           |
|          | Speak / Stream / Errors / Retries  | Errors           |
|          | [Code samples with Copy]           | Retries          |
|          | Reference: [link to generated API] |                  |
+----------+------------------------------------+------------------+
```
Notes: Runtimes listed per SDK as supported in the package metadata. The Python tab is shown with the install command for the published package once published (a placeholder note until then). States: SDK not yet published (Badge "Not yet published" and no install command).

**D5. Self-hosting**

```
+------------------------------------------------------------------+
| Docs top bar                                                     |
+----------+------------------------------------+------------------+
| Self-host| Self-hosting                       | On this page     |
| Overview | Who it is for: audio stays in your | Requirements     |
| Install  | own data centre.                   | Install          |
| Config   | Requirements: [Table: item | value]| Licence key      |
| Licence  | Install steps (numbered, code)     | Configuration    |
| Upgrade  | Licence: how a key is applied      | Upgrade          |
|          | Contact: [Contact sales]           |                  |
+----------+------------------------------------+------------------+
```
Notes: Requirements table values come from measured, documented sizing, not estimates in this document ("[from the capacity guide]"). Stub state until the self-host edition is released: page shows "Self-hosting is not yet available" and a contact link.

**D6. Changelog**

```
+------------------------------------------------------------------+
| Docs top bar                                                     |
+----------+------------------------------------+------------------+
| Changelog| Changelog                [RSS]     | Versions         |
|          | v{x.y.z}   {date}                  | v{x.y.z}         |
|          |  Added:    ....                    | v{x.y.z}         |
|          |  Changed:  ....                    |                  |
|          |  Fixed:    ....                    | Filter: [All|    |
|          | v{x.y.z}   {date}                  |  Added|Fixed]    |
|          |  ....                              |                  |
+----------+------------------------------------+------------------+
```
Notes: Built from `CHANGELOG.md` at build time; dates in the user's locale with the ISO date in a `time` element. Breaking changes carry a Badge with text. States: empty (before the first release: "No releases yet").

Wireframe count: Marketing 11, Console 10, Operator 7, Docs 6, total 34.

---

## 7. Signature element: the pulse line

**What it is.** A single horizontal line in `--accent`. It is flat when idle and becomes a live waveform as audio arrives. At its left end is a small mono readout, in milliseconds, of the time to first audio (TTFA).

**Where it appears.** The playground, the home page demo, and the console's 2 px page-top progress indicator. It is the only animated element in the product.

**Behaviour, state by state.**

| State | Line | Readout |
|---|---|---|
| Idle | Flat, `--accent`, 2 px | `-- ms` |
| Requesting | Flat | Counts up from the moment the request is sent, in whole milliseconds, tabular mono |
| First audio arrived | Begins moving with the audio level | Freezes at the measured value |
| Streaming | Live waveform driven by the decoded audio amplitude | Frozen |
| Ended | Returns to flat over the configured settle time | Frozen until the next request |
| Cancelled | Flat at once | Frozen, with "Cancelled" in the status text |
| Error | Flat in `--text-2` | Shows "Failed" and the error code |

**The TTFA readout.**

- It measures the interval from the client sending the request (or the WebSocket text frame) to the first audio chunk being received by this browser.
- It is labelled "measured in this browser, including network" wherever it appears alongside a number. It is a client measurement, not a server-side figure, and the page never presents it as a service-level claim.
- It uses the browser's high-resolution timer, updates on animation frames, and is formatted by one helper (whole milliseconds, tabular figures).
- It is announced once to assistive technology when it freezes ("Time to first audio {n} milliseconds"), not continuously while counting.
- No example value is hard-coded in copy or in a screenshot used in documentation. Placeholders in design files read `{TTFA}`.

**Reduced-motion behaviour.** When `prefers-reduced-motion: reduce` is set (or the user selects "Reduce motion" in settings, which overrides to reduce), the line is replaced by a static level meter: a short horizontal bar in `--accent` whose length steps to the current audio level at most four times per second, plus a text status ("Receiving audio", "Idle"). The readout does not count up frame by frame; it shows "waiting" until first audio and then shows the final value once. The page-top progress indicator becomes a static 2 px bar with a text "Loading" label for assistive technology.

**Performance and engineering requirements.** Renders at 60 frames per second on a mid-range laptop (acceptance criterion S2-T03); draws on a canvas or SVG path with a fixed point budget; pauses drawing when the tab is hidden; driven by a mock audio stream in Sprint 2 and by the real stream later through the same interface.

**Accessible text alternative.** The line is `aria-hidden`. A sibling element with `role="status"` carries text such as "Idle", "Waiting for audio", "Audio playing", "Finished", "Cancelled", or "Failed, code {code}". It updates on state changes only. The forced-colours variant draws the line in `CanvasText`.

---

## 8. Motion

- The pulse line is the only continuously animated element.
- Permitted transitions: fill and border colour changes of 120 ms linear on hover, focus, and selection; opacity fades of 120 ms on Toast and Dialog entry; a 120 ms height change for disclosure panels.
- No transforms, no slide or bounce, no parallax, no scroll-linked animation, no animated counters, no typewriter text, no autoplaying audio or video.
- Spinners are allowed only inside a loading control and are replaced by a static three-dot mark when reduced motion is set. Skeletons are static fills.
- Under `prefers-reduced-motion: reduce`: all transitions are 0 ms, the pulse line becomes the static meter (section 7), and there are no fades.
- Any animation that lasts longer than 5 seconds has a pause control. Nothing flashes more than three times per second.
- The motion durations are tokens (`--motion-fast: 120ms`); a lint rule rejects duration literals in component code.

---

## 9. Accessibility

Target: WCAG 2.2 level AA on every route, in both themes, at 320 px width and at 200 percent zoom. The Sprint 2 gate is zero serious or critical axe violations on every route, plus the manual checks below.

### 9.1 Standards and checks

| Check | How |
|---|---|
| Automated | axe in Playwright on every route (S2-T08), both themes |
| Contrast | Token-table test (section 2), CI failure below threshold |
| Keyboard | Playwright keyboard-only flows for sign-in, create key, play audio, top up |
| Screen reader | Manual pass with VoiceOver (Safari) and NVDA (Firefox) before each release, recorded in the release checklist |
| Devanagari | Snapshot fixture of 50 strings in both themes (S2-T08) |
| Zoom and reflow | 320 px width and 400 percent zoom, no loss of content or function |
| Forced colours | Manual pass in Windows High Contrast and `forced-colors: active` emulation |

### 9.2 Keyboard

- Every function is operable by keyboard with no timing requirement. No keyboard traps; Dialogs trap focus on purpose and release on close.
- A "Skip to main content" link is the first focusable element on every page.
- Tab order follows reading order. Composite widgets (Tabs, Select, listbox, menus) use one tab stop and arrow keys inside, following the WAI-ARIA Authoring Practices.
- Single-character shortcuts (such as `/` for docs search) are active only when no text field is focused and can be turned off in Settings (WCAG 2.1.4).
- Drag actions have a non-drag alternative (WCAG 2.5.7). Targets are at least 24 by 24 CSS px (WCAG 2.5.8), 36 px by default.

### 9.3 Focus

- Focus is always visible: 2 px `--accent` ring with 2 px offset, contrast at least 3:1 against adjacent colours in both themes (section 2).
- Focus is not obscured by sticky headers or toasts (WCAG 2.4.11): the top bar and toast region reserve scroll margin, and Toasts do not overlay the focused element.
- After a route change, focus moves to the page `h1` (`tabindex="-1"`). After a Dialog closes, focus returns to its trigger. After a destructive deletion, focus moves to the next row or the table heading.

### 9.4 Screen reader

- Landmarks: `header`, `nav` (labelled), `main`, `aside`, `footer`; one `h1` per page, no skipped heading levels.
- Every form control has a programmatic label; errors are linked with `aria-describedby`, and an error summary receives focus on failed submit (WCAG 3.3.1, 3.3.3).
- Redundant entry is avoided (WCAG 3.3.7): values already entered in a flow are prefilled. Authentication does not require a cognitive test (WCAG 3.3.8).
- Live regions: polite for Toasts and counters that finish, assertive only for failures following a user action. The code point counter announces on blur and on crossing the limit, not per keystroke.
- Icons that carry meaning have text; decorative icons are `aria-hidden`. Status uses icon, text, and colour together.
- Tables have captions or `aria-label`; sortable headers expose `aria-sort`; charts expose a data table alternative.
- Language of the page is set on `html`; Hindi passages use `lang="hi"`.

### 9.5 Devanagari line height

Devanagari gets 4 px more line height than Latin at the same size (section 3.2), applied by `:lang(hi)` and by script detection in user-text containers. Inputs and textareas add 4 px vertical padding. Mixed lines use the larger line height for the whole line so rhythm does not jump between runs. Snapshots verify there is no clipping of upper matras, lower matras, or conjuncts at each type size.

### 9.6 Captions and transcripts for audio

- Every audio sample on a marketing or docs page has an adjacent text transcript showing exactly the text that was synthesised, in the script it was written in (Devanagari, Latin, or mixed), with `lang` attributes. Hinglish samples show the text as typed.
- Audio never autoplays. Controls are native or have equivalent keyboard and screen reader behaviour (play, pause, seek, volume, time).
- The playground shows the normalised text on request, which doubles as the transcript of what was spoken.
- Where audio is shown with video, captions are provided; the product site has no required-audio content without a text equivalent (WCAG 1.2.1).
- Audio longer than three seconds that starts from a user action offers stop and pause.

---

## 10. Content voice

Plain, specific, technical. Say what happens and what it costs. Show the request and the response. Hindi and English appear as equals. No exclamation marks, no hype words, no emoji, no em dashes. Every user-visible string is in the messages file so Hindi localisation can be added without code changes. Hindi strings are written for Hindi readers, not translated word for word, and are reviewed by a native speaker before release.

Rules: lead with the verb; name the object; state the cost or consequence before the user acts; give the next step in an error; use "you" for the reader and "we" sparingly; numbers come from the product or config, never from copy.

| Situation | English | Hindi |
|---|---|---|
| Primary action | Create API key | एपीआई कुंजी बनाएं |
| Key shown once | Copy this key now. It is shown only once. | इस कुंजी को अभी कॉपी करें। यह केवल एक बार दिखाई जाती है। |
| Empty keys | No API keys yet. Create one to send your first request. | अभी कोई एपीआई कुंजी नहीं है। पहला अनुरोध भेजने के लिए एक बनाएं। |
| Cost before action | This text is {n} code points. Estimated cost: {amount}. | इस पाठ में {n} कोड पॉइंट हैं। अनुमानित लागत: {amount}। |
| Over limit | The text is {n} code points over the limit. Shorten it or split it. | पाठ सीमा से {n} कोड पॉइंट अधिक है। इसे छोटा करें या बाँट दें। |
| Low balance | Your balance is {amount}. Top up to keep synthesising. | आपकी शेष राशि {amount} है। संश्लेषण जारी रखने के लिए टॉप अप करें। |
| Payment failed | The payment did not go through. Your balance is unchanged. | भुगतान पूरा नहीं हुआ। आपकी शेष राशि में कोई बदलाव नहीं हुआ। |
| Capacity | We are at capacity. Retry in {n} seconds. | अभी क्षमता पूरी है। {n} सेकंड बाद फिर कोशिश करें। |
| Error with trace | Request failed (code {code}). Trace ID: {id}. | अनुरोध विफल हुआ (कोड {code})। ट्रेस आईडी: {id}। |
| TTFA label | Measured in this browser, including network | इस ब्राउज़र में मापा गया, नेटवर्क सहित |
| Demo budget | Today's demo budget is used. Create an account to continue. | आज का डेमो बजट पूरा हो गया है। जारी रखने के लिए खाता बनाएं। |
| Destructive confirm | Revoke this key? Requests using it will fail immediately. | यह कुंजी रद्द करें? इसका उपयोग करने वाले अनुरोध तुरंत विफल होंगे। |
| Empty usage | No usage yet. Send a request to see it here. | अभी कोई उपयोग नहीं है। यहाँ देखने के लिए एक अनुरोध भेजें। |
| Saved | Settings saved. | सेटिंग सहेजी गईं। |

Hinglish is shown as written by the user and never "corrected" in UI copy. Example prompt text in the playground uses original sentences, for example "Aapka order kal subah tak pahunch jayega" beside "आपका ऑर्डर कल सुबह तक पहुँच जाएगा" and "Your order will arrive by tomorrow morning". Sample texts avoid anything resembling a real bank or government message with real-looking numbers.

Terminology: "code point" (not "character") when describing billing; "API key" and "key" consistently; "credit" for prepaid balance; "organization" in the product and "संगठन" in Hindi.

---

## 11. Anti-patterns

Must not appear anywhere in the product, the site, the docs, or marketing material.

- Gradient hero backgrounds, glowing orbs, or abstract "AI" imagery.
- Sound-wave stock illustrations, robot or microphone clip art.
- More than one accent colour on a screen.
- Drop shadows, glassmorphism, or blurred backdrops.
- Performance numbers that did not come from the benchmark harness, and any latency or capacity figure typed by hand.
- Fake testimonials, invented customer logos, or invented usage counters.
- Animated counters, typewriter effects, or autoplaying audio.
- Emoji in UI copy.
- Em dashes, exclamation marks, and hype words in copy.
- Layouts, phrasing, or imagery copied from another company's site.
- Colour as the only carrier of status, error, or selection.
- Placeholder-as-label, hover-only actions, and icon-only navigation.
- Removing or restyling the focus ring below the specified contrast.
- A second animated element anywhere near the pulse line.
- Showing a secret key after its one-time reveal, or any long-lived key in browser code.
- Hex, pixel, or duration literals in component code instead of tokens.
- Truncating or hyphenating Devanagari by character count, or giving Devanagari the Latin line height.
