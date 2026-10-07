import { supabase } from '../lib/supabase';
import { isValidUUID, safeHref, sanitizeText, sanitizeForPayload, validateReviewForm } from '../utils/validators';

// ------------------------------------------------------------------
// IN-MEMORY QUERY CACHE (TTL)
// ------------------------------------------------------------------
const queryCache = new Map();
const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds

export const getCachedData = (key) => {
  const cached = queryCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    queryCache.delete(key);
    return null;
  }
  return cached.data;
};

export const setCachedData = (key, data, ttlMs = DEFAULT_TTL_MS) => {
  queryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs
  });
};

export const invalidateCache = (pattern = null) => {
  if (!pattern) {
    queryCache.clear();
    return;
  }
  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
};

// ------------------------------------------------------------------
// PROFILES (CREATORS & BRANDS)
// ------------------------------------------------------------------

export const getStoreProfiles = async (forceRefresh = false) => {
  const cacheKey = 'stores_profiles';
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['brand', 'admin']);
    
  if (error) throw error;
  
  // Retrieve campaigns to compute accurate active campaigns count and total budget per store
  let allCampaigns = [];
  try {
    allCampaigns = await getCampaigns(forceRefresh);
  } catch {
    allCampaigns = getLocalDevCampaigns();
  }

  const mapped = data.map(store => {
    const storeNames = [
      store.brand_name, 
      store.full_name, 
      store.name
    ].filter(Boolean).map(n => String(n).trim().toLowerCase());

    const storeCampaigns = (allCampaigns || []).filter(c => {
      if (c.brand_id && store.id && c.brand_id === store.id) return true;
      const cBrandNames = [
        c.brand_name, 
        c.brand?.brand_name, 
        c.brand?.full_name, 
        c.brand?.name
      ].filter(Boolean).map(n => String(n).trim().toLowerCase());
      return storeNames.some(sName => 
        cBrandNames.some(cName => cName.includes(sName) || sName.includes(cName))
      );
    });

    const activeList = storeCampaigns.filter(c => 
      c.status !== 'completed' && c.status !== 'paused' && c.status !== 'cancelled'
    );
    const activeCount = activeList.length > 0 ? activeList.length : storeCampaigns.length;
    const totalBudget = (activeList.length > 0 ? activeList : storeCampaigns).reduce(
      (acc, c) => acc + (Number(c.budget) || 0), 0
    );

    return {
      ...store,
      name: store.brand_name || store.full_name || 'Brand Name',
      logo: store.avatar_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=brand',
      sector: store.category || 'عام',
      location: store.wilaya || 'الجزائر',
      activeCampaigns: activeCount,
      totalBudget: totalBudget,
      verified: store.is_verified || false,
      campaigns: storeCampaigns
    };
  });

  setCachedData(cacheKey, mapped);
  return mapped;
};

export const getCreatorProfiles = async (forceRefresh = false) => {
  const cacheKey = 'creators_profiles';
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'creator');
    
  if (error) throw error;

  // Retrieve applications to compute real completed deals count
  let allApplications = [];
  try {
    const appsRes = await supabase.from('applications').select('creator_id, status');
    if (appsRes.data) allApplications = appsRes.data;
  } catch {
    allApplications = [];
  }
  
  const mapped = data.map(creator => {
    const creatorApps = allApplications.filter(a => a.creator_id === creator.id);
    const completedCount = creatorApps.filter(a => a.status === 'completed').length;

    const igFollowers = creator.instagram_url ? 20000 : 0;
    const ttFollowers = creator.tiktok_url ? 30000 : 0;
    const ytFollowers = creator.youtube_url ? 25000 : 0;
    const computedTotal = (igFollowers + ttFollowers + ytFollowers) || 0;

    return {
      ...creator,
      name: creator.full_name || 'Creator Name',
      avatar: creator.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator',
      ratePerPost: Number(creator.rate_per_post) || 15000,
      followers: { 
        instagram: creator.social_links?.instagram_followers || igFollowers, 
        tiktok: creator.social_links?.tiktok_followers || ttFollowers, 
        youtube: creator.social_links?.youtube_followers || ytFollowers,
        total: computedTotal
      },
      location: creator.wilaya || 'الجزائر',
      completedDeals: completedCount > 0 ? completedCount : (creator.completed_deals || 0),
      rating: Number(creator.rating) || 5.0,
      reviewCount: creator.review_count || completedCount,
      verified: creator.is_verified || false
    };
  });

  setCachedData(cacheKey, mapped);
  return mapped;
};

export const updateProfile = async (userId, profileData) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profileData })
    .select()
    .single();
    
  if (error) throw error;
  invalidateCache('profiles');
  return data;
};

export const getCreators = async (forceRefresh = false) => {
  const cacheKey = 'creators_list';
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'creator');
    
  if (error) throw error;
  setCachedData(cacheKey, data);
  return data;
};

// ------------------------------------------------------------------
// CAMPAIGNS
// ------------------------------------------------------------------

// Local Dev Campaign Store for offline/localhost testing
const DEV_CAMPAIGNS_STORAGE_KEY = 'oppi_dev_campaigns';

export const getLocalDevCampaigns = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEV_CAMPAIGNS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveLocalDevCampaign = (camp) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalDevCampaigns();
    const updated = [camp, ...existing.filter(c => c.id !== camp.id)];
    localStorage.setItem(DEV_CAMPAIGNS_STORAGE_KEY, JSON.stringify(updated));
    invalidateCache('campaigns');
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('oppi_campaigns_channel');
      bc.postMessage({ type: 'NEW_CAMPAIGN', campaign: camp });
      bc.close();
    }
  } catch (e) {
    console.warn('[saveLocalDevCampaign] Failed to save locally:', e);
  }
};

export const getCampaigns = async (forceRefresh = false) => {
  const cacheKey = 'campaigns_list';
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }

  let data = [];
  try {
    const res = await supabase
      .from('campaigns')
      .select(`
        *,
        brand:profiles!campaigns_brand_id_fkey (
          brand_name,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .order('created_at', { ascending: false });
    if (res.data) data = res.data;
  } catch (err) {
    console.warn('[getCampaigns] Supabase query notice:', err);
  }

  // Merge any local dev campaigns for complete seamless offline/dev testing
  const localCamps = getLocalDevCampaigns();
  const allCampaigns = [...localCamps, ...data].filter((c, idx, arr) => 
    arr.findIndex(item => item.id === c.id) === idx
  );
    
  setCachedData(cacheKey, allCampaigns);
  return allCampaigns;
};

export const createCampaign = async (campaignData) => {
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Format deliverables as clean array for PostgreSQL JSONB / ARRAY support
  const deliverablesFormatted = Array.isArray(campaignData.deliverables)
    ? campaignData.deliverables
    : (typeof campaignData.deliverables === 'string'
        ? campaignData.deliverables.split(',').map(s => s.trim()).filter(Boolean)
        : ['منشور إنستغرام', 'قصة (Story)', 'فيديو ريلز']);

  const payload = {
    brand_id: campaignData.brand_id,
    title: sanitizeText(campaignData.title, 100),
    description: sanitizeText(campaignData.description || '', 2000),
    budget: Number(campaignData.budget) || 0,
    category: campaignData.category || 'تكنولوجيا',
    deliverables: deliverablesFormatted,
    deadline: campaignData.deadline || null,
    status: campaignData.status || 'open'
  };

  const { data, error } = await supabase
    .from('campaigns')
    .insert([payload])
    .select(`
      *,
      brand:profiles!campaigns_brand_id_fkey (
        brand_name,
        full_name,
        avatar_url,
        is_verified
      )
    `);
    
  if (error) {
    console.error('[createCampaign] Supabase error:', error);

    // If RLS or FK blocked in local dev session, store in local dev store
    if ((error.code === '42501' || error.code === '23503') && isLocalhost) {
      console.warn('[createCampaign] RLS / FK blocked insert in local test session. Storing in local dev sync.');
      let brandProfile = null;
      try {
        brandProfile = await getProfileById(campaignData.brand_id);
      } catch (e) {}

      const localCamp = {
        id: `local_camp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        brand_id: campaignData.brand_id,
        title: payload.title,
        description: payload.description,
        budget: payload.budget,
        category: payload.category,
        deliverables: payload.deliverables,
        deadline: payload.deadline,
        status: payload.status,
        created_at: new Date().toISOString(),
        brand: brandProfile || {
          brand_name: 'متجر فيكتوريا',
          full_name: 'فيكتوريا',
          avatar_url: '',
          is_verified: true
        }
      };

      saveLocalDevCampaign(localCamp);
      invalidateCache('campaigns');
      return [localCamp];
    }

    throw error;
  }

  invalidateCache('campaigns');
  return data;
};

export const updateCampaign = async (campaignId, updates) => {
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const payload = { ...updates };
  if (payload.deliverables && typeof payload.deliverables === 'string') {
    payload.deliverables = payload.deliverables.split(',').map(s => s.trim()).filter(Boolean);
  }
  if ('deadline' in payload && !payload.deadline) {
    payload.deadline = null;
  }

  // Check if it's a local campaign
  if (typeof campaignId === 'string' && campaignId.startsWith('local_camp_')) {
    const localCamps = getLocalDevCampaigns();
    const target = localCamps.find(c => c.id === campaignId);
    if (target) {
      const updated = { ...target, ...payload, updated_at: new Date().toISOString() };
      saveLocalDevCampaign(updated);
      invalidateCache('campaigns');
      return [updated];
    }
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update(payload)
    .eq('id', campaignId)
    .select();
    
  if (error) {
    if (error.code === '42501' && isLocalhost) {
      const localCamps = getLocalDevCampaigns();
      const target = localCamps.find(c => c.id === campaignId) || { id: campaignId };
      const updated = { ...target, ...payload, updated_at: new Date().toISOString() };
      saveLocalDevCampaign(updated);
      invalidateCache('campaigns');
      return [updated];
    }
    throw error;
  }

  invalidateCache('campaigns');
  return data;
};

export const deleteCampaign = async (campaignId) => {
  if (typeof campaignId === 'string' && campaignId.startsWith('local_camp_')) {
    if (typeof window !== 'undefined') {
      const localCamps = getLocalDevCampaigns().filter(c => c.id !== campaignId);
      localStorage.setItem(DEV_CAMPAIGNS_STORAGE_KEY, JSON.stringify(localCamps));
      invalidateCache('campaigns');
      invalidateCache('applications');
      return [{ id: campaignId }];
    }
  }

  // First delete associated applications to preserve referential integrity
  await supabase
    .from('applications')
    .delete()
    .eq('campaign_id', campaignId);

  const { data, error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
    .select();
    
  if (error) {
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (error.code === '42501' && isLocalhost) {
      if (typeof window !== 'undefined') {
        const localCamps = getLocalDevCampaigns().filter(c => c.id !== campaignId);
        localStorage.setItem(DEV_CAMPAIGNS_STORAGE_KEY, JSON.stringify(localCamps));
        invalidateCache('campaigns');
        invalidateCache('applications');
        return [{ id: campaignId }];
      }
    }
    throw error;
  }

  invalidateCache('campaigns');
  invalidateCache('applications');
  return data;
};

// ------------------------------------------------------------------
// APPLICATIONS & DEALS
// ------------------------------------------------------------------

export const applyToCampaign = async (campaignId, creatorId, pitchData = {}) => {
  const isLocalCamp = typeof campaignId === 'string' && (campaignId.startsWith('local_camp_') || campaignId.startsWith('camp_') || !isValidUUID(campaignId));
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const payload = {
    campaign_id: campaignId,
    creator_id: creatorId,
    status: 'pending',
    ...(pitchData.pitch_text ? { pitch_text: sanitizeText(pitchData.pitch_text, 1000) } : {}),
    ...(pitchData.portfolio_url ? { portfolio_url: safeHref(pitchData.portfolio_url) } : {}),
    ...(pitchData.delivery_days ? { delivery_days: Math.max(1, Math.min(60, Number(pitchData.delivery_days) || 5)) } : {})
  };

  if (isLocalCamp || (isLocalhost && !isValidUUID(creatorId))) {
    const localApp = {
      id: `local_app_${Date.now()}`,
      created_at: new Date().toISOString(),
      ...payload
    };
    try {
      const raw = localStorage.getItem('oppi_dev_applications');
      const existing = raw ? JSON.parse(raw) : [];
      localStorage.setItem('oppi_dev_applications', JSON.stringify([localApp, ...existing]));
    } catch {}
    return [localApp];
  }

  if (!isValidUUID(campaignId) || !isValidUUID(creatorId)) {
    throw new Error('Invalid campaign or creator UUID');
  }

  let { data, error } = await supabase
    .from('applications')
    .insert([payload])
    .select();
    
  // If specific extra columns don't exist yet in DB schema, fallback to core fields
  if (error && (error.code === '42703' || error.message?.includes('column'))) {
    const fallback = await supabase
      .from('applications')
      .insert([{ campaign_id: campaignId, creator_id: creatorId, status: 'pending' }])
      .select();
    if (!fallback.error) return fallback.data;
  }

  if (error) {
    if (isLocalhost) {
      const localApp = {
        id: `local_app_${Date.now()}`,
        created_at: new Date().toISOString(),
        ...payload
      };
      try {
        const raw = localStorage.getItem('oppi_dev_applications');
        const existing = raw ? JSON.parse(raw) : [];
        localStorage.setItem('oppi_dev_applications', JSON.stringify([localApp, ...existing]));
      } catch {}
      return [localApp];
    }
    throw error;
  }

  return data;
};

export const updateApplicationStatus = async (applicationId, status, deliverableUrl = null) => {
  const updateData = { status };
  if (deliverableUrl) {
    updateData.deliverable_url = safeHref(deliverableUrl);
  }
  
  const { data, error } = await supabase
    .from('applications')
    .update(updateData)
    .eq('id', applicationId)
    .select();
    
  if (error) throw error;
  return data;
};

export const deleteApplication = async (applicationId) => {
  const { data, error } = await supabase
    .from('applications')
    .delete()
    .eq('id', applicationId)
    .select();
    
  if (error) throw error;
  return data;
};

export const getCreatorApplications = async (creatorId) => {
  let data = [];
  try {
    const res = await supabase
      .from('applications')
      .select(`
        *,
        campaign:campaigns (
          *,
          brand:profiles!campaigns_brand_id_fkey(brand_name, avatar_url)
        )
      `)
      .eq('creator_id', creatorId);
      
    if (res.data) data = res.data;
  } catch (err) {
    console.warn('[getCreatorApplications] query warning:', err);
  }

  // Include local dev applications if testing locally/offline
  try {
    const rawDevApps = typeof window !== 'undefined' ? localStorage.getItem('oppi_dev_applications') : null;
    if (rawDevApps) {
      const devApps = JSON.parse(rawDevApps);
      const matchingDevApps = devApps.filter(app => app.creator_id === creatorId);
      data = [...matchingDevApps, ...data].filter((a, idx, arr) => 
        arr.findIndex(item => item.id === a.id) === idx
      );
    }
  } catch (e) {
    console.warn('[getCreatorApplications] local apps warning:', e);
  }

  return data;
};

export const getBrandApplications = async (brandId) => {
  // Fetch campaigns for this brand, and the applications for those campaigns
  let data = [];
  try {
    const res = await supabase
      .from('applications')
      .select(`
        *,
        creator:profiles!applications_creator_id_fkey (*),
        campaign:campaigns!inner (*)
      `)
      .eq('campaign.brand_id', brandId);
      
    if (res.data) data = res.data;
  } catch (err) {
    console.warn('[getBrandApplications] query warning:', err);
  }

  // Include local dev applications if testing locally/offline
  try {
    const rawDevApps = typeof window !== 'undefined' ? localStorage.getItem('oppi_dev_applications') : null;
    if (rawDevApps) {
      const devApps = JSON.parse(rawDevApps);
      const matchingDevApps = devApps.filter(app => 
        app.campaign?.brand_id === brandId || app.brand_id === brandId
      );
      data = [...matchingDevApps, ...data].filter((a, idx, arr) => 
        arr.findIndex(item => item.id === a.id) === idx
      );
    }
  } catch (e) {
    console.warn('[getBrandApplications] local apps warning:', e);
  }

  return data;
};

export const getProfileById = async (userId) => {
  if (!isValidUUID(userId)) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('[getProfileById] Supabase error:', error);
    return null;
  }
  return data;
};

// ------------------------------------------------------------------
// MESSAGES (CHAT)
// ------------------------------------------------------------------

// Local Dev Message Store for offline/localhost testing
const DEV_MESSAGES_STORAGE_KEY = 'oppi_dev_messages';

const getLocalDevMessages = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEV_MESSAGES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalDevMessage = (msg) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalDevMessages();
    const updated = [...existing, msg];
    localStorage.setItem(DEV_MESSAGES_STORAGE_KEY, JSON.stringify(updated));
    // Broadcast to other tabs/windows in real time
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('oppi_chat_channel');
      bc.postMessage({ type: 'NEW_MESSAGE', message: msg });
      bc.close();
    }
  } catch (e) {
    console.warn('[saveLocalDevMessage] Failed to save locally:', e);
  }
};

export const getUserConversations = async (userId) => {
  if (!isValidUUID(userId)) {
    console.warn('[getUserConversations] Blocked query due to invalid UUID:', userId);
    return [];
  }

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      sender_id,
      receiver_id,
      text,
      created_at,
      sender:profiles!sender_id(id, full_name, brand_name, avatar_url, role, category, wilaya, is_verified),
      receiver:profiles!receiver_id(id, full_name, brand_name, avatar_url, role, category, wilaya, is_verified)
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  // Merge any local dev messages
  const localMsgs = getLocalDevMessages().filter(m => m.sender_id === userId || m.receiver_id === userId);
  const allMessages = [...(localMsgs || []), ...(data || [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  if (error && (!data || data.length === 0) && localMsgs.length === 0) {
    console.error('[getUserConversations] Supabase error:', error);
    return [];
  }

  const conversationsMap = new Map();
  for (const msg of allMessages) {
    const isSender = msg.sender_id === userId;
    let otherUser = isSender ? msg.receiver : msg.sender;
    const otherUserId = isSender ? msg.receiver_id : msg.sender_id;

    if (!otherUserId) continue;

    if (!conversationsMap.has(otherUserId)) {
      if (!otherUser) {
        try {
          otherUser = await getProfileById(otherUserId);
        } catch (e) {}
      }

      conversationsMap.set(otherUserId, {
        id: otherUserId,
        full_name: otherUser?.full_name || otherUser?.brand_name || (otherUserId === '196f2255-a271-4ba3-9f8b-8c71a586acb4' ? 'متجر فيكتوريا' : 'مستخدم'),
        brand_name: otherUser?.brand_name || (otherUserId === '196f2255-a271-4ba3-9f8b-8c71a586acb4' ? 'فيكتوريا' : ''),
        avatar_url: otherUser?.avatar_url || '',
        role: otherUser?.role || (otherUserId === '196f2255-a271-4ba3-9f8b-8c71a586acb4' ? 'brand' : 'creator'),
        category: otherUser?.category || '',
        wilaya: otherUser?.wilaya || '',
        is_verified: Boolean(otherUser?.is_verified ?? true),
        lastMessage: msg.text,
        lastMessageAt: msg.created_at,
      });
    }
  }

  const resultConversations = Array.from(conversationsMap.values());
  const cacheKey = `oppi_convs_cache_${userId}`;

  // Cache conversations in localStorage for offline resilience
  if (typeof localStorage !== 'undefined') {
    try {
      if (resultConversations.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(resultConversations));
      } else if (error) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch (e) {}
  }

  return resultConversations;
};

export const getMessages = async (userId1, userId2) => {
  // Validate UUIDs to prevent PostgREST Filter Injection
  if (!isValidUUID(userId1) || !isValidUUID(userId2)) {
    console.warn('[getMessages] Blocked query due to invalid UUID:', { userId1, userId2 });
    return [];
  }

  const pairKey = [userId1, userId2].sort().join('_');
  const cacheKey = `oppi_msgs_cache_${pairKey}`;

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
    .order('created_at', { ascending: true });

  const localMsgs = getLocalDevMessages().filter(
    m => (m.sender_id === userId1 && m.receiver_id === userId2) ||
         (m.sender_id === userId2 && m.receiver_id === userId1)
  );

  const combined = [...(data || []), ...(localMsgs || [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  // Cache messages for offline resilience
  if (typeof localStorage !== 'undefined') {
    try {
      if (combined.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(combined));
      } else if (error) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch (e) {}
  }
    
  if (error && localMsgs.length === 0 && combined.length === 0) {
    console.error('[getMessages] Supabase error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
  return combined;
};

export const sendMessage = async (senderId, receiverId, text) => {
  if (!isValidUUID(senderId) || !isValidUUID(receiverId)) {
    throw new Error('Invalid sender or receiver UUID');
  }

  const sanitizedText = sanitizeText(text, 2000);
  if (!sanitizedText) {
    throw new Error('Message text cannot be empty');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert([{ sender_id: senderId, receiver_id: receiverId, text: sanitizedText }])
    .select();
    
  if (error) {
    // Log full Supabase error for debugging
    console.error('[sendMessage] Supabase error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    // In local dev testing, if Supabase RLS blocks unauthenticated insert (42501):
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (error.code === '42501' && isLocalhost) {
      console.warn('[sendMessage] RLS policy blocked insert in local test session. Storing in local dev sync.');
      let senderProfile = null;
      let receiverProfile = null;
      try {
        [senderProfile, receiverProfile] = await Promise.all([
          getProfileById(senderId),
          getProfileById(receiverId)
        ]);
      } catch (e) {}

      const localMsg = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        sender_id: senderId,
        receiver_id: receiverId,
        text: sanitizedText,
        created_at: new Date().toISOString(),
        sender: senderProfile || (senderId === '196f2255-a271-4ba3-9f8b-8c71a586acb4' ? { full_name: 'متجر فيكتوريا', brand_name: 'فيكتوريا', role: 'brand' } : null),
        receiver: receiverProfile || (receiverId === 'e695998d-036b-4e6d-8f9d-253977932dd2' ? { full_name: 'madjed AR', role: 'creator' } : null)
      };
      saveLocalDevMessage(localMsg);
      try {
        createNotification(
          receiverId,
          'رسالة جديدة 💬',
          `وصلتك رسالة جديدة: "${sanitizedText.slice(0, 50)}${sanitizedText.length > 50 ? '...' : ''}"`
        ).catch(() => {});
      } catch (e) {}
      return [localMsg];
    }

    throw error;
  }

  // Asynchronously notify receiver with sender's name without blocking message return
  (async () => {
    try {
      let senderName = 'متجر';
      try {
        const senderProf = await getProfileById(senderId);
        senderName = senderProf?.brand_name || senderProf?.full_name || 'أحد المستخدمين';
      } catch (e) {}

      await createNotification(
        receiverId,
        'رسالة جديدة 💬',
        `أرسل لك ${senderName} رسالة جديدة: "${sanitizedText.slice(0, 50)}${sanitizedText.length > 50 ? '...' : ''}"`
      );
    } catch (notifErr) {
      console.warn('[sendMessage] Notification dispatch failed:', notifErr);
    }
  })();

  // Update offline message cache immediately
  if (data && data[0] && typeof localStorage !== 'undefined') {
    try {
      const pairKey = [senderId, receiverId].sort().join('_');
      const cacheKey = `oppi_msgs_cache_${pairKey}`;
      const raw = localStorage.getItem(cacheKey);
      const existing = raw ? JSON.parse(raw) : [];
      if (!existing.some(m => m.id === data[0].id)) {
        localStorage.setItem(cacheKey, JSON.stringify([...existing, data[0]]));
      }
    } catch (e) {}
  }

  return data;
};

export const subscribeToMessages = (userId, callback) => {
  // Use a unique channel name per user to avoid subscription collisions
  const channelName = `messages_user_${userId}_${Date.now()}`;
  const subscription = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  // Also listen to local dev BroadcastChannel on localhost
  let localBc = null;
  if (typeof BroadcastChannel !== 'undefined') {
    localBc = new BroadcastChannel('oppi_chat_channel');
    localBc.onmessage = (event) => {
      if (event.data?.type === 'NEW_MESSAGE' && event.data?.message) {
        const msg = event.data.message;
        if (msg.sender_id === userId || msg.receiver_id === userId) {
          callback(msg);
        }
      }
    };
  }

  return {
    unsubscribe: () => {
      if (subscription) subscription.unsubscribe();
      if (localBc) localBc.close();
    }
  };
};

// ------------------------------------------------------------------
// NOTIFICATIONS
// ------------------------------------------------------------------

export const getNotifications = async (userId) => {
  if (!isValidUUID(userId)) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const subscribeToNotifications = (userId, onNotification) => {
  const subscription = supabase
    .channel('public:notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, payload => {
      onNotification(payload.new);
    })
    .subscribe();
    
  return subscription;
};

export const markNotificationRead = async (notificationId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select();
    
  if (error) throw error;
  return data;
};

export const createNotification = async (userId, title, message) => {
  if (!isValidUUID(userId)) {
    console.warn('Invalid user UUID for notification, skipped:', userId);
    return null;
  }

  const sanitizedTitle = sanitizeForPayload(title, 100);
  const sanitizedMessage = sanitizeText(message, 500);

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{ user_id: userId, title: sanitizedTitle, message: sanitizedMessage }])
      .select();
      
    if (error) {
      console.warn('Could not insert notification into db:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('createNotification error:', err);
    return null;
  }
};

export const addReview = async (creatorId, rating, reviewText) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    if (!isValidUUID(creatorId)) throw new Error("Invalid creator UUID");

    const validation = validateReviewForm(rating, reviewText);
    if (!validation.isValid) throw new Error(validation.error);

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        creator_id: creatorId,
        brand_id: user.id,
        rating: validation.rating,
        review_text: validation.reviewText
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding review:", error);
    throw error;
  }
};

// ------------------------------------------------------------------
// PAYOUT REQUESTS
// ------------------------------------------------------------------

export const createPayoutRequest = async ({ creatorId, amountDzd, ripNumber, payoutMethod = 'baridimob' }) => {
  const { data, error } = await supabase
    .from('payout_requests')
    .insert([
      {
        creator_id: creatorId,
        amount_dzd: amountDzd,
        rip_number: ripNumber,
        payout_method: payoutMethod,
        status: 'pending'
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getPayoutRequests = async (creatorId) => {
  let query = supabase
    .from('payout_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (creatorId) {
    query = query.eq('creator_id', creatorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

