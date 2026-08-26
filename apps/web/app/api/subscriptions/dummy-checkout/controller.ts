import { NextResponse } from 'next/server';

import { catchAsync } from '../../../../utils/response-handler';

/** Deprecated: paid access must be confirmed through backend billing. */
export const dummyCheckout = catchAsync(async () => {
  return NextResponse.json(
    {
      success: false,
      message:
        'Dummy checkout is disabled. Use /api/subscriptions/checkout to create a backend invoice.',
    },
    { status: 410 },
  );
});
