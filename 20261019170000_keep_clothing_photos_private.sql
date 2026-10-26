/*
# Keep clothing photos private to their owner

Create the bucket if it does not exist and force it to remain private.
Each authenticated user may manage only objects inside their own user_id folder.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('clothing-photos', 'clothing-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users can upload own clothing photos" ON storage.objects;
CREATE POLICY "Users can upload own clothing photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'clothing-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can read own clothing photos" ON storage.objects;
CREATE POLICY "Users can read own clothing photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'clothing-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own clothing photos" ON storage.objects;
CREATE POLICY "Users can update own clothing photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'clothing-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'clothing-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own clothing photos" ON storage.objects;
CREATE POLICY "Users can delete own clothing photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'clothing-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
