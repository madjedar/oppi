import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, User, LogOut, LayoutDashboard, PlusCircle, Sparkles, Building2, Globe, ShieldAlert, Settings, Mail, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationDropdown from './NotificationDropdown';
import OptimizedImage from './OptimizedImage';
import { 
  preloadAuthModal, 
  preloadDashboardForRole, 
  preloadProfileSettingsModal, 
  preloadContactModal 
} from '../utils/preloadChunks';
import { isBrand, isCreator, isAdmin, canCreateCampaign } from '../utils/authGuards';

const Header = ({ onOpenAuth, onOpenDashboard, onOpenProfileSettings, onOpenContact }) => {
  const { user: realUser, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setIsLangMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsLangMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // FAKE USER FOR VISUAL TESTING ONLY
  const isFakeMode = window.location.hash.includes('#fake');
  const user = isFakeMode ? {
    id: 'fake-creator-123',
    role: 'creator',
    user_metadata: {
      full_name: 'Test Creator'
    }
  } : realUser;

  const userIsBrand = isBrand(user);
  const userIsCreator = isCreator(user);
  const userIsAdmin = isAdmin(user);
  const userCanCreateCampaign = canCreateCampaign(user);

  return (
    <header className="sticky top-0 z-50 bg-[#070E1A]/95 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <a href="#" className="flex-shrink-0 flex items-center gap-3 group">
            <picture className="flex items-center">
              <img 
                src="/logo.jpg" 
                alt="OPPI Logo" 
                width="44"
                height="44"
                fetchPriority="high"
                decoding="async"
                className="h-10 sm:h-11 w-auto object-contain rounded-xl bg-white p-1 group-hover:scale-105 transition-transform duration-200 shadow-sm"
              />
            </picture>
            <span className="text-xl sm:text-2xl font-bold font-inter tracking-wide text-white group-hover:text-brand-orange transition-colors" dir="ltr">OPPI</span>
          </a>

          {/* Desktop Nav */}
          <nav aria-label={t('mainNavigation')} className="hidden md:flex items-center gap-4">
            
            {/* Language Switcher */}
            <div className="relative" ref={langMenuRef}>
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                aria-haspopup="true"
                aria-expanded={isLangMenuOpen}
                aria-label={t('changeLanguage')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors font-bold text-sm"
              >
                <Globe className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                <span className="uppercase">{language}</span>
              </button>
              {isLangMenuOpen && (
                <div role="menu" className="absolute top-full mt-2 w-32 bg-[#0B1528] border border-white/15 rounded-[20px] shadow-2xl overflow-hidden py-1 z-50 end-0 text-white">
                  <button role="menuitem" onClick={() => { setLanguage('ar'); setIsLangMenuOpen(false); }} className="w-full text-start px-4 py-2 hover:bg-white/10 text-slate-200 hover:text-white text-sm font-bold">🇩🇿 العربية</button>
                  <button role="menuitem" onClick={() => { setLanguage('fr'); setIsLangMenuOpen(false); }} className="w-full text-start px-4 py-2 hover:bg-white/10 text-slate-200 hover:text-white text-sm font-bold">🇫🇷 Français</button>
                  <button role="menuitem" onClick={() => { setLanguage('en'); setIsLangMenuOpen(false); }} className="w-full text-start px-4 py-2 hover:bg-white/10 text-slate-200 hover:text-white text-sm font-bold">🇬🇧 English</button>
                </div>
              )}
            </div>

            {/* Contact Button */}
            <button
              onClick={onOpenContact}
              onMouseEnter={preloadContactModal}
              onFocus={preloadContactModal}
              aria-label={t('contactUs')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors font-bold text-xs"
              title={t('contactUs')}
            >
              <Mail className="w-4 h-4 text-brand-orange" aria-hidden="true" />
              <span>{t('contactUs')}</span>
            </button>

            {user ? (
              <>
                <NotificationDropdown 
                  onOpenMessages={(contactId) => onOpenDashboard('messages', userIsBrand ? 'brand' : 'creator', contactId)} 
                  onOpenDashboard={(tab, role, contactId) => onOpenDashboard(tab, role || (userIsBrand ? 'brand' : 'creator'), contactId)} 
                />

                <button
                  onClick={() => onOpenDashboard('messages', userIsBrand ? 'brand' : 'creator')}
                  onMouseEnter={() => preloadDashboardForRole(userIsBrand ? 'brand' : 'creator')}
                  onFocus={() => preloadDashboardForRole(userIsBrand ? 'brand' : 'creator')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition-colors font-bold text-xs border border-white/15 shadow-sm"
                  title={t('navMessages')}
                >
                  <MessageSquare className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                  <span>{t('navMessages')}</span>
                </button>

                {/* Show Add Campaign button ONLY for users who signed up as stores and companies */}
                {userCanCreateCampaign && (
                  <button
                    onClick={() => onOpenDashboard('create', 'brand')}
                    onMouseEnter={() => preloadDashboardForRole('brand')}
                    onFocus={() => preloadDashboardForRole('brand')}
                    className="btn-primary text-xs flex items-center gap-1.5 shadow-md shadow-brand-orange/30"
                    title={t('addCampaign')}
                  >
                    <PlusCircle className="w-4 h-4" aria-hidden="true" />
                    <span>{t('addCampaign')}</span>
                  </button>
                )}

                {/* Role-specific Dashboard buttons */}
                {userIsBrand && (
                  <button
                    onClick={() => onOpenDashboard('overview', 'brand')}
                    onMouseEnter={() => preloadDashboardForRole('brand')}
                    onFocus={() => preloadDashboardForRole('brand')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition-colors font-bold text-sm"
                  >
                    <Building2 className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                    <span>{t('brandDashboard')}</span>
                  </button>
                )}

                {userIsCreator && (
                  <button
                    onClick={() => onOpenDashboard('overview')}
                    onMouseEnter={() => preloadDashboardForRole('creator')}
                    onFocus={() => preloadDashboardForRole('creator')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-200 hover:text-white hover:bg-white/10 transition-colors font-bold text-sm"
                  >
                    <Sparkles className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                    <span>{t('creatorDashboard')}</span>
                  </button>
                )}

                {userIsAdmin && (
                  <button
                    onClick={() => onOpenDashboard('admin')}
                    onMouseEnter={() => preloadDashboardForRole('admin')}
                    onFocus={() => preloadDashboardForRole('admin')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-purple-300 hover:text-white hover:bg-white/10 transition-colors font-bold text-sm"
                  >
                    <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                    <span>{t('adminDashboard')}</span>
                  </button>
                )}

                <button
                  onClick={onOpenProfileSettings}
                  onMouseEnter={preloadProfileSettingsModal}
                  onFocus={preloadProfileSettingsModal}
                  className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm px-3 py-2 rounded-full hover:bg-white/10"
                >
                  <Settings className="w-4 h-4" aria-hidden="true" />
                  <span>{t('profileSettings')}</span>
                </button>

                <button
                  onClick={logout}
                  className="flex items-center gap-2 text-slate-300 hover:text-red-300 transition-colors text-sm px-3 py-2 rounded-full hover:bg-white/10"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>{t('logout')}</span>
                </button>

                <button 
                  type="button"
                  onClick={() => onOpenDashboard(userIsAdmin ? 'admin' : 'overview')}
                  onMouseEnter={() => preloadDashboardForRole(user?.role)}
                  onFocus={() => preloadDashboardForRole(user?.role)}
                  aria-label={user.user_metadata?.full_name || t('profileSettings')}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 cursor-pointer hover:scale-105 transition-transform ${userIsAdmin ? 'border-purple-500' : 'border-brand-orange'}`}
                  title={user.user_metadata?.full_name || 'Profile'}
                >
                  <OptimizedImage
                    src={user.profile?.avatar_url || user.user_metadata?.avatar_url}
                    fallbackType="user"
                    seed={user.user_metadata?.full_name || user.id}
                    alt={user.user_metadata?.full_name || 'User'}
                    width="40"
                    height="40"
                    className="w-full h-full object-cover"
                  />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('login')}
                  onMouseEnter={preloadAuthModal}
                  onFocus={preloadAuthModal}
                  className="text-slate-200 hover:text-white transition-colors text-sm font-bold px-4 py-2 rounded-full hover:bg-white/10"
                >
                  {t('login')}
                </button>
                <button
                  onClick={() => onOpenAuth('signup', 'creator')}
                  onMouseEnter={preloadAuthModal}
                  onFocus={preloadAuthModal}
                  className="btn-primary text-xs flex items-center gap-1.5 shadow-md shadow-brand-orange/30"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>{t('joinCreator')}</span>
                </button>
                <button
                  onClick={() => onOpenAuth('signup', 'brand')}
                  onMouseEnter={preloadAuthModal}
                  onFocus={preloadAuthModal}
                  className="btn-glass text-xs flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                  <span>{t('joinBrand')}</span>
                </button>
              </>
            )}
          </nav>

          {/* Mobile Action Controls (Simplified Native App Top Bar) */}
          <div className="md:hidden flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Notifications Icon */}
            {user && (
              <NotificationDropdown 
                onOpenMessages={(contactId) => onOpenDashboard('messages', userIsBrand ? 'brand' : 'creator', contactId)} 
                onOpenDashboard={(tab, role, contactId) => onOpenDashboard(tab, role || (userIsBrand ? 'brand' : 'creator'), contactId)} 
              />
            )}

            {/* Mobile Language Selector Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextLang = language === 'ar' ? 'fr' : language === 'fr' ? 'en' : 'ar';
                setLanguage(nextLang);
              }}
              aria-label={t('changeLanguage')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 active:scale-95 transition-all"
            >
              <Globe className="w-3.5 h-3.5 text-brand-orange" />
              <span className="uppercase text-[11px] font-mono">{language}</span>
            </button>

            {/* Mobile Secondary Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? t('closeMenu') : t('openMenu')}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              className="text-white hover:text-brand-orange p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <nav id="mobile-navigation" aria-label={t('mobileMenu')} className="md:hidden bg-[#070E1A]/98 backdrop-blur-xl border-b border-white/10 px-4 py-5 space-y-4 text-white animate-scale-in">
          {user ? (
            <>
              {/* User Identity Snippet */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-brand-orange shrink-0">
                  <OptimizedImage
                    src={user.profile?.avatar_url || user.user_metadata?.avatar_url}
                    fallbackType="user"
                    seed={user.user_metadata?.full_name || user.id}
                    alt={user.user_metadata?.full_name || 'User'}
                    width="44"
                    height="44"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white truncate">
                    {user.profile?.full_name || user.profile?.brand_name || user.user_metadata?.full_name || t('defaultUser')}
                  </h4>
                  <span className="text-[11px] text-brand-orange font-bold uppercase">
                    {userIsAdmin ? t('adminDashboard') : userIsBrand ? t('brandDashboard') : t('creatorDashboard')}
                  </span>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenProfileSettings(); }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 flex items-center justify-between font-bold text-xs border border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-brand-orange" />
                    <span>{t('profileSettings')}</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">{t('edit')}</span>
                </button>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenContact?.(); }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 flex items-center justify-between font-bold text-xs border border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-brand-orange" />
                    <span>{t('contactSupport')}</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">{t('help')}</span>
                </button>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 flex items-center justify-center gap-2 font-bold text-xs border border-red-500/20 transition-colors mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenAuth('login'); }}
                className="w-full py-3 rounded-full bg-white/10 text-white font-bold text-sm border border-white/15 active:scale-98 transition-all"
              >
                {t('login')}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenAuth('signup', 'creator'); }}
                  className="btn-primary py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold shadow-md shadow-brand-orange/30"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t('joinCreator')}</span>
                </button>
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenAuth('signup', 'brand'); }}
                  className="btn-glass py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold"
                >
                  <Building2 className="w-4 h-4 text-brand-orange" />
                  <span>{t('joinBrand')}</span>
                </button>
              </div>
              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenContact?.(); }}
                className="w-full py-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center gap-2 text-xs font-bold mt-2"
              >
                <Mail className="w-3.5 h-3.5 text-brand-orange" />
                <span>{t('contactSupportHelp')}</span>
              </button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;
