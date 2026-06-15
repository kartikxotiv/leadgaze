/*
  Migration: Add activities column to time_entries
  Date: 2026-06-15
  This adds a nullable TEXT column to store free-form activity descriptions
  linked to a time entry. Existing rows default to NULL.
*/
ALTER TABLE service_cloud.time_entries
  ADD COLUMN activities TEXT;
