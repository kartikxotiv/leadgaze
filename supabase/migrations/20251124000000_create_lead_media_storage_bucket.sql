
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'lead-media'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'lead-media',
      'lead-media',
      ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ]
    );
    
    RAISE NOTICE 'Successfully created storage bucket: lead-media';
  ELSE
    RAISE NOTICE 'Storage bucket lead-media already exists. Skipping creation.';
  END IF;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to upload lead media" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to read lead media" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to delete lead media" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to lead media" ON storage.objects;
  
  CREATE POLICY "Allow authenticated users to upload lead media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'lead-media' AND
    (storage.foldername(name))[1] = 'lead-media'
  );

  CREATE POLICY "Allow authenticated users to read lead media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lead-media');

  CREATE POLICY "Allow authenticated users to delete lead media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'lead-media');

  CREATE POLICY "Allow public read access to lead media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'lead-media');
END $$;

