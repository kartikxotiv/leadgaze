/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
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

export const catchAsync = (handler: RouteHandler): RouteHandler => {
  return async (params) => {
    try {
      return await handler(params);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      const statusCode = err instanceof ApiError ? err.statusCode : 500;

      console.error('ServiceCloudError:', err);

      return NextResponse.json(
        { success: false, message, statusCode, data: null },
        { status: statusCode },
      );
    }
  };
};

export const successDataResponse = <T>(message: string, data: T) =>
  NextResponse.json({ success: true, statusCode: 200, message, data });
