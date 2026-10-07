import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'



const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setProfile(data)
      } else {
        setProfile({ id: userId, role: null })
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setProfile({ id: userId, role: null })
    }
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Initialize session and clean up any auth tokens from URL
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          await fetchProfile(currentUser.id)
        } else if (typeof localStorage !== 'undefined') {
          const savedDev = localStorage.getItem('oppi_dev_user');
          if (savedDev) {
            try {
              const parsed = JSON.parse(savedDev);
              setUser(parsed);
              setProfile({
                id: parsed.id,
                full_name: parsed.user_metadata?.full_name || parsed.full_name,
                brand_name: parsed.user_metadata?.brand_name || '',
                role: parsed.role,
                phone: '0555000000',
                wilaya: 'الجزائر'
              });
            } catch (e) {}
          }
        }
        
        // Security: Clean URL hash if it contains OAuth / Magic Link access tokens
        if (typeof window !== 'undefined' && window.location.hash && (
          window.location.hash.includes('access_token=') || 
          window.location.hash.includes('type=recovery') ||
          window.location.hash.includes('error_description=')
        )) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      } catch (err) {
        console.error('Session init error:', err)
      } finally {
        setLoading(false)
      }
    }
    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          const currentUser = session?.user ?? null
          setUser(currentUser)
          if (currentUser) {
            await fetchProfile(currentUser.id)
          } else {
            setProfile(null)
          }

          // Clean URL on sign-in
          if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token=')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  /**
   * Returns a valid JWT access token, automatically refreshing if close to expiry (< 60s)
   */
  const getFreshToken = async () => {
    if (!supabase) return null;
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;

      // If token expires in less than 60 seconds, proactively refresh it
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      if (expiresAt && Date.now() > expiresAt - 60000) {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshData?.session?.access_token) {
          return refreshData.session.access_token;
        }
      }
      return session.access_token;
    } catch (err) {
      console.warn('Error fetching fresh JWT token:', err);
      return null;
    }
  };

  const loginDevUser = (targetRole = 'brand') => {
    const demoUser = targetRole === 'creator' ? {
      id: 'e695998d-036b-4e6d-8f9d-253977932dd2',
      email: 'creator.demo@oppi.dz',
      role: 'creator',
      user_metadata: { full_name: 'صانع محتوى (تجريبي)', role: 'creator' }
    } : targetRole === 'admin' ? {
      id: '24caebcc-1e0e-4c43-b442-63927aa4ff5b',
      email: 'madjedalirachedi291@gmail.com',
      role: 'admin',
      user_metadata: { full_name: 'مدير المنصة (تجريبي)', role: 'admin' }
    } : {
      id: '196f2255-a271-4ba3-9f8b-8c71a586acb4',
      email: 'brand.demo@oppi.dz',
      role: 'brand',
      user_metadata: { full_name: 'متجر فيكتوريا (تجريبي)', brand_name: 'فيكتوريا', role: 'brand' }
    };
    setUser(demoUser);
    setProfile({
      id: demoUser.id,
      full_name: demoUser.user_metadata.full_name,
      brand_name: demoUser.user_metadata.brand_name || '',
      role: demoUser.role,
      phone: '0555000000',
      wilaya: 'الجزائر'
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('oppi_dev_user', JSON.stringify(demoUser));
    }
  };

  const logout = async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('oppi_dev_user');
      localStorage.removeItem('oppi_dz_auth_session');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('oauth_login');
      sessionStorage.removeItem('oauth_role');
      sessionStorage.removeItem('post_login_action');
    }
    if (supabase) {
      try { await supabase.auth.signOut(); } catch (e) {}
    }
    setUser(null);
    setProfile(null);
  };

  // Bug #12 fix: propagate errors instead of silently swallowing
  const updateProfileData = async (profileFields) => {
    if (!user || !supabase) return;
    const payload = {
      id: user.id,
      updated_at: new Date().toISOString(),
      ...profileFields
    };
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select()
      .single();
    if (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
    setProfile(data);
  };

  const updateRole = async (role) => {
    if (!user || !supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, role, full_name: user.user_metadata?.full_name || '' })
      .select()
      .single();
    if (error) {
      console.error('Error updating role:', error);
      throw error;
    }

    await supabase.auth.updateUser({ data: { role } })
    setProfile(prev => ({ ...(prev || {}), id: user.id, role }))
  }

  const ADMIN_EMAILS = [
    'madjedalirachedi291@gmail.com',
    'madjedar@gmail.com',
  ];

  const userEmail = (user?.email || '').toLowerCase().trim();
  const hasAdminEmail = ADMIN_EMAILS.includes(userEmail);
  const isAdminUser = profile?.role === 'admin' || user?.user_metadata?.role === 'admin' || hasAdminEmail;

  // Preserve explicit role if set in profile or metadata (e.g. creator or brand)
  const explicitRole = profile?.role || user?.user_metadata?.role || null;
  const resolvedRole = explicitRole || (isAdminUser ? 'admin' : null);

  const userWithRole = user ? { 
    ...user, 
    role: resolvedRole, 
    isAdmin: isAdminUser,
    profile: profile ? { ...profile, role: profile.role || resolvedRole } : { id: user.id, role: resolvedRole }
  } : null;

  return (
    <AuthContext.Provider value={{ user: userWithRole, profile, loading, logout, loginDevUser, updateRole, updateProfileData, fetchProfile, getFreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
