/*
# Create storage bucket for clothing photos

1. Storage
- Create 'clothing-photos' bucket (private, user-scoped)
- Each user stores photos under their user_id path
2. Policies
- Users can upload, read, update, delete only their own photos
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('clothing-photos', 'clothing-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for clothing-photos bucket
DROP POLICY IF EXISTS "Users can upload own clothing photos" ON storage.objects;
CREATE POLICY "Users can upload own clothing photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clothing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own clothing photos" ON storage.objects;
CREATE POLICY "Users can read own clothing photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'clothing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own clothing photos" ON storage.objects;
CREATE POLICY "Users can update own clothing photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'clothing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own clothing photos" ON storage.objects;
CREATE POLICY "Users can delete own clothing photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'clothing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);