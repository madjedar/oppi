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
          <nav aria-label="التنقل الرئيسي" className="hidden md:flex items-center gap-4">
            
            {/* Language Switcher */}
            <div className="relative" ref={langMenuRef}>
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                aria-haspopup="true"
                aria-expanded={isLangMenuOpen}
                aria-label="تغيير لغة العرض"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors font-bold text-sm"
              >
                <Globe className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                <span className="uppercase">{language}</span>
              </button>
              {isLangMenuOpen && (
                <div role="menu" className="absolute top-full mt-2 w-32 bg-[#0B1528] border border-white/15 rounded-[20px] shadow-2xl overflow-hidden py-1 z-50 ltr:right-0 rtl:left-0 text-white">
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
              aria-label="تواصل معنا"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors font-bold text-xs"
              title="تواصل معنا"
            >
              <Mail className="w-4 h-4 text-brand-orange" aria-hidden="true" />
              <span>تواصل معنا</span>
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
                  title="الرسائل والمحادثات"
                >
                  <MessageSquare className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                  <span>الرسائل</span>
                </button>

                {/* Show Add Campaign button ONLY for users who have a Store / Projects account */}
                {userCanCreateCampaign && (
                  <button
                    onClick={() => onOpenDashboard('create', 'brand')}
                    onMouseEnter={() => preloadDashboardForRole('brand')}
                    onFocus={() => preloadDashboardForRole('brand')}
                    className="btn-primary text-xs flex items-center gap-1.5 shadow-md shadow-brand-orange/30"
                    title="إضافة حملة جديدة"
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
                  <span>{t('profileSettings') || 'الملف الشخصي'}</span>
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
                  onClick={() => onOpenDashboard(isAdmin ? 'admin' : 'overview')}
                  onMouseEnter={() => preloadDashboardForRole(user?.role)}
                  onFocus={() => preloadDashboardForRole(user?.role)}
                  aria-label={user.user_metadata?.full_name || 'الملف الشخصي'}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 cursor-pointer hover:scale-105 transition-transform ${isAdmin ? 'border-purple-500' : 'border-brand-orange'}`}
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

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "إغلاق القائمة الرئيسية" : "فتح القائمة الرئيسية"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              className="text-white hover:text-brand-orange p-2 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <nav id="mobile-navigation" aria-label="قائمة الجوال" className="md:hidden bg-[#070E1A]/98 backdrop-blur-xl border-b border-white/10 px-4 py-6 space-y-4 text-white">
          {/* Mobile Language Switcher */}
          <div className="flex items-center gap-2 mb-4 bg-white/10 p-2 rounded-full border border-white/10 justify-center">
            <button onClick={() => { setLanguage('ar'); setIsMobileMenuOpen(false); }} className={`flex-1 py-2 rounded-full text-sm font-bold ${language === 'ar' ? 'bg-brand-orange text-white' : 'text-slate-300'}`}>العربية</button>
            <button onClick={() => { setLanguage('fr'); setIsMobileMenuOpen(false); }} className={`flex-1 py-2 rounded-full text-sm font-bold ${language === 'fr' ? 'bg-brand-orange text-white' : 'text-slate-300'}`}>Français</button>
            <button onClick={() => { setLanguage('en'); setIsMobileMenuOpen(false); }} className={`flex-1 py-2 rounded-full text-sm font-bold ${language === 'en' ? 'bg-brand-orange text-white' : 'text-slate-300'}`}>English</button>
          </div>

          {user ? (
            <>
              {/* Show Add Campaign button ONLY for users who have a Store / Projects account */}
              {userCanCreateCampaign && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenDashboard('create', 'brand'); }}
                  className="btn-primary w-full flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/30"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>{t('addCampaign')}</span>
                </button>
              )}

              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenDashboard('messages', userIsBrand ? 'brand' : 'creator'); }}
                className="w-full py-3 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 font-bold border border-white/10"
              >
                <MessageSquare className="w-5 h-5 text-brand-orange" />
                <span>الرسائل والمحادثات</span>
              </button>

              {userIsBrand && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenDashboard('overview', 'brand'); }}
                  className="w-full py-3 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 font-bold border border-white/10"
                >
                  <Building2 className="w-5 h-5 text-brand-orange" />
                  <span>{t('brandDashboard')}</span>
                </button>
              )}

              {userIsCreator && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenDashboard('overview'); }}
                  className="w-full py-3 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 font-bold border border-white/10"
                >
                  <Sparkles className="w-5 h-5 text-brand-orange" />
                  <span>{t('creatorDashboard')}</span>
                </button>
              )}

              {userIsAdmin && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); onOpenDashboard('admin'); }}
                  className="w-full py-3 rounded-full bg-purple-900/40 text-purple-200 border border-purple-500/30 flex items-center justify-center gap-2 font-bold shadow-sm"
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span>{t('adminDashboard')}</span>
                </button>
              )}

              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenProfileSettings(); }}
                className="w-full py-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 flex items-center justify-center gap-2 font-bold border border-white/10"
              >
                <Settings className="w-5 h-5 text-slate-400" />
                <span>{t('profileSettings') || 'الملف الشخصي'}</span>
              </button>

              <button
                onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                className="w-full py-2 text-slate-400 hover:text-red-400 flex items-center justify-center gap-2 text-sm font-bold"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('logout')}</span>
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenAuth('login'); }}
                className="w-full py-3 rounded-full bg-white/10 text-white font-bold border border-white/15"
              >
                {t('login')}
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenAuth('signup', 'creator'); }}
                className="btn-primary w-full flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/30"
              >
                <Sparkles className="w-5 h-5" />
                <span>{t('joinCreator')}</span>
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); onOpenAuth('signup', 'brand'); }}
                className="btn-glass w-full flex items-center justify-center gap-2"
              >
                <Building2 className="w-5 h-5 text-brand-orange" />
                <span>{t('joinBrand')}</span>
              </button>
            </div>
          )}
          {/* Mobile Contact Link */}
          <button
            onClick={() => { setIsMobileMenuOpen(false); onOpenContact?.(); }}
            className="w-full py-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center gap-2 text-xs font-bold"
          >
            <Mail className="w-4 h-4 text-brand-orange" aria-hidden="true" />
            <span>تواصل معنا (madjedalirachedi291@gmail.com)</span>
          </button>
        </nav>
      )}
    </header>
  );
};

export default Header;
