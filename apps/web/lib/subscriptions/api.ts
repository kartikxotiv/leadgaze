import { NextResponse } from 'next/server';

import type { z } from 'zod';

import { SubscriptionApiError } from './errors';

export type RouteUser = { id: string; email?: string };

export function requireRouteUser(user?: RouteUser): RouteUser {
  if (!user) {
    throw new SubscriptionApiError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  return user;
}

export function parseInput<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new SubscriptionApiError('Invalid request', 400, 'BAD_REQUEST', {
      issues: result.error.flatten(),
    });
  }
  return result.data;
}

export async function parseJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new SubscriptionApiError('Invalid JSON body', 400, 'BAD_REQUEST');
  }
  return parseInput(schema, body);
}

export function success<T>(data: T, message: string | null = null) {
  return NextResponse.json({
    success: true,
    statusCode: 200,
    message,
    data,
  });
}
