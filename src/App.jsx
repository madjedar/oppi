import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth, AuthProvider } from './context/AuthContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import { supabase } from './lib/supabase'
import { getLocalizedItem, getLocalizedCategory, getLocalizedWilaya, CATEGORIES_MAP } from './utils/localized'
import { formatDZD } from './services/chargilyService'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Hero from './components/Hero'
import CreatorFilters from './components/CreatorFilters'
import CampaignFilters from './components/CampaignFilters'
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
  'all',
  'tech',
  'fashion',
  'beauty',
  'food',
  'travel',
  'fitness'
];

import { isAdmin, isBrand, isCreator, canApplyToCampaign, canHireCreator, canAccessAdmin, canViewCreatorDirectory, canViewCampaignDirectory, canViewCreatorProfile } from './utils/authGuards'
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
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState('all')
  const [selectedPriceRange, setSelectedPriceRange] = useState('all')
  const [selectedFollowerRange, setSelectedFollowerRange] = useState('all')
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [sortBy, setSortBy] = useState('featured')
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false)
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('')
  const [campaignCategory, setCampaignCategory] = useState('all')
  const [campaignWilaya, setCampaignWilaya] = useState('all')
  const [campaignBudgetRange, setCampaignBudgetRange] = useState('all')
  const [campaignDeliverable, setCampaignDeliverable] = useState('all')
  const [showCampaignFilters, setShowCampaignFilters] = useState(false)

  // Database State
  const [creators, setCreators] = useState([])
  const [stores, setStores] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  // Fetch real data on mount
  useEffect(() => {
    import('./services/dbService').then(({ getStoreProfiles, getCreatorProfiles, getCampaigns }) => {
      Promise.all([getStoreProfiles(), getCreatorProfiles(), getCampaigns()])
        .then(([fetchedStores, fetchedCreators, fetchedCampaigns]) => {
          setStores(fetchedStores);
          setCreators(fetchedCreators);
          setCampaigns(fetchedCampaigns);
          setLoadingData(false);
        })
        .catch(err => {
          console.error("Error fetching from DB:", err);
          setStores([]);
          setCreators([]);
          setCampaigns([]);
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
    } else if (user?.role === 'brand' || user?.role === 'admin') {
      setShowcaseTab('creators');
    }
  }, [user?.role]);

  useEffect(() => {
    if (!canViewCreatorDirectory(user) && showcaseTab === 'creators') setShowcaseTab('stores');
    if (!canViewCampaignDirectory(user) && showcaseTab !== 'creators') setShowcaseTab('creators');
  }, [user, showcaseTab]);

  // Handlers
  const handleOpenAuth = (mode = 'login', role = 'creator') => setAuthModal({ open: true, mode, role })
  const isCategoryMatch = (itemCat, selected) => {
    if (!selected || selected === 'all' || selected === t('catAll')) return true;
    if (!itemCat) return false;
    const lowerSel = selected.toLowerCase();
    const catStr = (typeof itemCat === 'object' ? (itemCat.en || itemCat.ar || '') : itemCat).toLowerCase();
    if (catStr === lowerSel) return true;
    const mapped = CATEGORIES_MAP[catStr] || CATEGORIES_MAP[itemCat];
    if (mapped) {
      if (mapped.en.toLowerCase() === lowerSel || mapped.ar === selected || mapped.fr.toLowerCase() === lowerSel) return true;
    }
    const selObj = CATEGORIES_MAP[selected];
    if (selObj) {
      if (itemCat === selObj.ar || itemCat === selObj.en || itemCat === selObj.fr) return true;
    }
    return false;
  };

  const isWilayaMatch = (itemLoc, selected) => {
    if (!selected || selected === 'all' || selected === t('allWilayas')) return true;
    if (!itemLoc) return false;
    const locStr = String(itemLoc).toLowerCase();
    const selStr = String(selected).toLowerCase();
    const locLocalized = getLocalizedWilaya(itemLoc, language).toLowerCase();
    return locStr.includes(selStr) || selStr.includes(locStr) || locLocalized.includes(selStr) || selStr.includes(locLocalized);
  };

  const handleCloseAuth = () => setAuthModal({ open: false, mode: 'login', role: 'creator' })
  const handleOpenDashboard = (tab = 'overview', type = null, contactId = null) => {
    if (tab === 'admin' && !canAccessAdmin(user)) {
      setToast({ type: 'error', message: t('adminOnlyAccess') });
      return;
    }
    const resolvedType = type || (tab === 'create' || user?.role === 'brand' ? 'brand' : 'creator');
    setDashboardState({ open: true, tab, type: resolvedType, contactId });
  }
  const handleCloseDashboard = () => setDashboardState({ open: false, tab: 'overview', type: 'creator', contactId: null })
  const handleSelectCreator = (creator) => {
    if (canViewCreatorProfile(user, creator?.id)) setSelectedCreator(creator);
  }
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
      setToast({ type: 'info', message: t('loginAsStoreToContact') });
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
            message: `${t('chatOpenedWith')} ${targetCreator.name || targetCreator.full_name || t('defaultCreatorName')}`
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
        message: t('paymentSuccessToast')
      });

      if (pendingDetails?.creatorId) {
        handleOpenDashboard('messages', 'brand', pendingDetails.creatorId);
      }
    } else if (paymentStatus === 'failed') {
      setToast({
        type: 'error',
        message: t('paymentFailedToast')
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
      setToast({ type: 'error', message: t('onlyStoresCanHire') });
      return;
    }
    const creatorRate = Number(creator.ratePerPost || creator.rate_per_post || 0);
    setCheckoutData({
      creator,
      applicationId,
      campaign: {
        title: `${t('dealWith')} ${creator.name || creator.full_name || t('defaultCreatorName')}`,
        budget: creatorRate > 0 ? creatorRate : 10000,
        deliverables: ['post', 'story', 'review'],
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
    const matchCategory = isCategoryMatch(c.category, selectedCategory)

    // 2. Wilaya / Location Filter
    const creatorWilaya = c.wilaya || c.location || ''
    const matchWilaya = isWilayaMatch(creatorWilaya, selectedWilaya)

    // 3. Price / Rate Filter
    const rate = Number(c.rate_per_post || c.ratePerPost || 0)
    let matchPrice = true
    if (selectedPriceRange === 'under15k') matchPrice = rate > 0 && rate < 15000
    else if (selectedPriceRange === '15k-30k') matchPrice = rate >= 15000 && rate <= 30000
    else if (selectedPriceRange === '30k-60k') matchPrice = rate > 30000 && rate <= 60000
    else if (selectedPriceRange === 'above60k') matchPrice = rate > 60000

    const followers = Object.values(c.followers || {}).reduce((total, value) => total + (Number(value) || 0), 0) ||
      Number(c.total_followers || c.followers_count || 0)
    let matchFollowers = true
    if (selectedFollowerRange === 'under50k') matchFollowers = followers > 0 && followers < 50000
    else if (selectedFollowerRange === '50k-250k') matchFollowers = followers >= 50000 && followers <= 250000
    else if (selectedFollowerRange === '250k-1m') matchFollowers = followers > 250000 && followers <= 1000000
    else if (selectedFollowerRange === 'above1m') matchFollowers = followers > 1000000

    // 4. Platform Filter
    let matchPlatform = true
    if (selectedPlatform === 'instagram') matchPlatform = Boolean(c.instagram_url || c.followers?.instagram)
    else if (selectedPlatform === 'tiktok') matchPlatform = Boolean(c.tiktok_url || c.followers?.tiktok)
    else if (selectedPlatform === 'youtube') matchPlatform = Boolean(c.youtube_url || c.followers?.youtube)

    // 5. Search Query
    const nameText = getLocalizedItem(c, 'name', language) || c.full_name || ''
    const bioText = getLocalizedItem(c, 'bio', language) || c.bio || ''
    const rawCategory = (c.category && typeof c.category === 'object') ? c.category.ar : (c.category || '')
    const categoryText = getLocalizedItem(c, 'category', language) || rawCategory
    const matchSearch =
      searchQuery === '' ||
      nameText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bioText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creatorWilaya.toLowerCase().includes(searchQuery.toLowerCase())

    return matchCategory && matchWilaya && matchPrice && matchFollowers && matchPlatform && matchSearch
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

  // Filtered stores and campaigns for creator accounts.
  const filteredStores = stores.filter((s) => {
    const rawSector = (s.sector && typeof s.sector === 'object') ? s.sector.ar : (s.sector || '')
    const matchCategory = isCategoryMatch(s.sector, campaignCategory)
    const nameText = getLocalizedItem(s, 'name', language) || s.brand_name || ''
    const bioText = getLocalizedItem(s, 'bio', language) || s.bio || ''
    const sectorText = getLocalizedItem(s, 'sector', language) || rawSector
    const locationText = getLocalizedItem(s, 'location', language) || s.wilaya || ''
    const matchSearch =
      campaignSearchQuery === '' ||
      nameText.toLowerCase().includes(campaignSearchQuery.toLowerCase()) ||
      bioText.toLowerCase().includes(campaignSearchQuery.toLowerCase()) ||
      sectorText.toLowerCase().includes(campaignSearchQuery.toLowerCase()) ||
      locationText.toLowerCase().includes(campaignSearchQuery.toLowerCase())
    return matchCategory && isWilayaMatch(locationText, campaignWilaya) && matchSearch
  })

  const filteredCampaigns = campaigns.filter((campaign) => {
    const budget = Number(campaign.budget) || 0
    const campaignCategoryValue = campaign.category || campaign.sector
    const campaignLocation = campaign.wilaya || campaign.location || campaign.brand?.wilaya || campaign.brand?.location || ''
    const deliverables = campaign.deliverables?.[language] || campaign.deliverables?.ar || campaign.deliverables || []
    const deliverableText = (Array.isArray(deliverables) ? deliverables : [deliverables]).join(' ').toLowerCase()
    const title = getLocalizedItem(campaign, 'title', language) || ''
    const description = getLocalizedItem(campaign, 'description', language) || ''
    const brandName = campaign.brand?.brand_name || campaign.brand?.full_name || campaign.brand_name || ''
    let matchBudget = true
    if (campaignBudgetRange === 'under30k') matchBudget = budget > 0 && budget < 30000
    else if (campaignBudgetRange === '30k-75k') matchBudget = budget >= 30000 && budget <= 75000
    else if (campaignBudgetRange === 'above75k') matchBudget = budget > 75000
    const matchDeliverable = campaignDeliverable === 'all' || deliverableText.includes(campaignDeliverable)
    const normalizedSearch = campaignSearchQuery.toLowerCase()
    return isCategoryMatch(campaignCategoryValue, campaignCategory) &&
      isWilayaMatch(campaignLocation, campaignWilaya) &&
      matchBudget &&
      matchDeliverable &&
      (!normalizedSearch || `${title} ${description} ${brandName} ${campaignLocation}`.toLowerCase().includes(normalizedSearch))
  })

  const resetAllFilters = () => {
    setSelectedCategory('all')
    setSearchQuery('')
    setSelectedWilaya('all')
    setSelectedPriceRange('all')
    setSelectedFollowerRange('all')
    setSelectedPlatform('all')
    setSortBy('featured')
    setCampaignSearchQuery('')
    setCampaignCategory('all')
    setCampaignWilaya('all')
    setCampaignBudgetRange('all')
    setCampaignDeliverable('all')
  }

  const hasActiveFilters = 
    selectedCategory !== 'all' ||
    searchQuery !== '' || 
    selectedWilaya !== 'all' || 
    selectedPriceRange !== 'all' || 
    selectedFollowerRange !== 'all' ||
    selectedPlatform !== 'all' || 
    sortBy !== 'featured'

  const formatFollowers = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
    return num.toString()
  }

  return (
    <div className={`min-h-screen bg-[#F8FAFC] ${isLoggedIn ? 'pb-24 md:pb-0' : ''}`}>
      {/* ─── Accessible Skip to Main Content Link ─── */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-brand-orange focus:text-white focus:rounded-xl focus:font-bold focus:shadow-xl focus:outline-none"
      >
        {t('skipToContent')}
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
        {!isLoggedIn ? (
          /* ─── VISITOR LANDING: Only website description & login/signup CTAs ─── */
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
                  <span>{t('howItWorksBadge')}</span>
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

            {/* ─── Conversion & Value Call-to-Action ─── */}
            <section className="py-20 px-4 bg-gradient-to-b from-white to-slate-100/70 border-b border-slate-200/80 text-center relative">
              <div className="max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs mb-5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{t('ctaTrustBadge')}</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-brand-navy mb-5 leading-tight">
                  {t('ctaTitle')}
                </h2>
                <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
                  {t('ctaSub')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={() => handleOpenAuth('signup', 'brand')}
                    className="btn-primary px-8 py-4 rounded-2xl font-bold text-base shadow-xl shadow-brand-orange/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 w-full sm:w-auto justify-center"
                  >
                    <Building2 className="w-5 h-5" />
                    <span>{t('joinBrand')}</span>
                  </button>
                  <button
                    onClick={() => handleOpenAuth('signup', 'creator')}
                    className="px-8 py-4 rounded-2xl font-bold text-base bg-brand-navy hover:bg-brand-navyDark text-white transition-all hover:scale-105 active:scale-95 flex items-center gap-2.5 w-full sm:w-auto justify-center shadow-lg"
                  >
                    <Sparkles className="w-5 h-5 text-brand-orange" />
                    <span>{t('joinCreator')}</span>
                  </button>
                  <button
                    onClick={() => handleOpenAuth('login')}
                    className="px-8 py-4 rounded-2xl font-bold text-base bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition-all w-full sm:w-auto"
                  >
                    <span>{t('login')}</span>
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* ─── LOGGED IN APPLICATION: Full Marketplace Showcase ─── */
          <>
            {/* ─── Section 3: Clean Creators & Stores Showcase Grid ─── */}
            <section id="creators" aria-labelledby="showcase-heading" className="py-20 px-4 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto">
            {/* Role-scoped marketplace tabs */}
            <div className="flex justify-center mb-10">
              <div role="tablist" aria-label={t('gallerySections')} className="p-1.5 bg-white border border-slate-200/90 rounded-full flex gap-2 shadow-sm">
                {canViewCreatorDirectory(user) && <button
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
                </button>}

                {canViewCampaignDirectory(user) && <button
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
                </button>}
              </div>
            </div>

            <div className={`mb-10 text-center ${language === 'ar' ? 'sm:text-right' : 'sm:text-left'}`}>
              <h2 id="showcase-heading" className="text-3xl sm:text-4xl font-black text-brand-brown mb-3 tracking-wide">
                {showcaseTab === 'creators' ? t('featuredCreators') : t('featuredStores')}
              </h2>
              <p className="text-brand-brownLight text-sm sm:text-base leading-relaxed">
                {showcaseTab === 'creators' ? t('featuredCreatorsSub') : t('featuredStoresSub')}
              </p>
            </div>

            {showcaseTab === 'creators' ? (
              <CreatorFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedWilaya={selectedWilaya}
                onWilayaChange={setSelectedWilaya}
                selectedPriceRange={selectedPriceRange}
                onPriceRangeChange={setSelectedPriceRange}
                selectedFollowerRange={selectedFollowerRange}
                onFollowerRangeChange={setSelectedFollowerRange}
                selectedPlatform={selectedPlatform}
                onPlatformChange={setSelectedPlatform}
                sortBy={sortBy}
                onSortChange={setSortBy}
                showFilters={showFiltersDrawer}
                onToggleFilters={() => setShowFiltersDrawer(!showFiltersDrawer)}
                onReset={resetAllFilters}
                hasActiveFilters={hasActiveFilters}
                categories={CATEGORIES}
              />
            ) : (
              <CampaignFilters
                searchQuery={campaignSearchQuery}
                onSearchChange={setCampaignSearchQuery}
                selectedCategory={campaignCategory}
                onCategoryChange={setCampaignCategory}
                selectedWilaya={campaignWilaya}
                onWilayaChange={setCampaignWilaya}
                selectedBudgetRange={campaignBudgetRange}
                onBudgetRangeChange={setCampaignBudgetRange}
                selectedDeliverable={campaignDeliverable}
                onDeliverableChange={setCampaignDeliverable}
                showFilters={showCampaignFilters}
                onToggleFilters={() => setShowCampaignFilters(!showCampaignFilters)}
                onReset={resetAllFilters}
                hasActiveFilters={Boolean(campaignSearchQuery || campaignCategory !== 'all' || campaignWilaya !== 'all' || campaignBudgetRange !== 'all' || campaignDeliverable !== 'all')}
                categories={CATEGORIES}
              />
            )}
          {/* Tab 1: Creators Grid */}
          {showcaseTab === 'creators' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCreators.map((creator, index) => {
                const creatorName = getLocalizedItem(creator, 'name', language) || creator.full_name || t('defaultCreatorName')
                const creatorAvatar = creator.avatar || creator.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator'
                const creatorWilaya = getLocalizedWilaya(creator.wilaya || creator.location, language)
                const rate = Number(creator.rate_per_post || creator.ratePerPost || 0)
                const isAboveFold = index < 4;

                return (
                  <div
                    key={creator.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`${t('viewDetailsOf')} ${creatorName}`}
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
                            <span className="truncate font-medium">{getLocalizedCategory(creator.category, language) || t('creator')}</span>
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
                        {getLocalizedItem(creator, 'bio', language) || t('defaultBio')}
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
                        {rate > 0 ? (
                          <span className="font-black text-brand-navy text-sm font-mono bg-orange-50 text-brand-orange border border-brand-orange/20 px-2.5 py-0.5 rounded-full">
                            {formatDZD(rate, language)}
                          </span>
                        ) : (
                          <span className="font-bold text-slate-600 text-xs bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            {t('negotiablePerCampaign')}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContactCreator(creator);
                          }}
                          aria-label={`${t('creatorContact')} ${creatorName}`}
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
                          aria-label={`${t('creatorHire')} ${creatorName}`}
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

          {/* Creator marketplace: campaigns and store profiles */}
          {showcaseTab === 'stores' && (
            <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {filteredCampaigns.map((campaign) => {
                const campaignTitle = getLocalizedItem(campaign, 'title', language) || t('defaultCampaignTitle')
                const campaignDescription = getLocalizedItem(campaign, 'description', language)
                const deliverables = campaign.deliverables?.[language] || campaign.deliverables?.ar || campaign.deliverables || []
                const brandName = campaign.brand?.brand_name || campaign.brand?.full_name || campaign.brand_name || t('defaultStoreName')
                return (
                  <article key={`campaign-${campaign.id}`} className="bg-white border border-brand-orange/20 rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-brand-orange font-black">{t('campaignOpportunity')}</span>
                        <h3 className="font-bold text-brand-navy text-lg mt-1">{campaignTitle}</h3>
                      </div>
                      <span className="font-black text-brand-orange bg-orange-50 border border-brand-orange/20 px-3 py-1 rounded-full whitespace-nowrap">{formatDZD(campaign.budget || 0, language)}</span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed mb-4">{campaignDescription}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                      <span>{brandName}</span>
                      <span>{getLocalizedWilaya(campaign.wilaya || campaign.location || campaign.brand?.wilaya, language)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {(Array.isArray(deliverables) ? deliverables : [deliverables]).slice(0, 3).map((deliverable, index) => <span key={index} className="px-2.5 py-1 rounded-md bg-brand-cream text-brand-brownLight text-[11px] border border-brand-border">{deliverable}</span>)}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (canApplyToCampaign(user)) setSelectedCampaignToApply(campaign)
                        else setToast({ type: 'error', message: t('onlyCreatorsCanApplyMsg') })
                      }}
                      className="btn-primary w-full min-h-[46px] mt-auto"
                    >
                      {t('applyNow')}
                    </button>
                  </article>
                )
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStores.map((store, index) => {
                const storeName = getLocalizedItem(store, 'name', language) || store.brand_name || t('defaultStoreName');
                const isAboveFold = index < 4;
                return (
                  <div
                    key={store.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`${t('viewDetailsOf')} ${storeName}`}
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
                            <span className="font-medium">{getLocalizedCategory(store.sector, language) || getLocalizedItem(store, 'sector', language)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                              <span>{getLocalizedWilaya(store.location || store.wilaya, language)}</span>
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
                          {(store.activeCampaigns || 0)} {t('campaignsPlural')}
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
            </div>
        )}

        {((showcaseTab === 'creators' && filteredCreators.length === 0) ||
          (showcaseTab === 'stores' && filteredStores.length === 0 && filteredCampaigns.length === 0)) && (
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
          </>
        )}
      </main>

      {/* ─── Footer ─── */}
      <Footer 
        onLinkClick={(tab) => {
          if (!isLoggedIn) {
            handleOpenAuth('login');
          } else {
            const nextTab = tab === 'creators' && !canViewCreatorDirectory(user) ? 'stores' : tab;
            setShowcaseTab(nextTab);
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
          user={user}
          onHire={handleHireCreator}
          onContact={handleContactCreator}
        />
        <StoreDetailsModal
          isOpen={!!selectedStore}
          onClose={() => setSelectedStore(null)}
          store={selectedStore}
          user={user}
          onApplyCampaign={(campaign) => {
            if (!isLoggedIn) {
              setSelectedStore(null);
              handleOpenAuth('signup', 'creator');
            } else if (!canApplyToCampaign(user)) {
              setToast({ type: 'error', message: t('onlyCreatorsCanApplyMsg') });
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
            setToast({ type: 'success', message: t('applicationSuccess') });
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

        {/* Desktop-Only Floating Messenger Quick-Access Button for Logged-In Users */}
        {isLoggedIn && user && (
          <button
            type="button"
            onClick={() => handleOpenDashboard('messages', user.role === 'brand' ? 'brand' : 'creator')}
            aria-label={t('navMessages')}
            title={t('navMessages')}
            className="hidden md:flex fixed bottom-6 start-6 z-40 bg-gradient-to-r from-brand-orange to-amber-600 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl hover:shadow-brand-orange/40 hover:scale-105 active:scale-95 transition-all items-center gap-2 border-2 border-white/20 group"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-white animate-bounce-subtle" />
              <span className="absolute -top-1 -end-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white" />
            </div>
            <span className="font-bold text-sm hidden sm:inline">{t('navMessages')}</span>
          </button>
        )}

        {/* Dedicated Mobile Sticky Bottom Navigation (only when logged in) */}
        {isLoggedIn && (
          <BottomNav
            user={user}
            currentTab={dashboardState.open ? dashboardState.tab : showcaseTab}
            onSelectTab={(tab) => {
              const nextTab = tab === 'creators' && !canViewCreatorDirectory(user) ? 'stores' : tab;
              setShowcaseTab(nextTab);
              const el = document.getElementById('creators') || document.getElementById('main-content');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onOpenDashboard={handleOpenDashboard}
            onOpenAuth={handleOpenAuth}
          />
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
