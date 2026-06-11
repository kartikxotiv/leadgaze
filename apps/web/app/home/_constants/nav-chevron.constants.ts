/**
 * nav-chevron.constants.ts
 *
 * Centralised configuration that controls which top-navigation menu items
 * display a ChevronDown icon and trigger a dropdown panel.
 *
 * ─── How it works ────────────────────────────────────────────────────────────
 * Each module has its own set of "chevron-enabled" labels. A nav item renders
 * the chevron (and its dropdown behaviour) **only** when its formatted label
 * appears in the corresponding module's list below.
 *
 * ─── How to extend ───────────────────────────────────────────────────────────
 * 1. Add the label string to the relevant module array.
 * 2. For a brand-new module, add a new key to NAV_CHEVRON_CONFIG and
 *    a new label union type, then wire it up in home-menu-navigation.tsx.
 *    • `dropdownLabels`    → full data-fetch dropdown (NavDropdown component).
 *    • `chevronOnlyLabels` → chevron icon only, custom onClick logic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ---------------------------------------------------------------------------
// Sales module
// ---------------------------------------------------------------------------

/**
 * Labels in the Sales module that should display a chevron AND open a
 * data-fetch dropdown panel (NavDropdown component).
 */
export const SALES_DROPDOWN_LABELS = [
  'Leads',
  'Contacts',
  'Accounts',
  'Opportunities',
] as const;

export type SalesDropdownLabel = (typeof SALES_DROPDOWN_LABELS)[number];

// ---------------------------------------------------------------------------
// HRMS module
// ---------------------------------------------------------------------------

/**
 * Labels in the HRMS module that should display a chevron.
 * Extend this list when HRMS gains dropdown-enabled nav items.
 */
export const HRMS_CHEVRON_LABELS: string[] = [
  // e.g. 'Employees', 'Payroll'
];

// ---------------------------------------------------------------------------
// Services (Service Cloud) module
// ---------------------------------------------------------------------------

/**
 * Labels in the Service Cloud module that should display a chevron AND open
 * a data-fetch dropdown panel (NavDropdown component).
 * Mirrors the same pattern as SALES_DROPDOWN_LABELS.
 */
export const SERVICES_DROPDOWN_LABELS = [
  'Tickets',
  // Add more Service Cloud dropdown labels here, e.g. 'Cases'
] as const;

export type ServicesDropdownLabel = (typeof SERVICES_DROPDOWN_LABELS)[number];

/**
 * Labels in the Service Cloud module that should display a chevron-only icon
 * (no built-in data-fetch panel). Use for items with custom onClick logic.
 */
export const SERVICES_CHEVRON_LABELS: string[] = [
  // e.g. 'Queues' — items that need a chevron but custom behaviour
];

// ---------------------------------------------------------------------------
// Aggregated config — consumed by the navigation component
// ---------------------------------------------------------------------------

/**
 * Master config keyed by module identifier (matches the `module_key` values
 * used in the backend subscription response and LAUNCHER_MODULE_META).
 *
 * `dropdownLabels`    – items that render as full NavDropdown with data fetch.
 * `chevronOnlyLabels` – items that show a chevron icon but use custom onClick
 *                       logic rather than the shared NavDropdown component.
 */
export const NAV_CHEVRON_CONFIG = {
  sales: {
    dropdownLabels: SALES_DROPDOWN_LABELS as readonly string[],
    chevronOnlyLabels: [] as string[],
  },
  hrms: {
    dropdownLabels: [] as string[],
    chevronOnlyLabels: HRMS_CHEVRON_LABELS,
  },
  services: {
    // Tickets now renders a full data-fetch dropdown, same pattern as Sales.
    dropdownLabels: SERVICES_DROPDOWN_LABELS as readonly string[],
    chevronOnlyLabels: SERVICES_CHEVRON_LABELS,
  },
  inventory: {
    dropdownLabels: [] as string[],
    chevronOnlyLabels: [] as string[],
  },
  funds: {
    dropdownLabels: [] as string[],
    chevronOnlyLabels: [] as string[],
  },
} as const satisfies Record<
  string,
  { dropdownLabels: readonly string[]; chevronOnlyLabels: readonly string[] }
>;

export type NavChevronModuleKey = keyof typeof NAV_CHEVRON_CONFIG;

/**
 * Union of all label types that render a full data-fetch dropdown across
 * any module. Used to type the `formattedLabel` prop on NavDropdown.
 */
export type AnyDropdownLabel = SalesDropdownLabel | ServicesDropdownLabel;

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Returns true when the given label should render as a full NavDropdown
 * (chevron + data-fetch panel) for the specified module.
 */
export function isDropdownLabel(
  moduleKey: NavChevronModuleKey,
  label: string,
): boolean {
  const normalised = label.trim().toLowerCase();
  return (NAV_CHEVRON_CONFIG[moduleKey].dropdownLabels as readonly string[]).some(
    (l) => l.toLowerCase() === normalised,
  );
}

/**
 * Returns true when the given label should show a chevron-only icon
 * (no built-in data-fetch panel) for the specified module.
 */
export function isChevronOnlyLabel(
  moduleKey: NavChevronModuleKey,
  label: string,
): boolean {
  const normalised = label.trim().toLowerCase();
  return (NAV_CHEVRON_CONFIG[moduleKey].chevronOnlyLabels as readonly string[]).some(
    (l) => l.toLowerCase() === normalised,
  );
}

/**
 * Returns true when the given label should display ANY chevron (dropdown or
 * chevron-only) for the specified module.
 */
export function hasChevronForModule(
  moduleKey: NavChevronModuleKey,
  label: string,
): boolean {
  return isDropdownLabel(moduleKey, label) || isChevronOnlyLabel(moduleKey, label);
}
