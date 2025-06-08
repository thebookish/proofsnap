CREATE TABLE IF NOT EXISTS public.screenshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename text NOT NULL,
    original_filename text NOT NULL,
    file_size bigint NOT NULL,
    file_type text NOT NULL,
    file_url text NOT NULL,
    sha256_hash text NOT NULL,
    ip_address text,
    browser_info text,
    project text,
    tags text[],
    verification_status text DEFAULT 'verified',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own screenshots" ON public.screenshots;
CREATE POLICY "Users can view own screenshots"
ON public.screenshots FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own screenshots" ON public.screenshots;
CREATE POLICY "Users can insert own screenshots"
ON public.screenshots FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own screenshots" ON public.screenshots;
CREATE POLICY "Users can update own screenshots"
ON public.screenshots FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own screenshots" ON public.screenshots;
CREATE POLICY "Users can delete own screenshots"
ON public.screenshots FOR DELETE
USING (auth.uid() = user_id);

alter publication supabase_realtime add table screenshots;

CREATE TABLE IF NOT EXISTS public.shareable_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    screenshot_id uuid NOT NULL REFERENCES public.screenshots(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    share_token text UNIQUE NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.shareable_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shareable links" ON public.shareable_links;
CREATE POLICY "Users can view own shareable links"
ON public.shareable_links FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own shareable links" ON public.shareable_links;
CREATE POLICY "Users can insert own shareable links"
ON public.shareable_links FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view valid shareable links" ON public.shareable_links;
CREATE POLICY "Public can view valid shareable links"
ON public.shareable_links FOR SELECT
USING (expires_at IS NULL OR expires_at > now());

alter publication supabase_realtime add table shareable_links;