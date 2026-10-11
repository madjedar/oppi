import React from 'react';
import { Compass, Briefcase, PlusCircle, Sparkles, MessageSquare, User, Building2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { isBrand, isCreator, canCreateCampaign } from '../utils/authGuards';
import OptimizedImage from './OptimizedImage';

/**
 * Mobile Sticky Bottom Navigation
 * Provides a native app-like bottom navigation experience on mobile screens (< md).
 * Automatically handles RTL/LTR logical placement, active state, unread badges, and role-based center action.
 */
export default function BottomNav({
  user,
  currentTab = 'creators',
  onSelectTab,
  onOpenDashboard,
  onOpenAuth,
  unreadMessagesCount = 0
}) {
  const { t } = useLanguage();
  const isLoggedIn = Boolean(user);
  const userIsBrand = isBrand(user);
  const userIsCreator = isCreator(user);
  const userCanCreate = canCreateCampaign(user);

  const handleExploreClick = () => {
    if (onSelectTab) {
      onSelectTab('creators');
    }
    const el = document.getElementById('creators') || document.getElementById('main-content');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCampaignsClick = () => {
    if (isLoggedIn) {
      if (userIsBrand) {
        onOpenDashboard?.('campaigns', 'brand');
      } else {
        onOpenDashboard?.('opportunities', 'creator');
      }
    } else {
      if (onSelectTab) {
        onSelectTab('stores');
      }
      const el = document.getElementById('creators') || document.getElementById('main-content');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleCenterAction = () => {
    if (!isLoggedIn) {
      onOpenAuth?.('signup', 'creator');
      return;
    }
    if (userCanCreate) {
      onOpenDashboard?.('create', 'brand');
    } else if (userIsCreator) {
      onOpenDashboard?.('opportunities', 'creator');
    } else {
      onOpenDashboard?.('overview');
    }
  };

  const handleMessagesClick = () => {
    if (!isLoggedIn) {
      onOpenAuth?.('login');
      return;
    }
    onOpenDashboard?.('messages', userIsBrand ? 'brand' : 'creator');
  };

  const handleAccountClick = () => {
    if (!isLoggedIn) {
      onOpenAuth?.('login');
      return;
    }
    onOpenDashboard?.('overview', userIsBrand ? 'brand' : 'creator');
  };

  const isExploreActive = currentTab === 'creators';
  const isCampaignsActive = currentTab === 'stores' || currentTab === 'opportunities' || currentTab === 'campaigns';
  const isMessagesActive = currentTab === 'messages';
  const isAccountActive = currentTab === 'overview' || currentTab === 'account' || currentTab === 'dashboard';

  return (
    <nav 
      aria-label={t('bottomNavAria')}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] pb-[calc(env(safe-area-inset-bottom,0px)+6px)] pt-1.5 px-2 select-none"
    >
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        
        {/* 1. Explore Tab */}
        <button
          type="button"
          onClick={handleExploreClick}
          aria-label={t('navExplore')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-2xl transition-all ${
            isExploreActive 
              ? 'text-brand-orange font-black' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <Compass className={`w-5 h-5 transition-transform ${isExploreActive ? 'scale-110 stroke-[2.5]' : ''}`} />
            {isExploreActive && (
              <span className="absolute -bottom-1 inset-x-0 mx-auto w-1 h-1 rounded-full bg-brand-orange" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight leading-none">
            {t('navExplore')}
          </span>
        </button>

        {/* 2. Campaigns Tab */}
        <button
          type="button"
          onClick={handleCampaignsClick}
          aria-label={t('navCampaigns')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-2xl transition-all ${
            isCampaignsActive 
              ? 'text-brand-orange font-black' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <Briefcase className={`w-5 h-5 transition-transform ${isCampaignsActive ? 'scale-110 stroke-[2.5]' : ''}`} />
            {isCampaignsActive && (
              <span className="absolute -bottom-1 inset-x-0 mx-auto w-1 h-1 rounded-full bg-brand-orange" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight leading-none">
            {t('navCampaigns')}
          </span>
        </button>

        {/* 3. Highlighted Center Action Button */}
        <div className="flex-1 flex justify-center items-center px-1">
          <button
            type="button"
            onClick={handleCenterAction}
            aria-label={
              userCanCreate 
                ? t('navAddCampaign') 
                : userIsCreator 
                  ? t('navFindDeals') 
                  : t('navJoinNow')
            }
            className="group relative -top-3 flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-orange to-amber-500 text-white flex items-center justify-center shadow-lg shadow-brand-orange/40 ring-4 ring-white active:scale-95 transition-transform">
              {userCanCreate ? (
                <PlusCircle className="w-6 h-6 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" />
              ) : userIsCreator ? (
                <Sparkles className="w-6 h-6 stroke-[2.5] animate-pulse" />
              ) : (
                <Sparkles className="w-6 h-6 stroke-[2.5]" />
              )}
            </div>
            <span className="text-[10px] font-black text-brand-orange mt-0.5 whitespace-nowrap">
              {userCanCreate 
                ? t('navAddCampaign') 
                : userIsCreator 
                  ? t('navFindDeals') 
                  : t('navJoinNow')}
            </span>
          </button>
        </div>

        {/* 4. Messages Tab with Badge Counter */}
        <button
          type="button"
          onClick={handleMessagesClick}
          aria-label={t('navMessages')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-2xl transition-all ${
            isMessagesActive 
              ? 'text-brand-orange font-black' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <MessageSquare className={`w-5 h-5 transition-transform ${isMessagesActive ? 'scale-110 stroke-[2.5]' : ''}`} />
            {unreadMessagesCount > 0 ? (
              <span className="absolute -top-1.5 -end-2 min-w-[16px] h-4 px-1 rounded-full bg-brand-orange text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-sm animate-pulse">
                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
              </span>
            ) : (
              isLoggedIn && (
                <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
              )
            )}
            {isMessagesActive && (
              <span className="absolute -bottom-1 inset-x-0 mx-auto w-1 h-1 rounded-full bg-brand-orange" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight leading-none">
            {t('navMessages')}
          </span>
        </button>

        {/* 5. Account / Dashboard Tab */}
        <button
          type="button"
          onClick={handleAccountClick}
          aria-label={t('navAccount')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-2xl transition-all ${
            isAccountActive 
              ? 'text-brand-orange font-black' 
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            {isLoggedIn && (user.profile?.avatar_url || user.user_metadata?.avatar_url) ? (
              <div className={`w-5 h-5 rounded-full overflow-hidden border ${isAccountActive ? 'border-brand-orange ring-1 ring-brand-orange' : 'border-slate-300'}`}>
                <OptimizedImage
                  src={user.profile?.avatar_url || user.user_metadata?.avatar_url}
                  fallbackType="user"
                  seed={user.user_metadata?.full_name || user.id}
                  alt={user.user_metadata?.full_name || 'User'}
                  width="20"
                  height="20"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <User className={`w-5 h-5 transition-transform ${isAccountActive ? 'scale-110 stroke-[2.5]' : ''}`} />
            )}
            {isAccountActive && (
              <span className="absolute -bottom-1 inset-x-0 mx-auto w-1 h-1 rounded-full bg-brand-orange" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight leading-none">
            {isLoggedIn ? t('navAccount') : t('login')}
          </span>
        </button>

      </div>
    </nav>
  );
}
