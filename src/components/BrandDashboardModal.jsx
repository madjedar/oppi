import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, LayoutDashboard, PlusCircle, Users, CreditCard, 
  Building2, TrendingUp, DollarSign, Lock, ShieldCheck, CheckCircle2, 
  Search, Filter, Star, BadgeCheck, User, Globe, Phone, MapPin, 
  MessageSquare, SendHorizontal, Edit3, Trash2, PauseCircle, PlayCircle, 
  Eye, AlertCircle, Sparkles, ExternalLink, Clock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getLocalizedCategory, getLocalizedStatus, getLocalizedWilaya, CATEGORIES_MAP } from '../utils/localized';
import { formatDZD, calculateFees } from '../services/chargilyService';
import { validateCampaignForm, validateChatMessage, validateAlgerianPhone, validateUrl, sanitizeText, safeHref } from '../utils/validators';
import OptimizedImage from './OptimizedImage';

export default function BrandDashboardModal({ 
  isOpen, 
  onClose, 
  onHireCreator, 
  initialTab = 'overview', 
  initialContactId = null 
}) {
  const { user, updateProfileData } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Data States
  const [applications, setApplications] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [allCreators, setAllCreators] = useState([]);
  const [activeCampaignFilter, setActiveCampaignFilter] = useState('all');

  // Review Modal State
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    creatorId: null,
    creatorName: '',
    rating: 5,
    reviewText: '',
    submitting: false,
    success: false
  });

  // Edit Campaign State
  const [editingCampaignId, setEditingCampaignId] = useState(null);

  // New / Edit Campaign Form State
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    category: 'tech',
    budget: '',
    description: '',
    deliverables: 'Instagram Post, Instagram Story, Instagram Reel',
    deadline: ''
  });
  const [campaignSuccessMsg, setCampaignSuccessMsg] = useState('');
  const [campaignErrorMsg, setCampaignErrorMsg] = useState('');

  // Brand Profile State
  const [profileData, setProfileData] = useState({
    brandName: user?.profile?.brand_name || user?.profile?.full_name || user?.user_metadata?.full_name || '',
    sector: user?.profile?.sector || 'ecommerce',
    bio: user?.profile?.bio || '',
    websiteUrl: user?.profile?.website_url || '',
    phone: user?.profile?.phone || '',
    wilaya: user?.profile?.wilaya || '16',
    rcNumber: user?.profile?.rc_number || ''
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Search & Filters for Creators Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Chat State
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeContactProfile, setActiveContactProfile] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState(initialContactId);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef(null);

  // Load Data
  const loadDashboardData = async () => {
    if (!user?.id) return;
    setLoadingData(true);
    try {
      const { getBrandApplications, getCampaigns, getCreators, getUserConversations } = await import('../services/dbService');
      const [apps, allCamps, creators, convos] = await Promise.all([
        getBrandApplications(user.id).catch(() => []),
        getCampaigns(true).catch(() => []),
        getCreators().catch(() => []),
        getUserConversations(user.id).catch(() => [])
      ]);
      
      setApplications(apps || []);
      const brandIdentifiers = [
        user.id,
        user.profile?.id,
        user.profile?.brand_name,
        user.profile?.full_name,
        user.user_metadata?.brand_name,
        user.user_metadata?.full_name,
        profileData.brandName
      ].filter(Boolean).map(x => String(x).trim().toLowerCase());

      const myCampaigns = (allCamps || []).filter(c => {
        if (c.brand_id && (c.brand_id === user.id || c.brand_id === user.profile?.id)) return true;
        const cBrand = (c.brand?.brand_name || c.brand?.full_name || c.brand_name || '').toLowerCase();
        return cBrand && brandIdentifiers.some(id => id.includes(cBrand) || cBrand.includes(id));
      });
      setCampaigns(myCampaigns);
      setAllCreators(creators || []);
      setConversations(convos || []);
    } catch (err) {
      console.error('Error loading brand dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      loadDashboardData();
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialContactId) {
      setSelectedContactId(initialContactId);
      setActiveTab('messages');
      // Fetch profile if not already available in creators or conversations
      import('../services/dbService').then(({ getProfileById }) => {
        getProfileById(initialContactId).then(prof => {
          if (prof) setActiveContactProfile(prof);
        }).catch(err => console.warn('Could not fetch active contact profile:', err));
      });
    }
  }, [initialContactId]);

  useEffect(() => {
    if (user?.profile) {
      setProfileData({
        brandName: user.profile.brand_name || user.profile.full_name || '',
        sector: user.profile.sector || 'ecommerce',
        bio: user.profile.bio || '',
        websiteUrl: user.profile.website_url || '',
        phone: user.profile.phone || '',
        wilaya: user.profile.wilaya || '16',
        rcNumber: user.profile.rc_number || ''
      });
    }
  }, [user?.profile]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Chat real-time subscriptions
  useEffect(() => {
    let subscription;
    let isMounted = true;
    if (activeTab === 'messages' && selectedContactId && user?.id) {
      import('../services/dbService').then(({ getMessages, subscribeToMessages, getUserConversations }) => {
        if (!isMounted) return;
        getMessages(user.id, selectedContactId).then(fetchedMessages => {
          if (isMounted) setMessages(fetchedMessages || []);
        });
        subscription = subscribeToMessages(user.id, (newMsg) => {
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === selectedContactId) ||
            (newMsg.sender_id === selectedContactId && newMsg.receiver_id === user.id)
          ) {
            if (isMounted) {
              setMessages(prev => {
                // Deduplicate: replace matching optimistic message or skip if already present
                const isDuplicate = prev.some(m => m.id === newMsg.id);
                if (isDuplicate) return prev;
                // Replace optimistic message with real one
                const hasOptimistic = prev.some(
                  m => m.id?.startsWith('optimistic_') && m.sender_id === newMsg.sender_id && m.text === newMsg.text
                );
                if (hasOptimistic) {
                  return prev.map(m =>
                    m.id?.startsWith('optimistic_') && m.sender_id === newMsg.sender_id && m.text === newMsg.text
                      ? newMsg : m
                  );
                }
                return [...prev, newMsg];
              });
            }
          }

          // Always update conversation preview or refresh conversations
          const partnerId = newMsg.sender_id === user.id ? newMsg.receiver_id : newMsg.sender_id;
          if (isMounted && partnerId) {
            setConversations(prev => {
              const existingIdx = prev.findIndex(c => c.id === partnerId);
              if (existingIdx !== -1) {
                const updated = [...prev];
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  lastMessage: newMsg.text,
                  lastMessageAt: newMsg.created_at
                };
                return updated;
              } else {
                getUserConversations(user.id).then(fresh => {
                  if (isMounted) setConversations(fresh || []);
                });
                return prev;
              }
            });
          }
        });
      });
    }
    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [activeTab, selectedContactId, user?.id]);

  // ─── Dynamic Metrics Calculations ───
  const activeCampaignsList = campaigns.filter(c => c.status !== 'completed' && c.status !== 'paused');
  const hiredApplications = applications.filter(app => app.status === 'approved' || app.status === 'completed');
  const pendingApplications = applications.filter(app => app.status === 'pending');
  const inEscrowApplications = applications.filter(app => app.status === 'approved' || app.status === 'submitted');
  const completedApplications = applications.filter(app => app.status === 'completed');

  const totalCampaignsBudget = campaigns.reduce((acc, c) => acc + (Number(c.budget) || 0), 0);
  const totalHiredBudget = hiredApplications.reduce((acc, app) => acc + (Number(app.campaign?.budget) || 0), 0);
  const totalInvestedBudget = totalHiredBudget > 0 ? totalHiredBudget : totalCampaignsBudget;
  const escrowHeldAmount = inEscrowApplications.reduce((acc, app) => acc + (Number(app.campaign?.budget) || 0), 0);
  const escrowReleasedAmount = completedApplications.reduce((acc, app) => acc + (Number(app.campaign?.budget) || 0), 0);
  const uniqueHiredCreatorsCount = new Set(hiredApplications.map(app => app.creator_id)).size;

  // ─── Campaign CRUD Handlers ───
  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    setCampaignErrorMsg('');
    setCampaignSuccessMsg('');

    const validation = validateCampaignForm(campaignForm);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setCampaignErrorMsg(firstError);
      return;
    }

    try {
      const { createCampaign, updateCampaign } = await import('../services/dbService');
      
      const sanitizedTitle = sanitizeText(campaignForm.title, 100);
      const sanitizedDesc = sanitizeText(campaignForm.description, 2000);
      const budgetNum = Number(campaignForm.budget);

      if (editingCampaignId) {
        // Update Existing Campaign
        await updateCampaign(editingCampaignId, {
          title: sanitizedTitle,
          category: campaignForm.category,
          budget: budgetNum,
          description: sanitizedDesc,
          deliverables: campaignForm.deliverables,
          deadline: campaignForm.deadline || null
        });

        setCampaigns(prev => prev.map(c => 
          c.id === editingCampaignId ? { ...c, ...campaignForm, title: sanitizedTitle, description: sanitizedDesc, budget: budgetNum } : c
        ));
        setCampaignSuccessMsg(t('updateCampaignSuccess'));
      } else {
        // Create New Campaign
        const brandId = user?.id || user?.profile?.id || '196f2255-a271-4ba3-9f8b-8c71a586acb4';
        const res = await createCampaign({
          brand_id: brandId,
          title: sanitizedTitle,
          category: campaignForm.category,
          budget: budgetNum,
          description: sanitizedDesc,
          deliverables: campaignForm.deliverables,
          deadline: campaignForm.deadline || null,
          status: 'open'
        });

        const createdItem = Array.isArray(res) ? res[0] : res;
        if (createdItem) {
          setCampaigns(prev => [createdItem, ...prev.filter(c => c.id !== createdItem.id)]);
        }
        setCampaignSuccessMsg(t('campaignPublishedSuccess'));
      }

      setTimeout(() => {
        setCampaignSuccessMsg('');
        setEditingCampaignId(null);
        setCampaignForm({
          title: '',
          category: 'tech',
          budget: '',
          description: '',
          deliverables: 'Instagram Post, Instagram Story, Instagram Reel',
          deadline: ''
        });
        setActiveTab('overview');
      }, 1500);
    } catch (err) {
      console.error('Error saving campaign:', err);
      setCampaignErrorMsg(err.message || t('campaignSaveError'));
    }
  };

  const handleStartEditCampaign = (camp) => {
    setEditingCampaignId(camp.id);
    setCampaignForm({
      title: camp.title || '',
      category: camp.category || 'tech',
      budget: camp.budget || '',
      description: camp.description || '',
      deliverables: typeof camp.deliverables === 'string' ? camp.deliverables : (Array.isArray(camp.deliverables) ? camp.deliverables.join(', ') : 'Instagram Post, Instagram Reel'),
      deadline: camp.deadline || ''
    });
    setActiveTab('create');
  };

  const handleToggleCampaignStatus = async (camp) => {
    const nextStatus = camp.status === 'paused' ? 'open' : 'paused';
    try {
      const { updateCampaign } = await import('../services/dbService');
      await updateCampaign(camp.id, { status: nextStatus });
      setCampaigns(prev => prev.map(c => c.id === camp.id ? { ...c, status: nextStatus } : c));
    } catch (err) {
      console.error('Error toggling campaign status:', err);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm(t('confirmDeleteCampaignMsg'))) return;
    try {
      const { deleteCampaign } = await import('../services/dbService');
      await deleteCampaign(campaignId);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      setApplications(prev => prev.filter(app => app.campaign_id !== campaignId));
    } catch (err) {
      console.error('Error deleting campaign:', err);
    }
  };

  // ─── Applicant Actions ───
  const handleRejectApplication = async (applicationId) => {
    try {
      const { updateApplicationStatus } = await import('../services/dbService');
      await updateApplicationStatus(applicationId, 'rejected');
      setApplications(prev => prev.map(app => 
        app.id === applicationId ? { ...app, status: 'rejected' } : app
      ));
    } catch (err) {
      console.error('Error rejecting application:', err);
    }
  };

  const handleOpenChatWithCreator = (creatorId) => {
    setSelectedContactId(creatorId);
    setActiveTab('messages');
  };

  // ─── Escrow & Review Handlers ───
  const handleApproveDeal = async (app) => {
    try {
      const { updateApplicationStatus } = await import('../services/dbService');
      await updateApplicationStatus(app.id, 'completed');
      setApplications(prev => prev.map(a => 
        a.id === app.id ? { ...a, status: 'completed' } : a
      ));
      
      // Prompt for creator review
      setReviewModal({
        isOpen: true,
        creatorId: app.creator_id,
        creatorName: app.creator?.full_name || t('roleCreator'),
        rating: 5,
        reviewText: '',
        submitting: false,
        success: false
      });
    } catch (err) {
      console.error('Error approving deal:', err);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewModal.creatorId) return;
    setReviewModal(prev => ({ ...prev, submitting: true }));
    try {
      const { addReview } = await import('../services/dbService');
      await addReview(reviewModal.creatorId, reviewModal.rating, reviewModal.reviewText);
      setReviewModal(prev => ({ ...prev, submitting: false, success: true }));
      setTimeout(() => {
        setReviewModal({
          isOpen: false,
          creatorId: null,
          creatorName: '',
          rating: 5,
          reviewText: '',
          submitting: false,
          success: false
        });
      }, 2000);
    } catch (err) {
      console.error('Error submitting review:', err);
      setReviewModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // ─── Profile Update Handler ───
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    let sanitizedPhone = profileData.phone?.trim() || '';
    if (sanitizedPhone) {
      const phoneCheck = validateAlgerianPhone(sanitizedPhone);
      if (!phoneCheck.isValid) {
        alert(phoneCheck.error);
        return;
      }
      sanitizedPhone = phoneCheck.formatted;
    }

    let sanitizedWebsite = profileData.websiteUrl?.trim() || '';
    if (sanitizedWebsite) {
      const webCheck = validateUrl(sanitizedWebsite);
      if (!webCheck.isValid) {
        alert(webCheck.error);
        return;
      }
      sanitizedWebsite = webCheck.normalized;
    }

    if (updateProfileData) {
      await updateProfileData({
        full_name: sanitizeText(profileData.brandName, 70),
        brand_name: sanitizeText(profileData.brandName, 70),
        sector: profileData.sector,
        bio: sanitizeText(profileData.bio, 500),
        website_url: sanitizedWebsite,
        phone: sanitizedPhone,
        wilaya: profileData.wilaya,
        rc_number: sanitizeText(profileData.rcNumber, 30)
      });
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // ─── Chat Send Handler ───
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedContactId || !user?.id) return;

    const msgCheck = validateChatMessage(chatMessage);
    if (!msgCheck.isValid) {
      setChatError(msgCheck.error || t('invalidDataAlert'));
      return;
    }

    const msgText = msgCheck.sanitized;
    setChatMessage('');
    setChatError('');

    // Optimistic update — show message immediately in UI
    const optimisticMsg = {
      id: `optimistic_${Date.now()}`,
      sender_id: user.id,
      receiver_id: selectedContactId,
      text: msgText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { sendMessage } = await import('../services/dbService');
      const saved = await sendMessage(user.id, selectedContactId, msgText);
      // Replace optimistic message with real one (if realtime doesn't fire)
      if (saved?.[0]) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? saved[0] : m));
      }
      // Immediately reflect in conversations list
      setConversations(prev => {
        const existingIdx = prev.findIndex(c => c.id === selectedContactId);
        const contactData = chatContacts.find(c => c.id === selectedContactId);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            lastMessage: msgText,
            lastMessageAt: new Date().toISOString()
          };
          return updated;
        } else if (contactData) {
          return [{
            ...contactData,
            lastMessage: msgText,
            lastMessageAt: new Date().toISOString()
          }, ...prev];
        }
        return prev;
      });
    } catch (err) {
      console.error("Error sending message:", err);
      // Remove optimistic message and show error in UI
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setChatMessage(msgText); // restore text so user can retry
      setChatError(`${t('errorMessage')}: ${err?.message || err?.code || ''}`);
    }
  };

  // ─── Contacts for Chat ───
  // Combines conversations from DB, applicants, directory creators, and active selected contact
  const chatContacts = useMemo(() => {
    const contactsMap = new Map();

    // 1. Existing conversations from DB
    for (const conv of conversations) {
      if (conv?.id) {
        contactsMap.set(conv.id, {
          id: conv.id,
          full_name: conv.full_name || t('roleCreator'),
          avatar_url: conv.avatar_url || '',
          category: conv.category || '',
          wilaya: conv.wilaya || '',
          is_verified: Boolean(conv.is_verified),
          lastMessage: conv.lastMessage || '',
          lastMessageAt: conv.lastMessageAt || null
        });
      }
    }

    // 2. Applicants from campaigns
    for (const app of applications) {
      if (app?.creator_id && app.creator) {
        if (!contactsMap.has(app.creator_id)) {
          contactsMap.set(app.creator_id, {
            id: app.creator_id,
            full_name: app.creator.full_name || t('roleCreator'),
            avatar_url: app.creator.avatar_url || '',
            category: app.creator.category || '',
            wilaya: app.creator.wilaya || '',
            is_verified: Boolean(app.creator.is_verified),
            lastMessage: t('applicantOnCampaignMsg'),
            lastMessageAt: app.created_at
          });
        }
      }
    }

    // 3. Ensure the actively selected contact is included immediately
    const targetContactId = selectedContactId || initialContactId;
    if (targetContactId && !contactsMap.has(targetContactId)) {
      const foundInAll = allCreators.find(c => c.id === targetContactId);
      if (foundInAll) {
        contactsMap.set(targetContactId, {
          id: targetContactId,
          full_name: foundInAll.full_name || foundInAll.name || t('roleCreator'),
          avatar_url: foundInAll.avatar_url || foundInAll.avatar || '',
          category: foundInAll.category || '',
          wilaya: foundInAll.wilaya || '',
          is_verified: Boolean(foundInAll.is_verified),
          lastMessage: t('newConversationMsg'),
          lastMessageAt: new Date().toISOString()
        });
      } else if (activeContactProfile && activeContactProfile.id === targetContactId) {
        contactsMap.set(targetContactId, {
          id: targetContactId,
          full_name: activeContactProfile.full_name || activeContactProfile.name || t('roleCreator'),
          avatar_url: activeContactProfile.avatar_url || '',
          category: activeContactProfile.category || '',
          wilaya: activeContactProfile.wilaya || '',
          is_verified: Boolean(activeContactProfile.is_verified),
          lastMessage: t('newConversationMsg'),
          lastMessageAt: new Date().toISOString()
        });
      }
    }

    return Array.from(contactsMap.values());
  }, [conversations, applications, allCreators, selectedContactId, initialContactId, activeContactProfile, t]);

  // Active selected contact details
  const selectedContact = useMemo(() => {
    if (!selectedContactId) return null;
    return (
      chatContacts.find(c => c.id === selectedContactId) ||
      allCreators.find(c => c.id === selectedContactId) ||
      (activeContactProfile?.id === selectedContactId ? activeContactProfile : null) ||
      null
    );
  }, [selectedContactId, chatContacts, allCreators, activeContactProfile]);

  // Auto-select first contact if none selected when in messages tab
  useEffect(() => {
    if (activeTab === 'messages' && !selectedContactId && chatContacts.length > 0) {
      setSelectedContactId(chatContacts[0].id);
    }
  }, [activeTab, selectedContactId, chatContacts]);

  // ─── Filtered Creators for Directory ───
  const filteredCreators = allCreators.filter(c => {
    const creatorName = c.full_name || c.username || '';
    const matchCat = selectedCategory === 'all' || c.category === selectedCategory || CATEGORIES_MAP[selectedCategory]?.[language] === c.category || CATEGORIES_MAP[selectedCategory]?.ar === c.category;
    const matchSearch = searchQuery === '' || 
      creatorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.bio && c.bio.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  // ─── Filtered Applications for Applicants Tab ───
  const filteredApplications = activeCampaignFilter === 'all'
    ? applications
    : applications.filter(app => app.campaign_id === activeCampaignFilter);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-brand-cream/95 backdrop-blur-md overflow-y-auto" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="brand-dashboard-title"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* ─── Top Header Bar ─── */}
      <div className="sticky top-0 z-20 bg-white border-b border-brand-border px-4 sm:px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[18px] bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold shadow-inner">
            <Building2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="brand-dashboard-title" className="text-xl font-black text-brand-brown tracking-wide">
                {profileData.brandName || t('brandDashboard')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                {getLocalizedCategory(profileData.sector, language) || profileData.sector}
              </span>
            </div>
            <p className="text-xs font-medium text-brand-brownLight mt-0.5">
              {t('welcomeUser')}, {user?.profile?.full_name || user?.user_metadata?.full_name || t('roleBrand')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="p-2.5 text-brand-brownLight hover:text-brand-orange hover:bg-brand-orange/10 rounded-full transition-all"
            aria-label={t('close')}
            title={t('close')}
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        
        {/* ─── Navigation Tabs Bar ─── */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-8 border-b border-brand-border">
          {[
            { id: 'overview', label: t('dashOverview'), icon: LayoutDashboard },
            { id: 'create', label: editingCampaignId ? t('editCampaign') : t('addCampaign'), icon: PlusCircle },
            { 
              id: 'applicants', 
              label: t('campaignApplicants'), 
              icon: Users, 
              badge: pendingApplications.length > 0 ? pendingApplications.length : null 
            },
            { id: 'creators', label: t('creatorDirectory'), icon: Search },
            { id: 'messages', label: t('navMessages'), icon: MessageSquare },
            { 
              id: 'escrow', 
              label: t('escrowDeals'), 
              icon: Lock, 
              badge: inEscrowApplications.length > 0 ? inEscrowApplications.length : null 
            },
            { id: 'profile', label: t('storeProfile'), icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id !== 'create') setEditingCampaignId(null);
                  setActiveTab(tab.id);
                }}
                className={`px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2.5 transition-all whitespace-nowrap border shadow-sm ${
                  isActive
                    ? 'bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/20 scale-[1.02]'
                    : 'bg-white text-brand-brownLight border-brand-border hover:border-brand-orange/40 hover:text-brand-orange'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 1: STORE OVERVIEW & ANALYTICS                       */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Real Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Stat 1: Total Invested */}
              <div className="bg-white border border-brand-border rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-brand-brownLight text-sm font-bold">{t('totalInvested')}</span>
                  <div className="p-2.5 bg-brand-orange/10 text-brand-orange rounded-[14px]">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-brand-brown font-mono">
                  {formatDZD(totalInvestedBudget, language)}
                </div>
                <p className="text-xs font-medium text-brand-brownLight mt-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {totalHiredBudget > 0 ? t('inActiveCompletedEscrow') : (totalCampaignsBudget > 0 ? t('budgetAllocatedForCampaigns') : t('transferredViaCards'))}
                  </span>
                </p>
              </div>

              {/* Stat 2: Active Campaigns */}
              <div className="bg-white border border-brand-border rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-brand-brownLight text-sm font-bold">{t('dashActiveCampaigns')}</span>
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-[14px] border border-emerald-100">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-brand-brown font-mono">
                  {activeCampaignsList.length}{' '}
                  <span className="text-sm font-bold text-brand-brownLight">
                    {t('campaignsUnit')}
                  </span>
                </div>
                <p className="text-xs font-medium text-emerald-600 mt-2">
                  {activeCampaignsList.length > 0 ? t('receivingCreatorApplications') : t('addCampaignToStartHiring')}
                </p>
              </div>

              {/* Stat 3: Hired Creators */}
              <div className="bg-white border border-brand-border rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-brand-brownLight text-sm font-bold">{t('hiredCreators')}</span>
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-[14px] border border-purple-100">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-brand-brown font-mono">
                  {uniqueHiredCreatorsCount}{' '}
                  <span className="text-sm font-bold text-brand-brownLight">
                    {t('creatorUnit')}
                  </span>
                </div>
                <p className="text-xs font-medium text-brand-brownLight mt-2">{t('inActiveCompletedEscrow')}</p>
              </div>

              {/* Stat 4: Pending Applicants */}
              <div className="bg-white border border-brand-border rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-brand-brownLight text-sm font-bold">{t('requestsAwaitingReview')}</span>
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-[14px] border border-amber-100">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
                  {pendingApplications.length}{' '}
                  <span className="text-sm font-bold text-brand-brownLight">
                    {t('applicantsLabel')}
                  </span>
                </div>
                <p className="text-xs font-medium text-amber-600 mt-2">
                  {pendingApplications.length > 0 ? t('needsApprovalAndEscrow') : t('noPendingRequestsCurrently')}
                </p>
              </div>
            </div>

            {/* Campaign Management Section & Escrow Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Campaigns List & Actions */}
              <div className="lg:col-span-2 bg-white border border-brand-border rounded-[24px] p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-black text-brand-brown tracking-wide">
                      {t('manageCampaigns')}
                    </h3>
                    <p className="text-xs font-medium text-brand-brownLight mt-0.5">
                      {t('activeCampaignsManageSub')}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingCampaignId(null);
                      setCampaignForm({
                        title: '',
                        category: 'tech',
                        budget: '',
                        description: '',
                        deliverables: 'Instagram Post, Instagram Story, Instagram Reel',
                        deadline: ''
                      });
                      setActiveTab('create');
                    }}
                    className="btn-primary text-xs px-4 py-2.5 flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{t('addCampaign')}</span>
                  </button>
                </div>

                {campaigns.length === 0 ? (
                  <div className="p-8 text-center bg-brand-cream/50 rounded-[20px] border border-dashed border-brand-border">
                    <Sparkles className="w-10 h-10 text-brand-orange/60 mx-auto mb-3" />
                    <p className="text-brand-brown font-bold text-base mb-1">{t('noCampaignsCreatedYet')}</p>
                    <p className="text-brand-brownLight text-xs mb-4">{t('noCampaignsCreatedDesc')}</p>
                    <button 
                      onClick={() => setActiveTab('create')}
                      className="btn-primary text-xs px-5 py-2.5"
                    >
                      {t('addCampaign')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map((camp) => {
                      const campApps = applications.filter(a => a.campaign_id === camp.id);
                      const pendingCount = campApps.filter(a => a.status === 'pending').length;
                      const isPaused = camp.status === 'paused';

                      return (
                        <div 
                          key={camp.id} 
                          className={`p-5 rounded-[20px] border transition-all ${
                            isPaused 
                              ? 'bg-gray-50 border-gray-200 opacity-80' 
                              : 'bg-brand-cream/60 border-brand-border hover:border-brand-orange/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-brand-brown text-base">{camp.title}</h4>
                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-brand-brownLight border border-brand-border">
                                  {getLocalizedCategory(camp.category, language) || camp.category}
                                </span>
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  isPaused 
                                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {isPaused ? t('pausedStatus') : t('activeReceivingStatus')}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-xs font-medium text-brand-brownLight flex-wrap">
                                <span>{t('budgetLabel')} <strong className="text-brand-orange font-bold font-mono">{formatDZD(camp.budget, language)}</strong></span>
                                <span>•</span>
                                <span>{t('applicantsLabel')} <strong className="text-brand-brown">{campApps.length} {t('creatorUnit')}</strong> {pendingCount > 0 && <span className="text-amber-600 font-bold">({pendingCount} {t('newBadge')})</span>}</span>
                                {camp.deadline && (
                                  <>
                                    <span>•</span>
                                    <span>{t('deadlineLabel')} {camp.deadline}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Actions Group */}
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                              <button 
                                onClick={() => {
                                  setActiveCampaignFilter(camp.id);
                                  setActiveTab('applicants');
                                }}
                                className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
                                title={t('viewApplicantsTitle')}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{t('applicants')} ({campApps.length})</span>
                              </button>

                              <button 
                                onClick={() => handleStartEditCampaign(camp)}
                                className="p-2 rounded-xl bg-white border border-brand-border text-brand-brownLight hover:text-brand-orange hover:border-brand-orange transition-colors"
                                title={t('editCampaign')}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button 
                                onClick={() => handleToggleCampaignStatus(camp)}
                                className={`p-2 rounded-xl border transition-colors ${
                                  isPaused 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                                    : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                }`}
                                title={isPaused ? t('resumePosting') : t('pausePosting')}
                              >
                                {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                              </button>

                              <button 
                                onClick={() => handleDeleteCampaign(camp.id)}
                                className="p-2 rounded-xl bg-white border border-brand-border text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                                title={t('deleteCampaign')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Escrow Financial Status Card */}
              <div className="bg-white border border-brand-border rounded-[24px] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center gap-3 text-brand-orange mb-3 font-black text-lg">
                    <ShieldCheck className="w-6 h-6" />
                    <span>{t('escrowStatusTitle')}</span>
                  </div>
                  <p className="text-brand-brownLight font-medium text-xs mb-6 leading-relaxed">
                    {t('escrowGuaranteeDesc')}
                  </p>

                  <div className="p-4 rounded-[18px] bg-brand-cream/80 border border-brand-border space-y-4 mb-6">
                    <div className="flex justify-between items-center text-sm font-bold text-brand-brownLight">
                      <span>{t('escrowHeld')}</span>
                      <span className="font-black text-amber-600 font-mono text-base">
                        {formatDZD(escrowHeldAmount, language)}
                      </span>
                    </div>
                    <div className="h-px w-full bg-brand-border/60"></div>
                    <div className="flex justify-between items-center text-sm font-bold text-brand-brownLight">
                      <span>{t('escrowReleased')}</span>
                      <span className="font-black text-emerald-600 font-mono text-base">
                        {formatDZD(escrowReleasedAmount, language)}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveTab('escrow')}
                  className="btn-primary w-full py-3.5 text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <Lock className="w-4 h-4" />
                  <span>{t('activeEscrowManagementBtn')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 2: CREATE / EDIT CAMPAIGN BRIEF                     */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto bg-white border border-brand-border rounded-[28px] p-6 sm:p-10 animate-fade-in shadow-sm">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-brand-border">
              <div>
                <h3 className="text-2xl font-black text-brand-brown tracking-wide">
                  {editingCampaignId ? t('editCampaignTitle') : t('newCampaignTitle')}
                </h3>
                <p className="text-brand-brownLight font-medium text-xs mt-1">
                  {t('publishCampaignSub')}
                </p>
              </div>
              {editingCampaignId && (
                <button
                  onClick={() => {
                    setEditingCampaignId(null);
                    setCampaignForm({
                      title: '',
                      category: 'tech',
                      budget: '',
                      description: '',
                      deliverables: 'Instagram Post, Instagram Story, Instagram Reel',
                      deadline: ''
                    });
                  }}
                  className="text-xs font-bold text-brand-orange hover:underline"
                >
                  {t('cancelEdit')}
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-brand-brown mb-2">{t('campaignTitleAsterisk')}</label>
                <input
                  type="text"
                  placeholder={t('campaignTitlePlaceholder')}
                  className="input-field w-full"
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-brown mb-2">{t('campaignCategoryAsterisk')}</label>
                  <select
                    className="input-field w-full"
                    value={campaignForm.category}
                    onChange={(e) => setCampaignForm({ ...campaignForm, category: e.target.value })}
                  >
                    <option value="tech">{getLocalizedCategory('tech', language)}</option>
                    <option value="fashion">{getLocalizedCategory('fashion', language)}</option>
                    <option value="beauty">{getLocalizedCategory('beauty', language)}</option>
                    <option value="food">{getLocalizedCategory('food', language)}</option>
                    <option value="travel">{getLocalizedCategory('travel', language)}</option>
                    <option value="fitness">{getLocalizedCategory('fitness', language)}</option>
                    <option value="services">{getLocalizedCategory('services', language)}</option>
                    <option value="decor">{getLocalizedCategory('decor', language)}</option>
                    <option value="other">{t('sectorOther')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-brown mb-2">{t('campaignBudgetAsterisk')}</label>
                  <input
                    type="number"
                    placeholder="35000"
                    className="input-field w-full font-mono"
                    value={campaignForm.budget}
                    onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-brown mb-2">{t('campaignDeliverablesAsterisk')}</label>
                  <input
                    type="text"
                    placeholder={t('campaignDeliverablesPlaceholder')}
                    className="input-field w-full"
                    value={campaignForm.deliverables}
                    onChange={(e) => setCampaignForm({ ...campaignForm, deliverables: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-brown mb-2">{t('campaignDeadlineOptional')}</label>
                  <input
                    type="date"
                    className="input-field w-full font-mono"
                    value={campaignForm.deadline}
                    onChange={(e) => setCampaignForm({ ...campaignForm, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-brown mb-2">{t('campaignDescLabel')}</label>
                <textarea
                  rows={4}
                  placeholder={t('campaignDescPlaceholder')}
                  className="input-field w-full"
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                />
              </div>

              {/* Fee Breakdown Preview */}
              {campaignForm.budget && Number(campaignForm.budget) > 0 && (
                <div className="p-4 rounded-[18px] bg-brand-cream/80 border border-brand-border text-xs text-brand-brownLight font-medium space-y-2">
                  <div className="flex justify-between items-center">
                    <span>{t('campaignCreatorBudgetLabel')}</span>
                    <span className="font-bold text-brand-brown font-mono">{formatDZD(Number(campaignForm.budget), language)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('campaignEscrowFee5Label')}</span>
                    <span className="font-bold text-emerald-600 font-mono">{formatDZD(calculateFees(Number(campaignForm.budget)).platformFee, language)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-brand-border text-sm font-bold text-brand-brown">
                    <span>{t('campaignTotalEscrowLabel')}</span>
                    <span className="text-brand-orange font-mono font-black">{formatDZD(calculateFees(Number(campaignForm.budget)).total, language)}</span>
                  </div>
                </div>
              )}

              {campaignErrorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{campaignErrorMsg}</span>
                </div>
              )}

              {campaignSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 animate-scale-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{campaignSuccessMsg}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary w-full py-4 font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-orange/20"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>{editingCampaignId ? t('saveAndUpdateCampaign') : t('publishCampaignToMarket')}</span>
              </button>
            </form>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 3: CAMPAIGN APPLICANTS REVIEW                       */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'applicants' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-black text-brand-brown mb-1">{t('applicantsHeading')}</h3>
                <p className="text-brand-brownLight font-medium text-xs">
                  {t('applicantsSub')}
                </p>
              </div>

              {/* Filter By Campaign Dropdown */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <span className="text-xs font-bold text-brand-brownLight whitespace-nowrap">{t('campaignFilterLabel')}</span>
                <select
                  value={activeCampaignFilter}
                  onChange={(e) => setActiveCampaignFilter(e.target.value)}
                  className="input-field py-2 text-xs font-bold bg-white"
                >
                  <option value="all">{t('allCampaignsOption')} ({applications.length})</option>
                  {campaigns.map(camp => (
                    <option key={camp.id} value={camp.id}>
                      {camp.title} ({applications.filter(a => a.campaign_id === camp.id).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredApplications.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-[24px] border border-brand-border shadow-sm">
                <Users className="w-12 h-12 text-brand-brownLight/40 mx-auto mb-3" />
                <h4 className="font-bold text-brand-brown text-base mb-1">{t('noApplicantsYetHeading')}</h4>
                <p className="text-brand-brownLight text-xs max-w-md mx-auto">
                  {t('noApplicantsYetDesc')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredApplications.map((app) => {
                  const creator = app.creator || {};
                  const creatorName = creator.full_name || creator.brand_name || t('roleCreator');
                  const creatorAvatar = creator.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator';
                  const isPending = app.status === 'pending';
                  const isInEscrow = app.status === 'approved' || app.status === 'submitted';
                  const isCompleted = app.status === 'completed';

                  return (
                    <div 
                      key={app.id} 
                      className="bg-white border border-brand-border rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header with Creator Info */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <OptimizedImage 
                              src={creatorAvatar} 
                              fallbackType="creator"
                              seed={creatorName}
                              alt={creatorName} 
                              width="48"
                              height="48"
                              className="w-12 h-12 rounded-full border border-brand-border bg-brand-cream object-cover" 
                            />
                            <div>
                              <h4 className="font-bold text-brand-brown text-sm flex items-center gap-1">
                                <span>{creatorName}</span>
                                {creator.is_verified && <BadgeCheck className="w-4 h-4 text-brand-orange" />}
                              </h4>
                              <span className="text-[11px] font-medium text-brand-brownLight block">
                                {getLocalizedCategory(creator.category, language) || t('roleCreator')} • {getLocalizedWilaya(creator.wilaya, language) || creator.wilaya}
                              </span>
                            </div>
                          </div>

                          {/* Status Pill */}
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            isPending ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            isInEscrow ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {getLocalizedStatus(app.status, language)}
                          </span>
                        </div>

                        {/* Campaign Target */}
                        <div className="p-3 rounded-[16px] bg-brand-cream/60 border border-brand-border mb-4">
                          <span className="text-[10px] font-bold text-brand-brownLight block mb-0.5">{t('campaignApplicationsBrand')}:</span>
                          <span className="font-bold text-brand-brown text-xs block truncate">
                            {app.campaign?.title || t('navCampaigns')}
                          </span>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-brand-border/40 text-[11px] font-medium">
                            <span className="text-brand-brownLight">{t('budgetLabel')}</span>
                            <span className="font-bold text-brand-orange font-mono">
                              {formatDZD(app.campaign?.budget, language)}
                            </span>
                          </div>
                        </div>

                        {/* Creator Bio Snippet */}
                        {creator.bio && (
                          <p className="text-xs text-brand-brownLight mb-4 line-clamp-2 leading-relaxed">
                            {creator.bio}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-brand-border space-y-2">
                        {isPending && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                onClose();
                                onHireCreator(
                                  {
                                    id: creator.id,
                                    name: creatorName,
                                    ratePerPost: app.campaign?.budget || creator.rate_per_post || 25000,
                                    avatar: creatorAvatar
                                  }, 
                                  app.id
                                );
                              }}
                              className="btn-primary text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{t('acceptAndEscrow')}</span>
                            </button>

                            <button
                              onClick={() => handleRejectApplication(app.id)}
                              className="py-2.5 rounded-full text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                            >
                              {t('rejectApplication')}
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => handleOpenChatWithCreator(creator.id)}
                          className="w-full py-2 rounded-full text-xs font-bold text-brand-brown hover:text-brand-orange bg-white border border-brand-border hover:border-brand-orange/30 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{t('messageCreatorFull')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 4: CREATORS DIRECTORY & DIRECT HIRE                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'creators' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xl font-black text-brand-brown mb-1">{t('creatorDirectory')}</h3>
              <p className="text-brand-brownLight font-medium text-xs">
                {t('creatorDirectoryIntro')}
              </p>
            </div>

            {/* Search Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-brownLight" />
                <input
                  type="text"
                  placeholder={t('searchCreatorPlaceholder')}
                  className="w-full bg-white border border-brand-border rounded-full pl-6 pr-11 py-2.5 text-brand-brown text-xs font-medium focus:outline-none focus:border-brand-orange transition-colors shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {['all', 'tech', 'fashion', 'beauty', 'food', 'travel'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border shadow-sm ${
                      selectedCategory === cat
                        ? 'bg-brand-orange text-white border-brand-orange shadow-sm'
                        : 'bg-white text-brand-brownLight border-brand-border hover:border-brand-orange/30 hover:text-brand-orange'
                    }`}
                  >
                    {getLocalizedCategory(cat, language)}
                  </button>
                ))}
              </div>
            </div>

            {/* Creators Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCreators.map((creator) => {
                const creatorName = creator.full_name || creator.username || t('roleCreator');
                const creatorAvatar = creator.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator';

                return (
                  <div 
                    key={creator.id} 
                    className="bg-white border border-brand-border rounded-[24px] shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <OptimizedImage 
                          src={creatorAvatar} 
                          fallbackType="creator"
                          seed={creatorName}
                          alt={creatorName} 
                          width="56"
                          height="56"
                          className="w-14 h-14 rounded-full border border-brand-border bg-brand-cream object-cover" 
                        />
                        <div>
                          <h4 className="font-bold text-brand-brown text-base flex items-center gap-1.5">
                            <span>{creatorName}</span>
                            {creator.is_verified && <BadgeCheck className="w-4 h-4 text-brand-orange" />}
                          </h4>
                          <span className="text-xs font-medium text-brand-brownLight">
                            {getLocalizedCategory(creator.category, language) || t('roleCreator')} • {getLocalizedWilaya(creator.wilaya, language) || creator.wilaya}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-medium text-brand-brownLight line-clamp-2 mb-4 leading-relaxed">
                        {creator.bio || t('digitalCreatorBioFallback')}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mb-5 text-center">
                        <div className="p-2.5 rounded-[14px] bg-brand-cream/80 border border-brand-border">
                          <span className="text-[10px] font-bold text-brand-brownLight block mb-0.5">{t('dashCompletedDeals')}</span>
                          <span className="font-black text-brand-brown text-xs font-mono">{creator.completed_deals || 0}</span>
                        </div>
                        <div className="p-2.5 rounded-[14px] bg-brand-cream/80 border border-brand-border">
                          <span className="text-[10px] font-bold text-brand-brownLight block mb-0.5">{t('creatorRate')}</span>
                          <span className="font-black text-brand-orange text-xs font-mono">
                            {Number(creator.rate_per_post) > 0 ? formatDZD(creator.rate_per_post, language) : t('negotiablePerCampaign')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-brand-border">
                      <button
                        onClick={() => {
                          onClose();
                          onHireCreator({
                            id: creator.id,
                            name: creatorName,
                            ratePerPost: Number(creator.rate_per_post) || 0,
                            avatar: creatorAvatar
                          });
                        }}
                        className="btn-primary py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{t('instantHire')}</span>
                      </button>

                      <button
                        onClick={() => handleOpenChatWithCreator(creator.id)}
                        className="py-2.5 rounded-full text-xs font-bold text-brand-brown hover:text-brand-orange bg-white border border-brand-border hover:border-brand-orange/30 transition-colors flex items-center justify-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{t('messageCreator')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 5: REAL-TIME MESSAGING CHAT                         */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px] animate-fade-in">
            {/* Sidebar: Contacts */}
            <div className="bg-white border border-brand-border rounded-[24px] flex flex-col h-full lg:col-span-1 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-brand-border font-black text-brand-brown flex items-center justify-between bg-brand-cream/50">
                <span className="text-sm">{t('directConversations')}</span>
              </div>
              <div className="flex-1 overflow-y-auto bg-white divide-y divide-brand-border/40">
                {chatContacts.length === 0 ? (
                  <div className="p-6 text-brand-brownLight font-medium text-xs text-center space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-brand-orange/40" />
                    <p>{t('noChatsYet')}</p>
                    <p className="text-[11px] text-brand-brownLight/70">{t('brandChatSidebarHelp')}</p>
                  </div>
                ) : (
                  chatContacts.map(contact => (
                    <div 
                      key={contact.id}
                      onClick={() => setSelectedContactId(contact.id)}
                      className={`p-3.5 cursor-pointer flex items-center gap-3 transition-colors border-r-4 ${
                        selectedContactId === contact.id 
                          ? 'bg-brand-cream border-r-brand-orange shadow-inner' 
                          : 'hover:bg-brand-cream/40 border-r-transparent'
                      }`}
                    >
                      <OptimizedImage 
                        src={contact.avatar_url} 
                        fallbackType="creator"
                        seed={contact.full_name || 'Creator'}
                        alt="Creator Avatar" 
                        width="44"
                        height="44"
                        className="w-11 h-11 rounded-full border border-brand-border object-cover bg-brand-cream shrink-0" 
                      />
                      <div className="overflow-hidden flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-brand-brown text-xs truncate flex items-center gap-1">
                            <span>{contact.full_name || t('roleCreator')}</span>
                            {contact.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-brand-orange shrink-0" />}
                          </h4>
                          {contact.lastMessageAt && (
                            <span className="text-[9px] text-brand-brownLight/70 shrink-0">
                              {new Date(contact.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-brand-brownLight truncate mt-0.5">
                          {contact.lastMessage || getLocalizedCategory(contact.category, language) || t('roleCreator')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Conversation Window */}
            <div className="bg-white border border-brand-border rounded-[24px] flex flex-col h-full lg:col-span-2 overflow-hidden shadow-sm">
              {selectedContactId ? (
                <>
                  <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-cream/40">
                    <div className="flex items-center gap-3">
                      <OptimizedImage 
                        src={selectedContact?.avatar_url || selectedContact?.avatar} 
                        fallbackType="creator"
                        seed={selectedContact?.full_name || selectedContact?.name || 'Creator'}
                        alt="Creator Avatar" 
                        width="40"
                        height="40"
                        className="w-10 h-10 rounded-full border border-brand-border object-cover bg-brand-cream" 
                      />
                      <div>
                        <h3 className="font-bold text-brand-brown text-sm flex items-center gap-1.5">
                          <span>{selectedContact?.full_name || selectedContact?.name || t('roleCreator')}</span>
                          {selectedContact?.is_verified && <BadgeCheck className="w-4 h-4 text-brand-orange" />}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {t('onlineNow')}
                          </span>
                          {selectedContact?.category && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-[10px] text-brand-brownLight font-medium">{selectedContact.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedContact && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onHireCreator({
                            id: selectedContact.id,
                            name: selectedContact.full_name || selectedContact.name,
                            ratePerPost: Number(selectedContact.rate_per_post) || 0,
                            avatar: selectedContact.avatar_url || selectedContact.avatar
                          });
                        }}
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{t('hireAction')}</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#FAFAFA]">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-brand-brown text-sm">
                          {t('startChatWith')} {selectedContact?.full_name || selectedContact?.name || t('roleCreator')}
                        </h4>
                        <p className="text-xs text-brand-brownLight max-w-xs leading-relaxed">
                          {t('brandChatWelcomeDesc')}
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex flex-col max-w-[75%] ${
                              isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                            }`}
                          >
                            <div 
                              className={`p-3.5 rounded-[18px] shadow-sm text-xs leading-relaxed ${
                                isMe 
                                  ? 'bg-brand-orange text-white rounded-br-none' 
                                  : 'bg-white border border-brand-border text-brand-brown rounded-bl-none'
                              }`}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[9px] font-medium text-brand-brownLight mt-1 px-1">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3.5 border-t border-brand-border bg-white">
                    {chatError && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[10px] font-medium break-all">
                        ⚠️ {chatError}
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t('typeYourMessage')}
                        className="flex-1 bg-[#FAFAFA] border border-brand-border rounded-full px-5 py-2.5 text-brand-brown text-xs font-medium focus:outline-none focus:border-brand-orange transition-colors"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                      />
                      <button 
                        type="submit" 
                        disabled={!chatMessage.trim()} 
                        className="bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-50 text-white p-2.5 rounded-full transition-all shadow-sm flex items-center justify-center"
                      >
                        <SendHorizontal className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-brand-brownLight opacity-60 bg-[#FAFAFA]">
                  <MessageSquare className="w-12 h-12 mb-3 text-brand-brown/30" />
                  <p className="font-medium text-xs">{t('selectChatToStart')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 6: ESCROW DEALS & RELEASING FUNDS                   */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'escrow' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xl font-black text-brand-brown mb-1">{t('escrowDeals')}</h3>
              <p className="text-brand-brownLight font-medium text-xs">
                {t('escrowManagementSub')}
              </p>
            </div>

            <div className="space-y-4">
              {applications.filter(app => app.status === 'approved' || app.status === 'submitted' || app.status === 'completed').length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[24px] border border-brand-border shadow-sm">
                  <Lock className="w-12 h-12 text-brand-brownLight/40 mx-auto mb-3" />
                  <h4 className="font-bold text-brand-brown text-base mb-1">{t('noEscrowDeals')}</h4>
                  <p className="text-brand-brownLight text-xs">{t('noEscrowDealsSub')}</p>
                </div>
              ) : (
                applications.filter(app => app.status === 'approved' || app.status === 'submitted' || app.status === 'completed').map((app) => {
                  const isCompleted = app.status === 'completed';
                  const hasDeliverable = Boolean(app.deliverable_url);

                  return (
                    <div 
                      key={app.id} 
                      className="bg-white border border-brand-border rounded-[24px] shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-black text-brand-brown text-base">{app.campaign?.title}</span>
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                            isCompleted 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : hasDeliverable 
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isCompleted ? t('fundsReleasedSuccess') :
                             hasDeliverable ? t('workDeliveredAwaitingReview') :
                             t('fundsSecuredInEscrowNotice')}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-brand-brownLight">
                          {t('assignedCreatorBadge')} <strong className="text-brand-brown">{app.creator?.full_name || t('roleCreator')}</strong> | {t('heldAmountBadge')} <strong className="text-brand-orange font-mono font-bold">{formatDZD(app.campaign?.budget, language)}</strong>
                        </p>

                        {/* Deliverable URL */}
                        {app.deliverable_url && (
                          <div className="pt-2">
                            <a 
                              href={safeHref(app.deliverable_url)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>{t('previewDeliverableReel')}</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Approval Action */}
                      <div>
                        {isCompleted ? (
                          <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{t('actionCompletedSuccess')}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApproveDeal(app)}
                            className="btn-primary text-xs px-5 py-3 flex items-center gap-2 shadow-md shadow-brand-orange/20"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>{t('approveAndReleaseFundsNow')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 7: STORE & BRAND PROFILE SETTINGS                   */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto bg-white border border-brand-border rounded-[28px] shadow-sm p-6 sm:p-10 animate-fade-in">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-brand-border">
              <div className="w-14 h-14 rounded-2xl bg-brand-cream border border-brand-border text-brand-orange flex items-center justify-center font-bold shadow-inner">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-brown mb-1">{t('storeProfileTitle')}</h3>
                <p className="text-xs font-medium text-brand-brownLight">{t('storeProfileHint')}</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-brown mb-2">{t('storeNameAsterisk')}</label>
                  <input
                    type="text"
                    placeholder={t('storeNamePlaceholder')}
                    className="input-field w-full"
                    value={profileData.brandName}
                    onChange={(e) => setProfileData({ ...profileData, brandName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-brown mb-2">{t('storeSectorAsterisk')}</label>
                  <select
                    className="input-field w-full"
                    value={profileData.sector}
                    onChange={(e) => setProfileData({ ...profileData, sector: e.target.value })}
                  >
                    <option value="ecommerce">{t('sectorEcommerceFashion')}</option>
                    <option value="electronics">{t('sectorElectronicsPhones')}</option>
                    <option value="food">{t('sectorFoodDining')}</option>
                    <option value="cosmetics">{t('sectorCosmeticsCare')}</option>
                    <option value="services">{t('sectorServicesSoftware')}</option>
                    <option value="decor">{t('sectorFurnitureDecor')}</option>
                    <option value="sports">{t('sectorSportsFitness')}</option>
                    <option value="other">{t('sectorOther')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-brown mb-2">{t('storeDescriptionLabel')}</label>
                <textarea
                  rows={4}
                  placeholder={t('storeDescPlaceholder')}
                  className="input-field w-full"
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-brown mb-2">{t('contactPhoneLabel')}</label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-brownLight" />
                    <input
                      type="tel"
                      placeholder="0550123456"
                      className="input-field w-full pr-10 font-mono"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-brown mb-2">{t('storeLocationWilaya')}</label>
                  <div className="relative">
                    <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-brownLight" />
                    <input
                      type="text"
                      placeholder={t('storeLocationPlaceholder')}
                      className="input-field w-full pr-10"
                      value={profileData.wilaya}
                      onChange={(e) => setProfileData({ ...profileData, wilaya: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-brown mb-2">{t('commercialRegisterNIF')}</label>
                  <input
                    type="text"
                    placeholder="16/00-1234567"
                    className="input-field w-full font-mono text-left dir-ltr"
                    value={profileData.rcNumber}
                    onChange={(e) => setProfileData({ ...profileData, rcNumber: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-brown mb-2">{t('socialOrWebsiteUrl')}</label>
                <div className="relative">
                  <Globe className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-brownLight" />
                  <input
                    type="url"
                    placeholder="https://instagram.com/my_brand"
                    className="input-field w-full pr-10 text-left dir-ltr"
                    value={profileData.websiteUrl}
                    onChange={(e) => setProfileData({ ...profileData, websiteUrl: e.target.value })}
                  />
                </div>
              </div>

              {savedSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-scale-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('profileSaved')}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary w-full py-4 font-bold text-base flex items-center justify-center gap-2 shadow-md shadow-brand-orange/20 mt-4"
              >
                <span>{t('saveStoreProfile')}</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ─── REVIEW CREATOR MODAL POPUP ─── */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-brand-border animate-scale-in relative">
            <button 
              onClick={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute top-4 left-4 p-2 text-brand-brownLight hover:text-brand-brown rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 fill-amber-500" />
              </div>
              <h3 className="text-xl font-black text-brand-brown mb-1">
                {t('rateCreator')}
              </h3>
              <p className="text-xs font-medium text-brand-brownLight">
                {t('reviewCreatorExperience')} - <strong>{reviewModal.creatorName}</strong>
              </p>
            </div>

            {reviewModal.success ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-600" />
                <span>{t('reviewThanks')}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Star Rating Select */}
                <div className="flex justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewModal(prev => ({ ...prev, rating: star }))}
                      className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star 
                        className={`w-8 h-8 ${
                          star <= reviewModal.rating 
                            ? 'text-amber-500 fill-amber-500' 
                            : 'text-gray-300'
                        }`} 
                      />
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-brown mb-1.5">{t('reviewFeedbackTitle')}</label>
                  <textarea
                    rows={3}
                    placeholder={t('reviewPlaceholder')}
                    className="input-field w-full text-xs"
                    value={reviewModal.reviewText}
                    onChange={(e) => setReviewModal(prev => ({ ...prev, reviewText: e.target.value }))}
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewModal.submitting}
                  className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  {reviewModal.submitting ? t('reviewSubmitting') : t('reviewSubmit')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
