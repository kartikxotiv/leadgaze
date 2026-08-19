import { ApiError } from '~/utils/response-handler';

import type { ApiErrorResponse } from './contracts';

export type SubscriptionErrorCode = ApiErrorResponse['code'];

export class SubscriptionApiError extends ApiError {
  readonly code: SubscriptionErrorCode;
  readonly data: Record<string, unknown> | null;

  constructor(
    message: string,
    statusCode: number,
    code: SubscriptionErrorCode,
    data: Record<string, unknown> | null = null,
  ) {
    super(message, statusCode);
    this.name = 'SubscriptionApiError';
    this.code = code;
    this.data = data;
  }
}

export function assertDatabaseResult(
  error: { message: string } | null,
  context: string,
) {
  if (error) {
    throw new SubscriptionApiError(
      `${context}: ${error.message}`,
      500,
      'INTERNAL_ERROR',
    );
  }
}
