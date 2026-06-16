# Leadgaze UI Design Tokens

## Font Sizes
The font sizes are defined in the following files:

- `apps/web/styles/theme.utilities.css` (contains utility classes)
- `apps/web/styles/theme.css` (base theme)

## Activity Timeline Dots (CSS Variables)

```css
/* Activity Timeline Dots (Sequence/Categorical) */
--color-activity-1: #2B7FFF; /* Blue – e.g., Email Sent */
--color-activity-2: #00C950; /* Green – e.g., Meeting Scheduled */
--color-activity-3: #AD46FF; /* Purple – e.g., System Event */
--color-activity-4: #FF6900; /* Orange – e.g., System Event */
--color-activity-5: #00A63E; /* Dark Green – e.g., System Event */
--color-activity-6: #6A7282; /* Gray – e.g., Task Created */
```

## Global Theme & Text Colors

```css
--color-leadgaze-primary: #3953E7;
--color-leadgaze-dark: #333333;
--color-leadgaze-muted: #8A8A8A;
--color-leadgaze-success: #00A63E;
--color-leadgaze-border: #B0B0B0;
```

## Leadgaze Design System Tokens

### Status Badges (Intent‑Based Pairs)

> Use background and text pairs together (e.g., `bg-status-success-bg` with `text-status-success-text`).

| Intent | Background | Text |
|--------|------------|------|
| **Success** | `#D1FAE5` | `#065F46` |
| **Info / Primary** | `#C2CAF8` | `#3953E7` |
| **Warning** | `#FEF9C2` | `#A65F00` |
| **Pending / Notice** | `#FEF3C7` | `#92400E` |
| **Alert / Attention** | `#FED7AA` | `#9A3412` |
| **Danger / Critical** | `#FFE2E2` | `#C10007` |
| **Neutral** | `#F3F4F6` | `#364153` |

## Component References

- **Custom Input for View** – `packages/ui/src/shadcn/custom-input-for-view.tsx`
- **Custom Card Widget Container** – `packages/ui/src/shadcn/card-widget-container.tsx`
- **Custom Card Widget List** – `packages/ui/src/shadcn/card-widget-list.tsx`
- **List Toolbar** – `packages/ui/src/shadcn/list-toolbar.tsx`
- **Detail Header** – `packages/ui/src/shadcn/detail-header.tsx`
- **Custom Table Container (with pagination)** – `packages/ui/src/shadcn/custom-table-container.tsx`
- **Custom Tab for Metrics** – `packages/ui/src/shadcn/table-status-metric-tab.tsx`


*All paths are relative to the repository root.*