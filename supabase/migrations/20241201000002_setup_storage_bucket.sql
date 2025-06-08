-- Create the screenshots storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Set up storage policies for the screenshots bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'screenshots');

DROP POLICY IF EXISTS "Users can upload screenshots" ON storage.objects;
CREATE POLICY "Users can upload screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own screenshots" ON storage.objects;
CREATE POLICY "Users can update own screenshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own screenshots" ON storage.objects;
CREATE POLICY "Users can delete own screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
