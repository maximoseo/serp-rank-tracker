-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keywords table
CREATE TABLE IF NOT EXISTS public.keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  location_code INTEGER NOT NULL DEFAULT 2840,
  language_code TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rankings table
CREATE TABLE IF NOT EXISTS public.rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  rank_absolute INTEGER,
  url TEXT,
  search_volume INTEGER,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_project_id ON public.keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_rankings_keyword_id ON public.rankings(keyword_id);
CREATE INDEX IF NOT EXISTS idx_rankings_checked_at ON public.rankings(checked_at);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for keywords (via project ownership)
CREATE POLICY "Users can view own keywords" ON public.keywords
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE public.projects.id = public.keywords.project_id
      AND public.projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own keywords" ON public.keywords
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE public.projects.id = public.keywords.project_id
      AND public.projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own keywords" ON public.keywords
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE public.projects.id = public.keywords.project_id
      AND public.projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own keywords" ON public.keywords
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE public.projects.id = public.keywords.project_id
      AND public.projects.user_id = auth.uid()
    )
  );

-- RLS policies for rankings (via keyword -> project ownership)
CREATE POLICY "Users can view own rankings" ON public.rankings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.keywords
      JOIN public.projects ON public.projects.id = public.keywords.project_id
      WHERE public.keywords.id = public.rankings.keyword_id
      AND public.projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own rankings" ON public.rankings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.keywords
      JOIN public.projects ON public.projects.id = public.keywords.project_id
      WHERE public.keywords.id = public.rankings.keyword_id
      AND public.projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own rankings" ON public.rankings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.keywords
      JOIN public.projects ON public.projects.id = public.keywords.project_id
      WHERE public.keywords.id = public.rankings.keyword_id
      AND public.projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own rankings" ON public.rankings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.keywords
      JOIN public.projects ON public.projects.id = public.keywords.project_id
      WHERE public.keywords.id = public.rankings.keyword_id
      AND public.projects.user_id = auth.uid()
    )
  );
