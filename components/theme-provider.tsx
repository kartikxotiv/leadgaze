"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="crm-theme"
      disableTransitionOnChange
      suppressColorSchemeWarn={true}
    >
      {children}
    </NextThemesProvider>
  );
}
