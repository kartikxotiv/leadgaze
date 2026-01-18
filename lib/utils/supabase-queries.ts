/**
 * Supabase Query Utilities
 * Helper functions for common query patterns
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Build pagination query with count
 */
export async function paginateQuery<T>(
  query: PostgrestFilterBuilder<any, T, any>,
  options: PaginationOptions
): Promise<PaginationResult<T>> {
  const { page, limit } = options;
  const offset = (page - 1) * limit;

  // Get total count
  const { count, error: countError } = await query.select('*', { count: 'exact', head: true });
  if (countError) throw countError;

  // Get paginated data
  const { data, error } = await query
    .select('*')
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    count: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Build ILIKE search query for multiple fields (OR condition)
 */
export function buildSearchQuery(
  query: any,
  search: string,
  fields: string[]
): any {
  if (!search || !fields.length) return query;

  // Build OR conditions: field1.ilike.%search% OR field2.ilike.%search%
  const orConditions = fields.map((field) => `${field}.ilike.%${search}%`).join(',');
  return query.or(orConditions);
}

/**
 * Build filter object for Supabase match() or eq()
 */
export function buildWhereFilters(
  query: any,
  filters: Record<string, any>
): any {
  let result = query;

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // For IN queries
      result = result.in(key, value);
    } else if (typeof value === 'object' && value.operator) {
      // For operators like { operator: 'gte', value: date }
      switch (value.operator) {
        case 'gte':
          result = result.gte(key, value.value);
          break;
        case 'lte':
          result = result.lte(key, value.value);
          break;
        case 'gt':
          result = result.gt(key, value.value);
          break;
        case 'lt':
          result = result.lt(key, value.value);
          break;
        case 'ne':
          result = result.neq(key, value.value);
          break;
        default:
          result = result.eq(key, value.value);
      }
    } else {
      // Simple equality
      result = result.eq(key, value);
    }
  }

  return result;
}

/**
 * Check if JSONB field contains a value
 * For Supabase, we use cs (contains) operator
 */
export function jsonbContains(
  query: any,
  field: string,
  path: string,
  value: any
): any {
  // For JSONB queries in Supabase, we need to use PostgREST JSON operators
  // This is a simplified version - may need adjustment based on exact requirements
  return query.contains(field, { [path]: value });
}

/**
 * Build date range filter
 */
export function buildDateRange(
  query: any,
  field: string,
  dateFrom?: string,
  dateTo?: string
): any {
  if (dateFrom) {
    query = query.gte(field, dateFrom);
  }
  if (dateTo) {
    query = query.lte(field, dateTo);
  }
  return query;
}

/**
 * Build order by clause
 */
export function buildOrderBy(
  query: any,
  orderBy: string,
  ascending: boolean = true
): any {
  return query.order(orderBy, { ascending });
}

/**
 * Helper to safely parse JSONB fields
 */
export function parseJsonb<T = any>(value: any): T | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

/**
 * Helper to safely stringify JSONB fields
 */
export function stringifyJsonb(value: any): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

/**
 * Transform camelCase object to snake_case for database
 */
export function toSnakeCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Transform snake_case object to camelCase for API responses
 */
export function toCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

