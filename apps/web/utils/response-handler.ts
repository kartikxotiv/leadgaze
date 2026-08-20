/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

export interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  data?: unknown;
}

/**
 * Custom API Error class with status code support
 */
export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

export type RouteHandler = (params: {
  request: NextRequest;
  body?: unknown;
  params?: Record<string, string>;
  user?: any;
}) => Promise<NextResponse | Response>;

const catchAsync = (handler: RouteHandler): RouteHandler => {
  return async (params) => {
    try {
      return await handler(params);
    } catch (err) {
      // Safely handle the error
      const errorMessage =
        err instanceof Error ? err.message : 'Internal Server Error';

      // Check for custom status code
      let statusCode = 500;
      if (err instanceof ApiError) {
        statusCode = err.statusCode;
      } else if (err instanceof Error && 'statusCode' in err) {
        statusCode = (err as ErrorWithStatus).statusCode ?? 500;
      }

      if (
        err instanceof Error &&
        err.name === 'EntitlementError' &&
        'code' in err
      ) {
        console.warn(
          '[EntitlementEnforcement] blocked',
          JSON.stringify({
            code: (err as ErrorWithStatus).code,
            statusCode,
            data: (err as ErrorWithStatus).data ?? null,
          }),
        );
      }

      // Ensure safe error handling
      console.error('CaughtError:', err instanceof Error ? err.message : err);
      console.error(
        'ErrorStack:',
        err instanceof Error ? err.stack : 'No stack available',
      );

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          statusCode,
          ...((err as ErrorWithStatus)?.code
            ? { code: (err as ErrorWithStatus).code }
            : {}),
          data: (err as ErrorWithStatus)?.data ?? null,
        },
        { status: statusCode },
      );
    }
  };
};

const successDataResponse = <T>(
  dataOrMessage: Record<string, any> | string,
  data: T | null = null,
): NextResponse | Response => {
  const response = {
    success: true,
    statusCode: 200,
    message: null as string | null,
    data: null as any,
  };

  if (typeof dataOrMessage === 'string') {
    response.message = dataOrMessage;
  } else {
    if (dataOrMessage?.message) {
      response.message = dataOrMessage.message;
      delete dataOrMessage.message;
    }
    response.data = dataOrMessage;
  }

  if (data) response.data = data;

  return NextResponse.json(response, { status: 200 });
};

const successListDataResponse = (
  listData: any,
  {
    object,
    has_more = false,
    total = null,
    page = 1,
    count = null,
    limit = null,
    offset = null,
  }: any,
) => {
  const response: any = {
    success: true,
    object,
    has_more,
    page,
    data: listData,
  };

  if (total !== null) response.total = total;
  if (count !== null) response.count = count;
  if (limit !== null) response.limit = limit;
  if (offset !== null) response.offset = offset;

  return NextResponse.json(response, { status: 200 });
};

const errorResponse = (
  message: string,
  statusCode: number = 500,
  data: any = null,
): NextResponse => {
  return NextResponse.json(
    {
      success: false,
      message,
      statusCode,
      data,
    },
    { status: statusCode },
  );
};

export {
  successDataResponse,
  successListDataResponse,
  errorResponse,
  catchAsync,
};
