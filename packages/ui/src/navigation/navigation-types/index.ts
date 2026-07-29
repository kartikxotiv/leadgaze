import type { ReactNode } from 'react';

export interface NavigationItem {
  label: string;
  path: string;
  end?: boolean;
  Icon?: ReactNode;
  children?: NavigationItem[];
  divider?: boolean;
}

export interface NavigationConfig {
  routes: NavigationItem[];
  sidebarCollapsed?: boolean;
}
