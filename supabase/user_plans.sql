-- ── Table user_plans ──────────────────────────────────────────────────────
-- Exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS public.user_plans (
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  plan       text NOT NULL DEFAULT 'gratuit',  -- 'gratuit' | 'livre' | 'forfait'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own plan"
  ON public.user_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage plans"
  ON public.user_plans FOR ALL TO service_role
  USING (true);

-- Trigger : crée un plan gratuit automatiquement à chaque nouvelle inscription
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_plans (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_plan ON auth.users;
CREATE TRIGGER on_auth_user_created_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();

-- Insérer un plan gratuit pour tous les utilisateurs existants (migration)
INSERT INTO public.user_plans (user_id)
SELECT id FROM auth.users
ON CONFLICT DO NOTHING;
