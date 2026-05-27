-- Setup Supabase Storage for Resume Files
-- Run this in your Supabase SQL Editor to enable file uploads

-- Create storage bucket for resume files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resume-files',
  'resume-files', 
  true,
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own resume files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resume-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage policy to allow users to view their own files
CREATE POLICY "Users can view their own resume files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resume-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage policy to allow users to delete their own files
CREATE POLICY "Users can delete their own resume files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resume-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Verify bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'resume-files';

-- Success message
SELECT '✅ Resume file storage setup complete!' as status;