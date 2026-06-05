import type {
  ExitChecklistOption,
  ResignationOption,
} from '../types/separation.type';
import { daysBetween } from './separation-utils';

export type SeparationMetricCard = {
  title: string;
  value: string;
  hint: string;
  accent: 'sky' | 'emerald' | 'amber' | 'rose';
};

export function getSeparationMetricCards(params: {
  resignations: ResignationOption[];
  exitChecklists: ExitChecklistOption[];
}): SeparationMetricCard[] {
  const { resignations, exitChecklists } = params;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const activeResignations = resignations.filter(
    (item) => item.status !== 'RETRACTED',
  ).length;
  const exitsThisMonth = resignations.filter((item) => {
    if (!item.last_working_day) return false;
    const exitDate = new Date(`${item.last_working_day}T00:00:00`);

    return (
      !Number.isNaN(exitDate.getTime()) &&
      exitDate.getFullYear() === currentYear &&
      exitDate.getMonth() === currentMonth
    );
  }).length;
  const remainingNoticeDays = resignations
    .map((item) => daysBetween(now, item.last_working_day))
    .filter(
      (value): value is number => typeof value === 'number' && value >= 0,
    );
  const averageNotice =
    remainingNoticeDays.length > 0
      ? Math.round(
          remainingNoticeDays.reduce((sum, value) => sum + value, 0) /
            remainingNoticeDays.length,
        )
      : 0;
  const completedChecklistCount = exitChecklists.filter((item) =>
    Boolean(item.completed_at),
  ).length;
  const checklistCompletion =
    exitChecklists.length > 0
      ? Math.round((completedChecklistCount / exitChecklists.length) * 100)
      : 0;
  const attritionTrend =
    activeResignations > 0
      ? ((exitsThisMonth / activeResignations) * 100).toFixed(1)
      : '0.0';

  return [
    {
      title: 'Average notice remaining',
      value: `${averageNotice} days`,
      hint: 'Used to prioritize knowledge transfer, backfill recruitment, and team handover.',
      accent: 'sky',
    },
    {
      title: 'Checklist completion',
      value: `${checklistCompletion}%`,
      hint: 'IT, admin, finance, and reporting manager clearances completed.',
      accent: 'emerald',
    },
    {
      title: 'Attrition trend',
      value: `${attritionTrend}%`,
      hint: 'Month exits compared to currently active resignations.',
      accent: 'rose',
    },
  ];
}
