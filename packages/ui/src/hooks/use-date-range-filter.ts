import { useState, useMemo } from 'react';
import { DateRangeValue } from '../shadcn/list-toolbar';

export function useDateRangeFilter() {
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);

  const computedDates = useMemo(() => {
    if (!dateRange) return null;

    if (dateRange.preset === 'custom') {
      return {
        from: dateRange.from,
        to: dateRange.to,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatISODate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const getDates = () => {
      switch (dateRange.preset) {
        case 'today': {
          const from = formatISODate(today);
          return { from, to: from };
        }
        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const from = formatISODate(yesterday);
          return { from, to: from };
        }
        case 'last_7_days': {
          const last7 = new Date(today);
          last7.setDate(today.getDate() - 6); // 6 days before + today = 7 days
          return { from: formatISODate(last7), to: formatISODate(today) };
        }
        case 'this_month': {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          return { from: formatISODate(firstDay), to: formatISODate(lastDay) };
        }
        case 'this_year': {
          const firstDay = new Date(today.getFullYear(), 0, 1);
          const lastDay = new Date(today.getFullYear(), 11, 31);
          return { from: formatISODate(firstDay), to: formatISODate(lastDay) };
        }
        default:
          return null;
      }
    };

    return getDates();
  }, [dateRange]);

  const clearDateRange = () => setDateRange(null);

  return {
    dateRange,
    setDateRange,
    computedDates,
    clearDateRange,
  };
}
