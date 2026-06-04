/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

export interface ErrorWithStatus extends Error {
  status?: number;
}

type RouteHandler = (params: {
  request: NextRequest;
  body?: unknown;
  params?: Record<string, string>;
}) => Promise<NextResponse | Response>;

const asyncHandler = (handler: RouteHandler): RouteHandler => {
  return async (params) => {
    try {
      return await handler(params);
    } catch (error) {
      const status = (error as ErrorWithStatus).status ?? 500;
      const message =
        (error as ErrorWithStatus).message || 'Internal Server Error';
      return NextResponse.json(
        {
          error: message.toLowerCase(),
          message: 'FAIL',
          status: status,
        },
        { status: status },
      );
    }
  };
};

export const asyncHandlerClient = (asyncFunction: any) => {
  return async (...args: any) => {
    try {
      const response = await asyncFunction(...args);
      return response;
    } catch (err: any) {
      const errMessage =
        err?.response?.data?.message ||
        err.message ||
        'An unknown error occurred';
      const responseStatusCode = err.statusCode || 500;

      throw {
        statusCode: responseStatusCode,
        status: false,
        success: false,
        message: errMessage,
      };
    }
  };
};

export default asyncHandler;
