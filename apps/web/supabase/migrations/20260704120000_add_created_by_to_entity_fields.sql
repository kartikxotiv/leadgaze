/*
 * -------------------------------------------------------
 * Migration: Add created_by column to entity_fields
 * Date: 2026-07-04
 * Description:
 *   Adds created_by column to core.entity_fields table to track
 *   who created a custom column, allowing creator-based edit permissions.
 * -------------------------------------------------------
 */

ALTER TABLE core.entity_fields
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
