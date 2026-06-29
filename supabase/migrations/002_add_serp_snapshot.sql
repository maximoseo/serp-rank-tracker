ALTER TABLE public.rankings ADD COLUMN IF NOT EXISTS serp_snapshot JSONB;

COMMENT ON COLUMN public.rankings.serp_snapshot IS 'Top 10 organic and local_pack SERP results stored as JSON for context when the tracked domain is not ranked.';
