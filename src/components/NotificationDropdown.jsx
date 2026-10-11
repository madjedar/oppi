import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, CheckCircle2, MessageSquare, Briefcase, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function NotificationDropdown({ onOpenMessages, onOpenDashboard }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    import('../services/dbService').then(({ getNotifications, subscribeToNotifications }) => {
      if (!isMounted) return;
      getNotifications(user.id).then(fetched => {
        if (isMounted) setNotifications(fetched || []);
      }).catch(err => console.error("Error fetching notifications:", err));

      subscriptionRef.current = subscribeToNotifications(user.id, (newNotif) => {
        if (isMounted) setNotifications(prev => [newNotif, ...prev]);
      });
    });

    return () => {
      isMounted = false;
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const { markNotificationRead } = await import('../services/dbService');
      await markNotificationRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const isMessageNotif = (notif) => {
    const tStr = (notif?.title || '').toLowerCase();
    const mStr = (notif?.message || '').toLowerCase();
    return notif?.type === 'message' || tStr.includes('\u0631\u0633\u0627\u0644\u0629') || mStr.includes('\u0631\u0633\u0627\u0644\u0629') || tStr.includes('message') || mStr.includes('message');
  };

  const isAcceptedNotif = (notif) => {
    const tStr = (notif?.title || '').toLowerCase();
    return tStr.includes('\u0642\u0628\u0648\u0644') || tStr.includes('\u0645\u0628\u0631\u0648\u0643') || tStr.includes('accept') || tStr.includes('congrat') || tStr.includes('félicit');
  };

  const isCampaignNotif = (notif) => {
    const tStr = (notif?.title || '').toLowerCase();
    return tStr.includes('\u062d\u0645\u0644\u0629') || tStr.includes('\u062a\u0642\u062f\u064a\u0645') || tStr.includes('campaign') || tStr.includes('apply') || tStr.includes('candidat');
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);

    if (isMessageNotif(notif)) {
      let targetContactId = null;
      if (user?.id) {
        try {
          const { getUserConversations } = await import('../services/dbService');
          const convos = await getUserConversations(user.id);
          if (convos && convos.length > 0) {
            targetContactId = convos[0].id;
          }
        } catch (e) {}
      }

      if (onOpenMessages) {
        onOpenMessages(targetContactId);
      } else if (onOpenDashboard) {
        onOpenDashboard('messages', user?.role || 'creator', targetContactId);
      }
    } else if (isCampaignNotif(notif)) {
      if (onOpenDashboard) {
        onOpenDashboard('opportunities', user?.role || 'creator');
      }
    } else if (onOpenDashboard) {
      onOpenDashboard('overview', user?.role || 'creator');
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    try {
      const { markNotificationRead } = await import('../services/dbService');
      await Promise.all(unreadIds.map(id => markNotificationRead(id)));
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatNotificationDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const locale = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
      return d.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`${t('notifications')} ${unreadCount > 0 ? `(${unreadCount} ${t('newNotificationsCount')})` : ''}`}
        className="relative p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        title={t('notifications')}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-orange rounded-full ring-2 ring-[#070E1A] animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div 
          role="region" 
          aria-label={t('notificationsPanel')}
          className="absolute top-full start-0 sm:end-0 sm:start-auto mt-2 w-80 sm:w-96 bg-[#0B1528] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in" 
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span>{t('notifications')}</span>
              {unreadCount > 0 && (
                <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full">
                  {unreadCount} {t('newNotificationsCount')}
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button 
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                {t('markAllAsRead')}
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-3">
                <BellOff className="w-8 h-8 opacity-50" />
                <span className="text-sm">{t('noNewNotifications')}</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border-b border-white/5 flex gap-3 cursor-pointer transition-colors ${
                    notif.read ? 'opacity-70 hover:bg-white/5' : 'bg-blue-500/10 hover:bg-blue-500/20'
                  }`}
                  title={t('clickToOpenConversation')}
                >
                  <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isMessageNotif(notif) ? 'bg-blue-500/20 text-blue-400' :
                    isAcceptedNotif(notif) ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {isMessageNotif(notif) ? <MessageSquare className="w-4 h-4" /> :
                     isAcceptedNotif(notif) ? <CheckCircle2 className="w-4 h-4" /> :
                     <Sparkles className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className={`text-sm ${notif.read ? 'text-slate-300' : 'text-white font-bold'}`}>
                        {notif.title}
                      </h4>
                      {isMessageNotif(notif) && (
                        <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-medium shrink-0">
                          {t('openConversationArrow')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-2 line-clamp-2">{notif.message}</p>
                    <span className="text-[10px] text-slate-500 block">
                      {formatNotificationDate(notif.created_at)}
                    </span>
                  </div>
                  {!notif.read && (
                    <div className="ms-auto flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
