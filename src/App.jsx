import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth, AuthProvider } from './context/AuthContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import { supabase } from './lib/supabase'
import { getLocalizedItem } from './utils/localized'
import { formatDZD } from './services/chargilyService'
import Header from './components/Header'
import Hero from './components/Hero'
import Footer from './components/Footer'
import OptimizedImage from './components/OptimizedImage'
import ModalLoadingFallback from './components/ModalLoadingFallback'
import {
  preloadCreatorDetailsModal,
  preloadStoreDetailsModal,
  preloadCheckoutModal,
  preloadReviewModal,
  preloadCampaignApplyModal,
  preloadDashboardForRole
} from './utils/preloadChunks'

// Lazy-load modal dialogs to keep initial bundle ultra-lightweight and performant
const AuthModal = lazy(() => import('./components/AuthModal'))
const CreatorDashboardModal = lazy(() => import('./components/CreatorDashboardModal'))
const BrandDashboardModal = lazy(() => import('./components/BrandDashboardModal'))
const AdminDashboardModal = lazy(() => import('./components/AdminDashboardModal'))
const CreatorDetailsModal = lazy(() => import('./components/CreatorDetailsModal'))
const StoreDetailsModal = lazy(() => import('./components/StoreDetailsModal'))
const CheckoutModal = lazy(() => import('./components/CheckoutModal'))
const ReviewModal = lazy(() => import('./components/ReviewModal'))
const ProfileSettingsModal = lazy(() => import('./components/ProfileSettingsModal'))
const CampaignApplyModal = lazy(() => import('./components/CampaignApplyModal'))
const ContactModal = lazy(() => import('./components/ContactModal'))

export const CATEGORIES = [
  'الكل',
  'تكنولوجيا',
  'موضة وأزياء',
  'تجميل وعناية',
  'طبخ وأكل',
  'سفر وسياحة',
  'رياضة ولياقة'
]

import { isAdmin, isBrand, isCreator, canApplyToCampaign, canHireCreator, canAccessAdmin } from './utils/authGuards'
import {
  Search,
  Filter,
  Star,
  Users,
  TrendingUp,
  BadgeCheck,
  ArrowLeft,
  ChevronDown,
  CreditCard,
  ShieldCheck,
  Zap,
  Lock,
  Wallet,
  UserPlus,
  FileText,
  Handshake,
  CircleDollarSign,
  Building2,
  MapPin,
  Briefcase,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  X,
  ExternalLink,
  MessageSquare
} from 'lucide-react'

const ALGERIAN_WILAYAS = [
  'الجزائر', 'وهران', 'قسنطينة', 'عنابة', 'سطيف', 'باتنة', 'البليدة', 'تلمسان', 
  'بجاية', 'تيزي وزو', 'الشلف', 'بسكرة', 'تبسة', 'جيجل', 'سكيكدة', 'سيدي بلعباس', 
  'مستغانم', 'المسيلة', 'معسكر', 'ورقلة', 'برج بوعريريج', 'بومرداس', 'الطارف', 
  'تندوف', 'تيسمسيلت', 'الوادي', 'خنشلة', 'سوق أهراس', 'تيبازة', 'ميلة', 'عين الدفلى', 
  'النعامة', 'عين تموشنت', 'غرداية', 'غليزان', 'تيميمون', 'برج باجي مختار', 'أولاد جلال', 
  'بني عباس', 'إن صالح', 'إن قزام', 'تقرت', 'جانت', 'المغير', 'المنيعة'
]

function AppContent() {
  const { user } = useAuth()
  const isLoggedIn = !!user
  const { t, language } = useLanguage()

  // Modal states
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login', role: 'creator' })
  const [dashboardState, setDashboardState] = useState({ open: false, tab: 'overview', type: 'creator' })
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [selectedStore, setSelectedStore] = useState(null)
  const [checkoutData, setCheckoutData] = useState(null)
  const [reviewCreator, setReviewCreator] = useState(null)
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false)
  const [isProfileMandatory, setIsProfileMandatory] = useState(false)
  const [selectedCampaignToApply, setSelectedCampaignToApply] = useState(null)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  // Showcase Tab & Advanced Filters
  const [showcaseTab, setShowcaseTab] = useState('creators') // 'creators' | 'stores'
  const [selectedCategory, setSelectedCategory] = useState('الكل')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState('all')
  const [selectedPriceRange, setSelectedPriceRange] = useState('all')
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [sortBy, setSortBy] = useState('featured')
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false)

  // Database State
  const [creators, setCreators] = useState([])
  const [stores, setStores] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  // Fetch real data on mount
  useEffect(() => {
    import('./services/dbService').then(({ getStoreProfiles, getCreatorProfiles }) => {
      Promise.all([getStoreProfiles(), getCreatorProfiles()])
        .then(([fetchedStores, fetchedCreators]) => {
          setStores(fetchedStores);
          setCreators(fetchedCreators);
          setLoadingData(false);
        })
        .catch(err => {
          console.error("Error fetching from DB:", err);
          setStores([]);
          setCreators([]);
          setLoadingData(false);
        });
    });
  }, []);

  // Payment callback detection
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')
    const errorMsg = params.get('error_description') || params.get('error')
    
    // Also check hash for Supabase OAuth errors
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const hashError = hashParams.get('error_description') || hashParams.get('error')

    if (errorMsg || hashError) {
      setToast({ type: 'error', message: `Auth Error: ${errorMsg || hashError}` })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (paymentStatus === 'success') {
      setToast({ type: 'success', message: t('paymentSuccess') })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (paymentStatus === 'failed') {
      setToast({ type: 'error', message: t('paymentFailed') })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [t])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Auto redirect on login and Mandatory Onboarding
  useEffect(() => {
    // Check for password reset flow from URL
    if (window.location.hash === '#reset-password') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      handleOpenAuth('update_password');
      return;
    }

    const isOAuthLogin = sessionStorage.getItem('oauth_login') === 'true';
    
    // If user has no role, they must select one
    if (user && (!user.role || user.role === 'null')) {
      if (!authModal.open || authModal.mode !== 'select_role') {
        handleOpenAuth('select_role');
      }
      return;
    }

    // Check mandatory profile completion
    if (user && user.role && user.profile) {
      if (!user.profile.full_name || !user.profile.phone || !user.profile.wilaya) {
        setIsProfileMandatory(true);
        setIsProfileSettingsOpen(true);
        return; // Stop them from going to dashboard yet
      } else {
        setIsProfileMandatory(false);
      }
    }

    // If user has a role and just logged in, or if auth modal was open when they logged in (via password)
    if (user && user.role && user.profile?.full_name && user.profile?.phone && user.profile?.wilaya && (authModal.open || isOAuthLogin)) {
      handleCloseAuth();
      if (isOAuthLogin) sessionStorage.removeItem('oauth_login');
      
      if (user.role === 'admin') {
        handleOpenDashboard('admin');
      } else {
        handleOpenDashboard('overview');
      }
    }
  }, [user?.id, user?.role, user?.profile, authModal.open]);

  // Role-based default showcase tab
  useEffect(() => {
    if (user?.role === 'creator') {
      setShowcaseTab('stores');
    } else if (user?.role === 'brand') {
      setShowcaseTab('creators');
    }
  }, [user?.role]);

  // Handlers
  const handleOpenAuth = (mode = 'login', role = 'creator') => setAuthModal({ open: true, mode, role })
  const handleCloseAuth = () => setAuthModal({ open: false, mode: 'login', role: 'creator' })
  const handleOpenDashboard = (tab = 'overview', type = null, contactId = null) => {
    if (tab === 'admin' && !canAccessAdmin(user)) {
      setToast({ type: 'error', message: 'عذراً، لوحة الأدمن مخصصة للإدارة فقط.' });
      return;
    }
    const resolvedType = type || (tab === 'create' || user?.role === 'brand' ? 'brand' : 'creator');
    setDashboardState({ open: true, tab, type: resolvedType, contactId });
  }
  const handleCloseDashboard = () => setDashboardState({ open: false, tab: 'overview', type: 'creator', contactId: null })
  const handleSelectCreator = (creator) => setSelectedCreator(creator)
  const handleCloseCreator = () => setSelectedCreator(null)
  
  const handleContactCreator = (creator) => {
    if (!creator?.id) return;
    setSelectedCreator(null);
    if (!isLoggedIn) {
      try {
        sessionStorage.setItem('pending_contact_creator', JSON.stringify(creator));
      } catch (e) {
        console.warn('Could not save pending contact:', e);
      }
      handleOpenAuth('login', 'brand');
      setToast({ type: 'info', message: 'يرجى تسجيل الدخول أو إنشاء حساب متجر للتواصل مع صانع المحتوى.' });
      return;
    }
    const dashboardType = (user?.role === 'brand' || user?.role === 'admin') ? 'brand' : 'creator';
    handleOpenDashboard('messages', dashboardType, creator.id);
  };

  // Auto-resume pending contact after brand login
  useEffect(() => {
    if (isLoggedIn && user && (user.role === 'brand' || user.role === 'admin')) {
      const saved = sessionStorage.getItem('pending_contact_creator');
      if (saved) {
        try {
          const targetCreator = JSON.parse(saved);
          sessionStorage.removeItem('pending_contact_creator');
          handleOpenDashboard('messages', 'brand', targetCreator.id);
          setToast({
            type: 'success',
            message: `تم فتح المحادثة مع ${targetCreator.name || targetCreator.full_name || 'صانع المحتوى'}`
          });
        } catch (e) {
          sessionStorage.removeItem('pending_contact_creator');
        }
      }
    }
  }, [isLoggedIn, user]);

  // Handle Chargily Pay gateway callback (success / failed return)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    if (!paymentStatus) return;

    if (paymentStatus === 'success') {
      let pendingDetails = null;
      try {
        const stored = sessionStorage.getItem('pending_chargily_checkout');
        if (stored) {
          pendingDetails = JSON.parse(stored);
          sessionStorage.removeItem('pending_chargily_checkout');
        }
      } catch (e) {
        console.warn('Could not read pending chargily checkout:', e);
      }

      setToast({
        type: 'success',
        message: 'تمت عملية الدفع بنجاح عبر Chargily Pay! 🎉 تم حجز الميزانية بأمان في حساب الضمان (Escrow).'
      });

      if (pendingDetails?.creatorId) {
        handleOpenDashboard('messages', 'brand', pendingDetails.creatorId);
      }
    } else if (paymentStatus === 'failed') {
      setToast({
        type: 'error',
        message: 'تم إلغاء عملية الدفع عبر Chargily Pay أو فشلت المعاملة البنكية.'
      });
    }

    // Clean up query parameters from address bar without reloading
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }, []);

  const handleHireCreator = (creator, applicationId = null) => {
    setSelectedCreator(null);
    if (!isLoggedIn) {
      handleOpenAuth('signup', 'brand');
      return;
    }
    if (!canHireCreator(user)) {
      setToast({ type: 'error', message: 'فقط أصحاب المتاجر والعلامات التجارية يمكنهم توظيف صناع المحتوى.' });
      return;
    }
    setCheckoutData({
      creator,
      applicationId,
      campaign: {
        title: `صفقة رعاية مع ${creator.name || creator.full_name}`,
        budget: creator.ratePerPost || creator.rate_per_post || 25000,
        deliverables: ['منشور على منصات التواصل', 'ستوري ترويجية', 'ذكر العلامة التجارية'],
      },
    });
  }
  const handleCloseCheckout = () => setCheckoutData(null)
  const handleReview = (creator) => {
    setSelectedCreator(null)
    setReviewCreator(creator)
  }
  const handleCloseReview = () => setReviewCreator(null)

  // Filtered creators with Multi-dimensional Search & Sort
  const filteredCreators = creators.filter((c) => {
    // 1. Category Filter
    const rawCategory = (c.category && typeof c.category === 'object') ? c.category.ar : (c.category || '')
    const matchCategory = selectedCategory === 'الكل' || rawCategory === selectedCategory

    // 2. Wilaya / Location Filter
    const creatorWilaya = c.wilaya || c.location || ''
    const matchWilaya = selectedWilaya === 'all' || creatorWilaya.toLowerCase().includes(selectedWilaya.toLowerCase())

    // 3. Price / Rate Filter
    const rate = Number(c.rate_per_post || c.ratePerPost || 0)
    let matchPrice = true
    if (selectedPriceRange === 'under15k') matchPrice = rate > 0 && rate < 15000
    else if (selectedPriceRange === '15k-30k') matchPrice = rate >= 15000 && rate <= 30000
    else if (selectedPriceRange === '30k-60k') matchPrice = rate > 30000 && rate <= 60000
    else if (selectedPriceRange === 'above60k') matchPrice = rate > 60000

    // 4. Platform Filter
    let matchPlatform = true
    if (selectedPlatform === 'instagram') matchPlatform = Boolean(c.instagram_url || c.followers?.instagram)
    else if (selectedPlatform === 'tiktok') matchPlatform = Boolean(c.tiktok_url || c.followers?.tiktok)
    else if (selectedPlatform === 'youtube') matchPlatform = Boolean(c.youtube_url || c.followers?.youtube)

    // 5. Search Query
    const nameText = getLocalizedItem(c, 'name', language) || c.full_name || ''
    const bioText = getLocalizedItem(c, 'bio', language) || c.bio || ''
    const categoryText = getLocalizedItem(c, 'category', language) || rawCategory
    const matchSearch =
      searchQuery === '' ||
      nameText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bioText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creatorWilaya.toLowerCase().includes(searchQuery.toLowerCase())

    return matchCategory && matchWilaya && matchPrice && matchPlatform && matchSearch
  }).sort((a, b) => {
    const rateA = Number(a.rate_per_post || a.ratePerPost || 0)
    const rateB = Number(b.rate_per_post || b.ratePerPost || 0)
    const nameA = (a.full_name || a.name || '').toLowerCase()
    const nameB = (b.full_name || b.name || '').toLowerCase()

    if (sortBy === 'rate-asc') return rateA - rateB
    if (sortBy === 'rate-desc') return rateB - rateA
    if (sortBy === 'name') return nameA.localeCompare(nameB)
    return 0 // 'featured'
  })

  // Filtered stores
  const filteredStores = stores.filter((s) => {
    const rawSector = (s.sector && typeof s.sector === 'object') ? s.sector.ar : (s.sector || '')
    const matchCategory = selectedCategory === 'الكل' || rawSector === selectedCategory
    const nameText = getLocalizedItem(s, 'name', language) || s.brand_name || ''
    const bioText = getLocalizedItem(s, 'bio', language) || s.bio || ''
    const sectorText = getLocalizedItem(s, 'sector', language) || rawSector
    const locationText = getLocalizedItem(s, 'location', language) || s.wilaya || ''
    const matchSearch =
      searchQuery === '' ||
      nameText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bioText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sectorText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      locationText.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const resetAllFilters = () => {
    setSelectedCategory('الكل')
    setSearchQuery('')
    setSelectedWilaya('all')
    setSelectedPriceRange('all')
    setSelectedPlatform('all')
    setSortBy('featured')
  }

  const hasActiveFilters = 
    selectedCategory !== 'الكل' || 
    searchQuery !== '' || 
    selectedWilaya !== 'all' || 
    selectedPriceRange !== 'all' || 
    selectedPlatform !== 'all' || 
    sortBy !== 'featured'

  const formatFollowers = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ─── Accessible Skip to Main Content Link ─── */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-brand-orange focus:text-white focus:rounded-xl focus:font-bold focus:shadow-xl focus:outline-none"
      >
        {t('skipToContent') || 'تخطي إلى المحتوى الرئيسي'}
      </a>

      {/* ─── Toast Notification ─── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl font-semibold animate-fade-in-down shadow-2xl ${
            toast.type === 'success'
              ? 'bg-emerald-500/90 text-white'
              : 'bg-red-500/90 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ─── Header ─── */}
      {/* Missing Env Variables Warning Banner */}
      {!supabase && (
        <div role="alert" className="bg-red-500 text-white p-4 text-center font-bold text-lg z-50 relative shadow-lg">
          ⚠️ ERROR: ENVIRONMENT VARIABLES MISSING ⚠️<br />
          You must add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your Render/Vercel Dashboard settings and redeploy.
        </div>
      )}

      <Header 
        onOpenAuth={handleOpenAuth} 
        onOpenDashboard={handleOpenDashboard} 
        onOpenCreateCampaign={() => handleOpenDashboard('create', 'brand')}
        onOpenProfileSettings={() => setIsProfileSettingsOpen(true)}
        onOpenContact={() => setIsContactModalOpen(true)}
      />

      {/* ─── Main Content Landmark ─── */}
      <main id="main-content">
        {/* ─── Hero & How It Works — hidden when logged in ─── */}
        {!isLoggedIn && (
          <>
            <Hero 
              onOpenAuth={handleOpenAuth} 
              onOpenDashboard={handleOpenDashboard} 
            />

            {/* ─── Section 2: Direct 3-Step Process ─── */}
            <section aria-labelledby="how-it-works-heading" className="py-20 px-4 border-b border-slate-200/80 relative bg-white">
              <div className="max-w-5xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-50 border border-brand-orange/20 text-brand-orange font-bold text-xs mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>خطوات بسيطة وسريعة</span>
                </div>
                <h2 id="how-it-works-heading" className="text-3xl sm:text-5xl font-black text-brand-navy mb-4 leading-relaxed">
                  {t('howItWorks')} <span className="text-brand-orange">{t('howItWorksHighlight')}</span>
                </h2>
                <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base mb-16 leading-relaxed">
                  {t('howItWorksSub')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-slate-50/80 border border-slate-200/90 p-8 text-center relative group rounded-[36px] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-brand-orange border border-brand-orange/20 text-2xl font-black flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-orange group-hover:text-white group-hover:scale-110 transition-all shadow-sm">
                      1
                    </div>
                    <h3 className="text-xl font-bold text-brand-navy mb-3 tracking-wide">{t('step1Title')}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{t('step1Desc')}</p>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/90 p-8 text-center relative group rounded-[36px] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-brand-orange border border-brand-orange/20 text-2xl font-black flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-orange group-hover:text-white group-hover:scale-110 transition-all shadow-sm">
                      2
                    </div>
                    <h3 className="text-xl font-bold text-brand-navy mb-3 tracking-wide">{t('step2Title')}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{t('step2Desc')}</p>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/90 p-8 text-center relative group rounded-[36px] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-brand-orange border border-brand-orange/20 text-2xl font-black flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-orange group-hover:text-white group-hover:scale-110 transition-all shadow-sm">
                      3
                    </div>
                    <h3 className="text-xl font-bold text-brand-navy mb-3 tracking-wide">{t('step3Title')}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{t('step3Desc')}</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ─── Section 3: Clean Creators & Stores Showcase Grid ─── */}
        <section id="creators" aria-labelledby="showcase-heading" className="py-20 px-4 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto">
            {/* Main Showcase Toggle Tabs (Creators vs Stores) */}
            <div className="flex justify-center mb-10">
              <div role="tablist" aria-label="أقسام المعرض" className="p-1.5 bg-white border border-slate-200/90 rounded-full flex gap-2 shadow-sm">
                <button
                  type="button"
                  role="tab"
                  id="tab-creators"
                  aria-selected={showcaseTab === 'creators'}
                  aria-controls="panel-showcase"
                  onClick={() => setShowcaseTab('creators')}
                  className={`px-6 py-3 rounded-full font-bold text-sm sm:text-base flex items-center gap-2 transition-all ${
                    showcaseTab === 'creators'
                      ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20 scale-105'
                      : 'text-brand-brownLight hover:text-brand-brown'
                  }`}
                >
                  <Sparkles className="w-5 h-5" aria-hidden="true" />
                  <span>{t('tabCreators')}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  id="tab-stores"
                  aria-selected={showcaseTab === 'stores'}
                  aria-controls="panel-showcase"
                  onClick={() => setShowcaseTab('stores')}
                  className={`px-6 py-3 rounded-full font-bold text-sm sm:text-base flex items-center gap-2 transition-all ${
                    showcaseTab === 'stores'
                      ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20 scale-105'
                      : 'text-brand-brownLight hover:text-brand-brown'
                  }`}
                >
                  <Building2 className="w-5 h-5" aria-hidden="true" />
                  <span>{t('tabStores')}</span>
                </button>
              </div>
            </div>

            <div className="mb-10 text-center sm:text-right">
              <h2 id="showcase-heading" className="text-3xl sm:text-4xl font-black text-brand-brown mb-3 tracking-wide">
                {showcaseTab === 'creators' ? t('featuredCreators') : t('featuredStores')}
              </h2>
              <p className="text-brand-brownLight text-sm sm:text-base leading-relaxed">
                {showcaseTab === 'creators' ? t('featuredCreatorsSub') : t('featuredStoresSub')}
              </p>
            </div>

            {/* ─── Search & Category Bar ─── */}
            <div className="bg-white border border-brand-border rounded-[28px] p-5 sm:p-6 mb-8 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Box with Clear Button */}
                <div className="relative flex-1">
                  <label htmlFor="creator-search-input" className="sr-only">
                    {t('searchPlaceholder') || 'البحث عن المبدعين والمتاجر'}
                  </label>
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-brownLight" aria-hidden="true" />
                  <input
                    id="creator-search-input"
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label={t('searchPlaceholder')}
                    className="input-field pr-12 pl-10 w-full text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="مسح نص البحث"
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-brand-brownLight hover:text-brand-brown rounded-full"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

              {/* Advanced Filter Drawer Toggle */}
              <button
                onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
                className={`px-5 py-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  showFiltersDrawer || hasActiveFilters
                    ? 'bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/20'
                    : 'bg-brand-cream text-brand-brown border-brand-border hover:border-brand-orange/40'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>{t('filters')}</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                )}
              </button>

              {/* Reset Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="px-4 py-3 rounded-full text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center justify-center gap-1.5"
                  title={t('clearFilters')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('clearFilters')}</span>
                </button>
              )}
            </div>

            {/* Category Chips Bar */}
            <div role="tablist" aria-label="تصنيفات المحتوى" className="flex gap-2 overflow-x-auto no-scrollbar pt-1 pb-1">
              {CATEGORIES.map((cat) => {
                const categoryLabels = {
                  'الكل': t('catAll'),
                  'تكنولوجيا': t('catTech'),
                  'موضة وأزياء': t('catFashion'),
                  'تجميل وعناية': t('catBeauty'),
                  'طبخ وأكل': t('catFood'),
                  'سفر وسياحة': t('catTravel'),
                  'رياضة ولياقة': t('catFitness')
                };
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border shadow-sm ${
                      isSelected
                        ? 'bg-brand-brown text-white border-brand-brown'
                        : 'bg-white text-brand-brownLight hover:bg-brand-cream hover:text-brand-brown border-brand-border'
                    }`}
                  >
                    {categoryLabels[cat] || cat}
                  </button>
                );
              })}
            </div>

            {/* ─── Expandable Advanced Filter Drawer ─── */}
            {showFiltersDrawer && (
              <div className="pt-4 border-t border-brand-border/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                {/* Filter 1: Wilaya */}
                <div>
                  <label className="block text-[11px] font-bold text-brand-brown mb-1.5">{t('filterByWilaya')}</label>
                  <select
                    value={selectedWilaya}
                    onChange={(e) => setSelectedWilaya(e.target.value)}
                    className="input-field w-full text-xs py-2 bg-white"
                  >
                    <option value="all">{t('allWilayas')}</option>
                    {ALGERIAN_WILAYAS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                {/* Filter 2: Price / Rate */}
                <div>
                  <label className="block text-[11px] font-bold text-brand-brown mb-1.5">{t('filterByPrice')}</label>
                  <select
                    value={selectedPriceRange}
                    onChange={(e) => setSelectedPriceRange(e.target.value)}
                    className="input-field w-full text-xs py-2 bg-white"
                  >
                    <option value="all">{t('allPrices')}</option>
                    <option value="under15k">{t('priceUnder15k')}</option>
                    <option value="15k-30k">{t('price15kTo30k')}</option>
                    <option value="30k-60k">{t('price30kTo60k')}</option>
                    <option value="above60k">{t('priceAbove60k')}</option>
                  </select>
                </div>

                {/* Filter 3: Platform */}
                <div>
                  <label className="block text-[11px] font-bold text-brand-brown mb-1.5">{t('filterByPlatform')}</label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="input-field w-full text-xs py-2 bg-white"
                  >
                    <option value="all">{t('allPlatforms')}</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>

                {/* Filter 4: Sort By */}
                <div>
                  <label className="block text-[11px] font-bold text-brand-brown mb-1.5">{t('sortBy')}</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-field w-full text-xs py-2 bg-white"
                  >
                    <option value="featured">{t('sortFeatured')}</option>
                    <option value="rate-asc">{t('sortRateAsc')}</option>
                    <option value="rate-desc">{t('sortRateDesc')}</option>
                    <option value="name">{t('sortName')}</option>
                  </select>
                </div>
              </div>
            )}
            

          </div>

          {/* Tab 1: Creators Grid */}
          {showcaseTab === 'creators' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCreators.map((creator, index) => {
                const creatorName = getLocalizedItem(creator, 'name', language) || creator.full_name || 'صانع محتوى'
                const creatorAvatar = creator.avatar || creator.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator'
                const creatorWilaya = creator.wilaya || creator.location || 'الجزائر'
                const rate = creator.rate_per_post || creator.ratePerPost || 20000
                const isAboveFold = index < 4;

                return (
                  <div
                    key={creator.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`عرض تفاصيل ${creatorName}`}
                    onClick={() => handleSelectCreator(creator)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectCreator(creator);
                      }
                    }}
                    onMouseEnter={preloadCreatorDetailsModal}
                    onFocus={preloadCreatorDetailsModal}
                    className="bg-white border border-slate-200/90 text-slate-800 hover:-translate-y-1.5 focus-visible:ring-4 focus-visible:ring-brand-orange/40 focus-visible:outline-none rounded-[32px] p-6 sm:p-7 cursor-pointer group flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-2xl relative overflow-hidden hover:border-brand-orange/40"
                  >
                    <div>
                      {/* Top Bar: Avatar + Name + Badges */}
                      <div className="flex items-center gap-3.5 mb-4">
                        <OptimizedImage
                          src={creatorAvatar}
                          fallbackType="creator"
                          seed={creatorName}
                          alt={creatorName}
                          width="56"
                          height="56"
                          loading={isAboveFold ? 'eager' : 'lazy'}
                          fetchPriority={isAboveFold ? 'high' : 'auto'}
                          className="w-14 h-14 rounded-full bg-slate-100 object-cover border-2 border-slate-200 group-hover:scale-105 group-hover:border-brand-orange transition-all shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-brand-navy text-base truncate flex items-center gap-1 group-hover:text-brand-orange transition-colors">
                            <span>{creatorName}</span>
                            {creator.verified && <BadgeCheck className="w-4 h-4 text-brand-orange shrink-0" aria-hidden="true" />}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="truncate font-medium">{getLocalizedItem(creator, 'category', language) || 'مبدع'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 shrink-0">
                              <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                              <span>{creatorWilaya}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4 font-normal">
                        {getLocalizedItem(creator, 'bio', language) || 'صانع محتوى رقمي متألق على منصات التواصل الاجتماعي.'}
                      </p>

                      {/* Social Platforms Row */}
                      <div className="flex items-center gap-2 mb-4">
                        {creator.instagram_url && (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 flex items-center gap-1 border border-slate-200/80">
                            <span>Instagram</span>
                          </span>
                        )}
                        {creator.tiktok_url && (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 flex items-center gap-1 border border-slate-200/80">
                            <span>TikTok</span>
                          </span>
                        )}
                        {creator.youtube_url && (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 flex items-center gap-1 border border-slate-200/80">
                            <span>YouTube</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Pricing & Action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">{t('deliveryStartsAt')}</span>
                        <span className="font-black text-brand-navy text-sm font-mono bg-orange-50 text-brand-orange border border-brand-orange/20 px-2.5 py-0.5 rounded-full">
                          {formatDZD(rate, language)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContactCreator(creator);
                          }}
                          aria-label={`تواصل مع ${creatorName}`}
                          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-brand-navy hover:text-white text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{t('creatorContact')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHireCreator(creator);
                          }}
                          onMouseEnter={preloadCheckoutModal}
                          onFocus={preloadCheckoutModal}
                          aria-label={`توظيف ${creatorName}`}
                          className="btn-primary px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md shadow-brand-orange/25 transition-all hover:scale-105 active:scale-95"
                        >
                          {t('creatorHire')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Stores & Small Businesses Grid */}
          {showcaseTab === 'stores' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStores.map((store, index) => {
                const storeName = getLocalizedItem(store, 'name', language) || store.brand_name || 'متجر';
                const isAboveFold = index < 4;
                return (
                  <div
                    key={store.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`عرض تفاصيل ${storeName}`}
                    onClick={() => setSelectedStore(store)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedStore(store);
                      }
                    }}
                    onMouseEnter={preloadStoreDetailsModal}
                    onFocus={preloadStoreDetailsModal}
                    className="bg-white border border-slate-200/90 hover:-translate-y-1.5 focus-visible:ring-4 focus-visible:ring-brand-orange/40 focus-visible:outline-none rounded-[32px] p-6 sm:p-8 cursor-pointer group flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-2xl hover:border-brand-orange/40"
                  >
                    <div>
                      <div className="flex items-center gap-3.5 mb-4">
                        <OptimizedImage
                          src={store.logo}
                          fallbackType="brand"
                          seed={store.name}
                          alt={storeName}
                          width="64"
                          height="64"
                          loading={isAboveFold ? 'eager' : 'lazy'}
                          fetchPriority={isAboveFold ? 'high' : 'auto'}
                          className="w-16 h-16 rounded-2xl bg-slate-100 object-cover border-2 border-slate-200 group-hover:scale-105 group-hover:border-brand-orange transition-all shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-brand-navy text-lg truncate flex items-center gap-1.5 group-hover:text-brand-orange transition-colors">
                            <span>{storeName}</span>
                            {store.verified && <BadgeCheck className="w-5 h-5 text-brand-orange shrink-0" aria-hidden="true" />}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="font-medium">{getLocalizedItem(store, 'sector', language)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                              <span>{getLocalizedItem(store, 'location', language)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-6 font-normal">
                        {getLocalizedItem(store, 'bio', language)}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">{t('activeCampaignsCount')}</span>
                        <span className="font-bold text-brand-navy text-base">
                          {(store.activeCampaigns || 0)} {language === 'ar' ? ((store.activeCampaigns || 0) === 1 ? 'حملة' : 'حملات') : (language === 'fr' ? 'campagnes' : 'campaigns')}
                        </span>
                      </div>
                      <div className="text-start">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">{t('budgetOffer')}</span>
                        <span className="font-black text-brand-orange text-base font-mono bg-orange-50 border border-brand-orange/20 px-3 py-1 rounded-full">{formatDZD(store.totalBudget || 0, language)}</span>
                      </div>
                    </div>
                  </div>
              );
            })}
          </div>
        )}

          {((showcaseTab === 'creators' && filteredCreators.length === 0) ||
            (showcaseTab === 'stores' && filteredStores.length === 0)) && (
            <div className="text-center py-16 bg-white rounded-[32px] border border-brand-border p-8 shadow-sm">
              <Search className="w-12 h-12 text-brand-brownLight/40 mx-auto mb-3" />
              <h4 className="font-bold text-brand-brown text-lg mb-1">{t('noResults')}</h4>
              <p className="text-brand-brownLight text-xs mb-4 max-w-md mx-auto">{t('noCreatorsMatch')}</p>
              <button
                onClick={resetAllFilters}
                className="btn-primary text-xs px-6 py-2.5 rounded-full inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('clearFilters')}</span>
              </button>
            </div>
          )}
        </div>
      </section>
      </main>

      {/* ─── Footer ─── */}
      <Footer 
        onLinkClick={(tab) => {
          if (!isLoggedIn) {
            handleOpenAuth('login');
          } else {
            setShowcaseTab(tab);
            setTimeout(() => {
              const el = document.getElementById('creators');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }}
        onOpenContact={() => setIsContactModalOpen(true)}
      />

      {/* ─── Lazy Loaded Modals with Seamless Feedback ─── */}
      <Suspense fallback={<ModalLoadingFallback />}>
        <AuthModal
          isOpen={authModal.open}
          onClose={handleCloseAuth}
          initialMode={authModal.mode}
          initialRole={authModal.role}
        />

        {/* ─── Dashboard & Messages Modals ─── */}
        {dashboardState.open && (
          dashboardState.tab === 'admin' && canAccessAdmin(user) ? (
            <AdminDashboardModal
              isOpen={dashboardState.open}
              onClose={handleCloseDashboard}
            />
          ) : (dashboardState.type === 'brand' || (user?.role === 'brand' && dashboardState.type !== 'creator')) ? (
            <BrandDashboardModal
              isOpen={dashboardState.open}
              onClose={handleCloseDashboard}
              initialTab={dashboardState.tab}
              initialContactId={dashboardState.contactId}
              onHireCreator={handleHireCreator}
            />
          ) : (
            <CreatorDashboardModal
              isOpen={dashboardState.open}
              onClose={handleCloseDashboard}
              initialTab={dashboardState.tab}
              initialContactId={dashboardState.contactId}
            />
          )
        )}
        <CreatorDetailsModal
          isOpen={!!selectedCreator}
          onClose={handleCloseCreator}
          creator={selectedCreator}
          onHire={handleHireCreator}
          onContact={handleContactCreator}
        />
        <StoreDetailsModal
          isOpen={!!selectedStore}
          onClose={() => setSelectedStore(null)}
          store={selectedStore}
          onApplyCampaign={(campaign) => {
            if (!isLoggedIn) {
              setSelectedStore(null);
              handleOpenAuth('signup', 'creator');
            } else if (!canApplyToCampaign(user)) {
              setToast({ type: 'error', message: t('onlyCreatorsCanApply') || 'فقط صناع المحتوى يمكنهم التقديم على الحملات' });
            } else {
              setSelectedStore(null);
              setSelectedCampaignToApply(campaign);
            }
          }}
        />
        <CampaignApplyModal
          isOpen={!!selectedCampaignToApply}
          onClose={() => setSelectedCampaignToApply(null)}
          campaign={selectedCampaignToApply}
          onSuccess={() => {
            setToast({ type: 'success', message: t('applicationSuccess') || 'تم إرسال طلب التقديم بنجاح! 🎉' });
            handleOpenDashboard('opportunities');
          }}
        />
        <CheckoutModal
          isOpen={!!checkoutData}
          onClose={handleCloseCheckout}
          creator={checkoutData?.creator}
          campaign={checkoutData?.campaign}
          applicationId={checkoutData?.applicationId}
        />
        <ReviewModal
          isOpen={!!reviewCreator}
          onClose={handleCloseReview}
          creator={reviewCreator}
        />
        <ProfileSettingsModal 
          isOpen={isProfileSettingsOpen} 
          onClose={() => setIsProfileSettingsOpen(false)}
          isMandatory={isProfileMandatory}
        />
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
        />

        {/* Floating Messenger Quick-Access Button for Logged-In Users */}
        {isLoggedIn && user && (
          <button
            type="button"
            onClick={() => handleOpenDashboard('messages', user.role === 'brand' ? 'brand' : 'creator')}
            aria-label="فتح الرسائل والمحادثات"
            title="الرسائل والمحادثات المباشرة"
            className="fixed bottom-6 rtl:left-6 ltr:right-6 z-40 bg-gradient-to-r from-brand-orange to-amber-600 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl hover:shadow-brand-orange/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border-2 border-white/20 group"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-white animate-bounce-subtle" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white" />
            </div>
            <span className="font-bold text-sm hidden sm:inline">الرسائل والمحادثات</span>
          </button>
        )}
      </Suspense>
    </div>
  )
}
export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  )
}
