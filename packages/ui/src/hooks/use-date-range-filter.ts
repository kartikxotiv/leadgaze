import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DateRangeValue } from '../shadcn/list-toolbar';

export function useDateRangeFilter(paramPrefix: string = 'timeframe') {
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && searchParams) {
      const preset = searchParams.get(`${paramPrefix}Preset`) as DateRangeValue['preset'];
      if (preset) {
        setDateRange({
          preset,
          from: searchParams.get(`${paramPrefix}From`) || null,
          to: searchParams.get(`${paramPrefix}To`) || null,
        });
      }
      setInitialized(true);
    }
  }, [searchParams, initialized, paramPrefix]);

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

    const getStartOfDayUTC = (date: Date) => {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      return start.toISOString();
    };

    const getEndOfDayUTC = (date: Date) => {
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    };

    const getDates = () => {
      switch (dateRange.preset) {
        case 'today': {
          return { from: getStartOfDayUTC(today), to: getEndOfDayUTC(today) };
        }
        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          return { from: getStartOfDayUTC(yesterday), to: getEndOfDayUTC(yesterday) };
        }
        case 'last_7_days': {
          const last7 = new Date(today);
          last7.setDate(today.getDate() - 6); // 6 days before + today = 7 days
          return { from: getStartOfDayUTC(last7), to: getEndOfDayUTC(today) };
        }
        case 'this_week': {
          const dayOfWeek = today.getDay(); // 0 = Sunday
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          const monday = new Date(today);
          monday.setDate(today.getDate() + daysToMonday);
          return { from: getStartOfDayUTC(monday), to: getEndOfDayUTC(today) };
        }
        case 'this_month': {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          return { from: getStartOfDayUTC(firstDay), to: getEndOfDayUTC(lastDay) };
        }
        case 'this_quarter': {
          const currentMonth = today.getMonth(); // 0-11
          const currentQuarter = Math.floor(currentMonth / 3);
          const firstMonthOfQuarter = currentQuarter * 3;
          const firstDay = new Date(today.getFullYear(), firstMonthOfQuarter, 1);
          const lastMonthOfQuarter = firstMonthOfQuarter + 2;
          const lastDay = new Date(today.getFullYear(), lastMonthOfQuarter + 1, 0);
          return { from: getStartOfDayUTC(firstDay), to: getEndOfDayUTC(lastDay) };
        }
        case 'last_quarter': {
          const currentMonth = today.getMonth(); // 0-11
          const currentQuarter = Math.floor(currentMonth / 3);
          const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
          const lastYear = currentQuarter === 0 ? today.getFullYear() - 1 : today.getFullYear();
          const firstMonthOfQuarter = lastQuarter * 3;
          const firstDay = new Date(lastYear, firstMonthOfQuarter, 1);
          const lastMonthOfQuarter = firstMonthOfQuarter + 2;
          const lastDay = new Date(lastYear, lastMonthOfQuarter + 1, 0);
          return { from: getStartOfDayUTC(firstDay), to: getEndOfDayUTC(lastDay) };
        }
        case 'last_month': {
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
          return { from: getStartOfDayUTC(lastMonth), to: getEndOfDayUTC(lastDay) };
        }
        case 'last_six_months': {
          const firstDay = new Date(today.getFullYear(), today.getMonth() - 5, 1);
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          return { from: getStartOfDayUTC(firstDay), to: getEndOfDayUTC(lastDay) };
        }
        case 'this_year': {
          const firstDay = new Date(today.getFullYear(), 0, 1);
          const lastDay = new Date(today.getFullYear(), 11, 31);
          return { from: getStartOfDayUTC(firstDay), to: getEndOfDayUTC(lastDay) };
        }
        case 'last_year': {
          const lastYear = today.getFullYear() - 1;
          const firstDay = new Date(lastYear, 0, 1);
          const lastDay = new Date(lastYear, 11, 31);
          return { from: getStartOfDayUTC(firstDay), to: getEndOfDayUTC(lastDay) };
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
