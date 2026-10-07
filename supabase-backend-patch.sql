-- ══════════════════════════════════════════════════════════════════════
-- OPPI — Comprehensive Backend Compatibility & Security Migration
-- Project: ccrtrgdgaqhvqqxbimdu
-- ══════════════════════════════════════════════════════════════════════

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Applications Table Compatibility
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS pitch_text TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS delivery_days INT DEFAULT 5;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS rate NUMERIC DEFAULT 0;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

UPDATE public.applications SET created_at = applied_at WHERE created_at IS NULL AND applied_at IS NOT NULL;
UPDATE public.applications SET applied_at = created_at WHERE applied_at IS NULL AND created_at IS NOT NULL;

-- 3. Messages Table Compatibility
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- 4. Campaigns Table Compatibility
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS wilaya TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'all';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
  ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check 
    CHECK (status IN ('open', 'active', 'in_progress', 'completed', 'paused', 'cancelled', 'closed'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 5. Transactions Table Compatibility for Chargily Pay v2
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_payment_method_check 
  CHECK (payment_method IS NULL OR payment_method = ANY (ARRAY['edahabia'::text, 'cib'::text, 'app'::text, 'chargily_app'::text, 'other'::text]));

-- 6. Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('madjedalirachedi291@gmail.com', 'madjedar@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. Auth Trigger: Auto-assign role and populate profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_email TEXT;
  v_brand_name TEXT;
BEGIN
  v_email := LOWER(COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''));
  
  IF v_email IN ('madjedalirachedi291@gmail.com', 'madjedar@gmail.com') THEN
    v_role := 'admin';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'creator');
  END IF;

  v_brand_name := COALESCE(NEW.raw_user_meta_data->>'brand_name', '');

  INSERT INTO public.profiles (id, full_name, brand_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    v_brand_name,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    brand_name = COALESCE(NULLIF(EXCLUDED.brand_name, ''), public.profiles.brand_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
    role = CASE 
      WHEN v_role = 'admin' THEN 'admin'
      WHEN public.profiles.role IS NOT NULL THEN public.profiles.role
      ELSE v_role
    END,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure official admin accounts are admin
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE LOWER(email) IN ('madjedalirachedi291@gmail.com', 'madjedar@gmail.com')
);

-- 8. Deduplicate & Standardize RLS Policies

-- Campaigns Policies
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campaigns viewable by all" ON public.campaigns;
DROP POLICY IF EXISTS "Campaigns are viewable by everyone" ON public.campaigns;
CREATE POLICY "Campaigns viewable by all" ON public.campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Brands can create campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Brands can insert their own campaigns" ON public.campaigns;
CREATE POLICY "Brands can create campaigns" ON public.campaigns FOR INSERT 
  WITH CHECK (auth.uid() = brand_id OR public.is_admin());

DROP POLICY IF EXISTS "Brands can update own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Brands can update their own campaigns" ON public.campaigns;
CREATE POLICY "Brands can update own campaigns" ON public.campaigns FOR UPDATE 
  USING (auth.uid() = brand_id OR public.is_admin());

DROP POLICY IF EXISTS "Brands can delete own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Brands can delete their own campaigns" ON public.campaigns;
CREATE POLICY "Brands can delete own campaigns" ON public.campaigns FOR DELETE 
  USING (auth.uid() = brand_id OR public.is_admin());

-- Applications Policies
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applications viewable by involved users" ON public.applications;
DROP POLICY IF EXISTS "Users can read relevant applications" ON public.applications;
CREATE POLICY "Applications viewable by involved users" ON public.applications FOR SELECT 
  USING (
    auth.uid() = creator_id 
    OR public.is_admin() 
    OR EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = applications.campaign_id AND campaigns.brand_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators can submit application" ON public.applications;
DROP POLICY IF EXISTS "Creators can insert their own applications" ON public.applications;
CREATE POLICY "Creators can submit application" ON public.applications FOR INSERT 
  WITH CHECK (auth.uid() = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Involved users can update application" ON public.applications;
DROP POLICY IF EXISTS "Brands can update applications for their campaigns" ON public.applications;
CREATE POLICY "Involved users can update application" ON public.applications FOR UPDATE 
  USING (
    auth.uid() = creator_id 
    OR public.is_admin() 
    OR EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = applications.campaign_id AND campaigns.brand_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators can delete pending application" ON public.applications;
DROP POLICY IF EXISTS "Creators can delete their own applications" ON public.applications;
CREATE POLICY "Creators can delete pending application" ON public.applications FOR DELETE 
  USING (auth.uid() = creator_id OR public.is_admin());

-- Messages Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id OR public.is_admin());

DROP POLICY IF EXISTS "Receiver can mark message read" ON public.messages;
CREATE POLICY "Receiver can mark message read" ON public.messages FOR UPDATE 
  USING (auth.uid() = receiver_id OR public.is_admin());

-- Notifications Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "System/Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "System/Users can insert notifications" ON public.notifications FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id OR public.is_admin());

-- Transactions Policies
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT 
  USING (auth.uid() = brand_id OR auth.uid() = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Service or Brand can insert transactions" ON public.transactions;
CREATE POLICY "Service or Brand can insert transactions" ON public.transactions FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service or Brand can update transactions" ON public.transactions;
CREATE POLICY "Service or Brand can update transactions" ON public.transactions FOR UPDATE 
  USING (true);

-- 9. Realtime Subscriptions & Full Replica Identity
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.campaigns REPLICA IDENTITY FULL;
ALTER TABLE public.applications REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON public.messages(receiver_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON public.campaigns(brand_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON public.campaigns(category);
CREATE INDEX IF NOT EXISTS idx_applications_campaign_status ON public.applications(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_creator_status ON public.applications(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_brand ON public.transactions(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_creator ON public.transactions(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_chargily ON public.transactions(chargily_checkout_id);
