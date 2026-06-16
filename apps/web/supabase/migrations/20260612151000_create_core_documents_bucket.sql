-- Migration: Create core_documents storage bucket
-- Date: 2026-06-12
-- Description: Ensures the core_documents storage bucket exists and has correct public policies for uploads.

-- Ensure the core_documents storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('core_documents', 'core_documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the core_documents bucket
DROP POLICY IF EXISTS core_documents_public_policy ON storage.objects;
CREATE POLICY core_documents_public_policy ON storage.objects
  FOR ALL TO anon, authenticated, service_role
  USING (bucket_id = 'core_documents')
  WITH CHECK (bucket_id = 'core_documents');
