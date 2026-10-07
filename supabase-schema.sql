-- ═══════════════════════════════════════════════════════
-- OPPI — Complete Unified Supabase Database Schema
-- Includes Full Authentication, Authorization & RBAC Policies
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ═══════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. PROFILES TABLE ───
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  brand_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'brand', 'admin', 'suspended')),
  bio TEXT,
  category TEXT,
  wilaya TEXT,
  phone TEXT,
  rate_per_post NUMERIC DEFAULT 0,
  social_links JSONB DEFAULT '{"youtube": "", "instagram": "", "tiktok": "", "facebook": ""}'::jsonb,
  instagram_url TEXT,
  tiktok_url TEXT,
  youtube_url TEXT,
  facebook_url TEXT,
  website_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. CAMPAIGNS TABLE ───
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  budget NUMERIC NOT NULL DEFAULT 0 CHECK (budget >= 0),
  category TEXT,
  wilaya TEXT,
  platform TEXT DEFAULT 'all',
  deliverables JSONB DEFAULT '[]'::jsonb,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'active', 'in_progress', 'completed', 'paused', 'cancelled', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all required columns exist for existing tables
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS wilaya TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'all';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ─── 3. APPLICATIONS TABLE ───
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'accepted', 'rejected', 'in_progress', 'submitted', 'completed', 'cancelled')),
  pitch TEXT,
  price_dzd NUMERIC DEFAULT 0,
  sample_link TEXT,
  deliverable_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. TRANSACTIONS & ESCROW TABLE ───
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID,
  brand_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_dzd NUMERIC NOT NULL CHECK (amount_dzd > 0),
  platform_fee_dzd NUMERIC NOT NULL DEFAULT 0 CHECK (platform_fee_dzd >= 0),
  chargily_checkout_id TEXT,
  payment_method TEXT CHECK (payment_method IN ('edahabia', 'cib')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'escrow_funded', 'released', 'refunded', 'failed')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. PAYOUT REQUESTS TABLE ───
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_dzd NUMERIC NOT NULL CHECK (amount_dzd > 0),
  rip_number TEXT NOT NULL,
  payout_method TEXT DEFAULT 'baridimob' CHECK (payout_method IN ('baridimob', 'ccp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 6. MESSAGES (CHAT) TABLE ───
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. NOTIFICATIONS TABLE ───
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 8. REVIEWS TABLE ───
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- AUTHORIZATION & SECURITY DEFINER FUNCTIONS
-- ═══════════════════════════════════════════════════════

-- Check if current authenticated user has Admin rights
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

-- Auto-create profile on Auth Sign Up (Google OAuth & Email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_email TEXT;
BEGIN
  v_email := LOWER(COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''));
  
  -- Auto-assign admin role if email matches official admin list
  IF v_email IN ('madjedalirachedi291@gmail.com', 'madjedar@gmail.com') THEN
    v_role := 'admin';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'creator');
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
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

-- Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER set_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_applications_updated_at ON public.applications;
CREATE TRIGGER set_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) & AUTHORIZATION POLICIES
-- ═══════════════════════════════════════════════════════

-- 1. Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles viewable by all" ON public.profiles;
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE 
  USING (auth.uid() = id OR public.is_admin()) 
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 2. Campaigns RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campaigns viewable by all" ON public.campaigns;
CREATE POLICY "Campaigns viewable by all" ON public.campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Brands can create campaigns" ON public.campaigns;
CREATE POLICY "Brands can create campaigns" ON public.campaigns FOR INSERT 
  WITH CHECK (auth.uid() = brand_id OR public.is_admin());

DROP POLICY IF EXISTS "Brands can update own campaigns" ON public.campaigns;
CREATE POLICY "Brands can update own campaigns" ON public.campaigns FOR UPDATE 
  USING (auth.uid() = brand_id OR public.is_admin());

DROP POLICY IF EXISTS "Brands can delete own campaigns" ON public.campaigns;
CREATE POLICY "Brands can delete own campaigns" ON public.campaigns FOR DELETE 
  USING (auth.uid() = brand_id OR public.is_admin());

-- 3. Applications RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applications viewable by involved users" ON public.applications;
CREATE POLICY "Applications viewable by involved users" ON public.applications FOR SELECT 
  USING (
    auth.uid() = creator_id OR 
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = applications.campaign_id AND campaigns.brand_id = auth.uid())
  );

DROP POLICY IF EXISTS "Creators can submit application" ON public.applications;
CREATE POLICY "Creators can submit application" ON public.applications FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Involved users can update application" ON public.applications;
CREATE POLICY "Involved users can update application" ON public.applications FOR UPDATE 
  USING (
    auth.uid() = creator_id OR 
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = applications.campaign_id AND campaigns.brand_id = auth.uid())
  );

DROP POLICY IF EXISTS "Creators can delete pending application" ON public.applications;
CREATE POLICY "Creators can delete pending application" ON public.applications FOR DELETE 
  USING (auth.uid() = creator_id OR public.is_admin());

-- 4. Transactions RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT 
  USING (auth.uid() = brand_id OR auth.uid() = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Service or Brand can insert transactions" ON public.transactions;
CREATE POLICY "Service or Brand can insert transactions" ON public.transactions FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service or Brand can update transactions" ON public.transactions;
CREATE POLICY "Service or Brand can update transactions" ON public.transactions FOR UPDATE 
  USING (true);

-- 5. Payout Requests RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Creators can view own payout requests" ON public.payout_requests;
CREATE POLICY "Creators can view own payout requests" ON public.payout_requests FOR SELECT 
  USING (auth.uid() = creator_id OR public.is_admin());

DROP POLICY IF EXISTS "Creators can create payout requests" ON public.payout_requests;
CREATE POLICY "Creators can create payout requests" ON public.payout_requests FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admin can update payout requests" ON public.payout_requests;
CREATE POLICY "Admin can update payout requests" ON public.payout_requests FOR UPDATE 
  USING (public.is_admin());

-- 6. Messages RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id OR public.is_admin());

DROP POLICY IF EXISTS "Receiver can mark message read" ON public.messages;
CREATE POLICY "Receiver can mark message read" ON public.messages FOR UPDATE 
  USING (auth.uid() = receiver_id OR public.is_admin());

-- 7. Notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "System/Users can insert notifications" ON public.notifications;
CREATE POLICY "System/Users can insert notifications" ON public.notifications FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id OR public.is_admin());

-- 8. Reviews RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reviews viewable by all" ON public.reviews;
CREATE POLICY "Reviews viewable by all" ON public.reviews FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Brands can add reviews" ON public.reviews;
CREATE POLICY "Brands can add reviews" ON public.reviews FOR INSERT 
  WITH CHECK (auth.uid() = brand_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin can delete reviews" ON public.reviews;
CREATE POLICY "Admin can delete reviews" ON public.reviews FOR DELETE 
  USING (public.is_admin());

-- ═══════════════════════════════════════════════════════
-- REALTIME SUBSCRIPTIONS (IDEMPOTENT & SAFE)
-- ═══════════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ═══════════════════════════════════════════════════════
-- HIGH-PERFORMANCE B-TREE INDEXES
-- ═══════════════════════════════════════════════════════
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
