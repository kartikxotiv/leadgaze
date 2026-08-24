export type PlanChangeDirection = 'upgrade' | 'downgrade' | 'same';
export type TrialStartRejection = 'TRIAL_ALREADY_USED' | 'CONFLICT' | null;

export function getTrialStartRejection(input: {
  trialStartDate: string | null;
  subscriptionStatus: string;
}): TrialStartRejection {
  if (input.trialStartDate) return 'TRIAL_ALREADY_USED';
  return input.subscriptionStatus === 'free' ? null : 'CONFLICT';
}

export function getPlanChangeDirection(
  currentDisplayOrder: number,
  targetDisplayOrder: number,
): PlanChangeDirection {
  if (targetDisplayOrder > currentDisplayOrder) return 'upgrade';
  if (targetDisplayOrder < currentDisplayOrder) return 'downgrade';
  return 'same';
}

export function shouldAttemptNotificationDelivery(status: string) {
  return status === 'pending' || status === 'failed';
}
