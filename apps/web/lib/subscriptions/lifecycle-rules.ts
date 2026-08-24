const DAY_MS = 86_400_000;

export function getTrialReminderDays(trialEnd: Date, now: Date) {
  const days = Math.ceil((trialEnd.getTime() - now.getTime()) / DAY_MS);
  return [7, 3, 1].includes(days) ? days : null;
}

export function getUsageWarningThreshold(
  currentUsage: number,
  limitValue: number | null,
) {
  if (limitValue === null || limitValue <= 0) return null;
  const percentage = (currentUsage / limitValue) * 100;
  if (percentage >= 100) return 100;
  if (percentage >= 80) return 80;
  return null;
}
