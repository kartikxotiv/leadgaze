'use client';

import { useCallback, useEffect, useState } from 'react';

export function useColumnVisibility(
  key: string,
  initialVisibility: Record<string, boolean>,
) {
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return initialVisibility;
    const saved = localStorage.getItem(`table-columns-${key}`);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with initial visibility to handle new columns added in code
        return { ...initialVisibility, ...parsed };
      } catch (e) {
        console.error('Failed to parse column visibility from localStorage', e);
        return initialVisibility;
      }
    }
    return initialVisibility;
  });

  useEffect(() => {
    localStorage.setItem(`table-columns-${key}`, JSON.stringify(visibility));
  }, [key, visibility]);

  const toggleVisibility = useCallback((columnId: string) => {
    setVisibility((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  }, []);

  const isVisible = useCallback(
    (columnId: string) => {
      return visibility[columnId] !== false; // Default to true if not specified
    },
    [visibility],
  );

  const reset = useCallback(() => {
    setVisibility(initialVisibility);
  }, [initialVisibility]);

  return { visibility, toggleVisibility, isVisible, reset };
}
