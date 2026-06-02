import { NextResponse, type NextRequest } from 'next/server';

export interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

export type RouteHandler<TBody = unknown, TUser = unknown> = (params: {
  request: NextRequest;
  body?: TBody;
  params?: Record<string, string>;
  user?: TUser;
}) => Promise<NextResponse | Response>;

export type NormalizedClientError = {
  status: false;
  success: false;
  statusCode: number;
  message: string;
};

const asyncHandler = <TBody = unknown, TUser = unknown>(
  handler: RouteHandler<TBody, TUser>,
): RouteHandler<TBody, TUser> => {
  return async (params) => {
    try {
      return await handler(params);
    } catch (error) {
      const normalizedError = error as ErrorWithStatus;
      const statusCode = normalizedError.statusCode ?? normalizedError.status ?? 500;
      const message = normalizedError.message || 'Internal Server Error';

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
};

export function asyncHandlerClient<TArgs extends unknown[], TResult>(
  asyncFunction: (...args: TArgs) => Promise<TResult>,
) {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      const clientError = error as {
        response?: { data?: { message?: string } };
        message?: string;
        statusCode?: number;
      };

      throw {
        status: false,
        success: false,
        statusCode: clientError.statusCode ?? 500,
        message:
          clientError.response?.data?.message ||
          clientError.message ||
          'An unknown error occurred',
      } satisfies NormalizedClientError;
    }
  };
}

export default asyncHandler;
