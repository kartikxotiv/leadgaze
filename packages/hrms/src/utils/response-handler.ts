import { type NextRequest, NextResponse } from 'next/server';

export interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

export type RouteHandler<TBody = unknown, TUser = unknown> = (params: {
  request: NextRequest;
  body?: TBody;
  params?: Record<string, string>;
  user?: TUser;
}) => Promise<NextResponse | Response>;

export function catchAsync<TBody = unknown, TUser = unknown>(
  handler: RouteHandler<TBody, TUser>,
): RouteHandler<TBody, TUser> {
  return async (params) => {
    try {
      return await handler(params);
    } catch (error) {
      const normalizedError = error as ErrorWithStatus;
      const statusCode =
        error instanceof ApiError
          ? error.statusCode
          : (normalizedError.statusCode ?? normalizedError.status ?? 500);
      const message =
        error instanceof Error ? error.message : 'Internal Server Error';

      return NextResponse.json(
        {
          success: false,
          statusCode,
          message,
          data: null,
        },
        { status: statusCode },
      );
    }
  };
}

export function successDataResponse<T>(
  dataOrMessage: Record<string, unknown> | string,
  data: T | null = null,
) {
  const response: {
    success: true;
    statusCode: 200;
    message: string | null;
    data: T | Record<string, unknown> | null;
  } = {
    success: true,
    statusCode: 200,
    message: null,
    data: null,
  };

  if (typeof dataOrMessage === 'string') {
    response.message = dataOrMessage;
  } else {
    response.data = dataOrMessage;
  }

  if (data !== null) {
    response.data = data;
  }

  return NextResponse.json(response, { status: 200 });
}
