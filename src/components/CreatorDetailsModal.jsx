import React, { useEffect } from 'react';
import { X, MapPin, Star, Play, Camera, ExternalLink, BadgeCheck, Users, Handshake, MessageSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatDZD } from '../services/chargilyService';
import { getLocalizedItem } from '../utils/localized';
import { safeHref } from '../utils/validators';
import { canViewCreatorProfile, canHireCreator } from '../utils/authGuards';
import OptimizedImage from './OptimizedImage';

export default function CreatorDetailsModal({ isOpen, onClose, creator, user, onHire, onContact }) {
  const { t, language } = useLanguage();

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !creator || !canViewCreatorProfile(user, creator.id)) return null;

  const creatorRate = Number(creator.ratePerPost || creator.rate_per_post || 0);
  const completedDeals = creator.completedDeals ?? creator.completed_deals ?? 0;
  const hasRating = Boolean(creator.rating && creator.reviewCount > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-overlay overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="creator-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl animate-scale-in flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Close button with logical positioning */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="absolute z-20 p-2 text-brand-brownLight top-3.5 sm:top-4 start-3.5 sm:start-4 bg-white/90 rounded-full hover:bg-brand-cream hover:text-brand-brown transition-all backdrop-blur-md shadow-sm active:scale-95"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-5 sm:p-8 scrollbar-thin scrollbar-thumb-brand-border space-y-6 flex-1">
          {/* Profile Header Card */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6 text-center md:text-start pt-2 sm:pt-0">
            <div className="relative shrink-0">
              <OptimizedImage
                src={creator.avatar}
                fallbackType="creator"
                seed={creator.name}
                alt={typeof creator.name === 'object' ? getLocalizedItem(creator, 'name', language) : creator.name}
                width="128"
                height="128"
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg bg-brand-cream"
              />
              {creator.verified && (
                <div className="absolute bottom-1 end-1 bg-blue-500 rounded-full p-1 border-2 border-white shadow-sm text-white">
                  <BadgeCheck className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <h2 id="creator-modal-title" className="text-2xl sm:text-3xl font-black text-brand-brown flex items-center justify-center md:justify-start gap-2">
                {getLocalizedItem(creator, 'name', language)}
              </h2>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs sm:text-sm text-brand-brownLight">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                  {getLocalizedItem(creator, 'location', language) || creator.wilaya || t('algeria')}
                </span>
                <span className="px-3 py-1 bg-brand-cream border border-brand-border rounded-full text-brand-brown font-semibold">
                  {getLocalizedItem(creator, 'category', language) || t('defaultCreatorName')}
                </span>
                {hasRating ? (
                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star className="w-4 h-4 fill-amber-500" aria-hidden="true" />
                    <span className="font-bold text-brand-brown">{creator.rating}</span>
                    <span className="text-brand-brownLight">({creator.reviewCount})</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-slate-600 font-semibold text-xs">
                    {t('newCreatorBadge')}
                  </span>
                )}
              </div>

              {/* Bio */}
              <p className="mt-3 text-brand-brownLight leading-relaxed max-w-lg text-xs sm:text-sm font-medium">
                {getLocalizedItem(creator, 'bio', language)}
              </p>
            </div>
          </div>

          {/* Real Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
            <div className="p-3 sm:p-4 text-center bg-white border border-brand-border rounded-2xl shadow-sm">
              <Handshake className="w-5 h-5 mx-auto mb-1.5 text-brand-orange" />
              <div className="text-lg sm:text-2xl font-black text-brand-brown font-mono">{completedDeals}</div>
              <div className="text-[11px] sm:text-xs text-brand-brownLight mt-0.5 font-medium">{t('creatorDeals')}</div>
            </div>
            <div className="p-3 sm:p-4 text-center bg-white border border-brand-border rounded-2xl shadow-sm">
              <Users className="w-5 h-5 mx-auto mb-1.5 text-brand-orange" />
              <div className="text-lg sm:text-2xl font-black text-brand-orange font-mono">
                {creatorRate > 0 ? formatDZD(creatorRate, language) : t('negotiablePrice')}
              </div>
              <div className="text-[11px] sm:text-xs text-brand-brownLight mt-0.5 font-medium">{t('creatorRate')}</div>
            </div>
            <div className="p-3 sm:p-4 text-center bg-white border border-brand-border rounded-2xl shadow-sm col-span-2 sm:col-span-1">
              <MapPin className="w-5 h-5 mx-auto mb-1.5 text-brand-orange" />
              <div className="text-sm sm:text-base font-bold text-brand-brown truncate mt-1">
                {getLocalizedItem(creator, 'location', language) || creator.wilaya || t('algeria')}
              </div>
              <div className="text-[11px] sm:text-xs text-brand-brownLight mt-0.5 font-medium">{t('wilayaLabel')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Social Links */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-sm sm:text-base text-brand-brown mb-2">{t('platformsAndSocial')}</h3>
              {creator.youtube_url || creator.social_links?.youtube ? (
                <a
                  href={safeHref(creator.youtube_url || creator.social_links?.youtube)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white border border-brand-border rounded-2xl hover:bg-brand-cream transition-colors group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-500 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors">
                      <Play className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-brand-brown">YouTube</span>
                  </div>
                  <span className="text-brand-orange text-xs font-semibold flex items-center gap-1 group-hover:underline">
                    {t('visitProfile')} <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </a>
              ) : null}

              {creator.instagram_url || creator.social_links?.instagram ? (
                <a
                  href={safeHref(creator.instagram_url || creator.social_links?.instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white border border-brand-border rounded-2xl hover:bg-brand-cream transition-colors group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 text-pink-500 rounded-xl group-hover:bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 group-hover:text-white transition-all">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-brand-brown">Instagram</span>
                  </div>
                  <span className="text-brand-orange text-xs font-semibold flex items-center gap-1 group-hover:underline">
                    {t('visitProfile')} <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </a>
              ) : null}

              {creator.tiktok_url || creator.social_links?.tiktok ? (
                <a
                  href={safeHref(creator.tiktok_url || creator.social_links?.tiktok)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white border border-brand-border rounded-2xl hover:bg-brand-cream transition-colors group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-cream text-brand-brown rounded-xl group-hover:bg-brand-brown group-hover:text-white transition-colors">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 15.68a6.34 6.34 0 0 0 6.27 6.28A6.34 6.34 0 0 0 17.62 16v-6.32a8.21 8.21 0 0 0 4.19 1.15V7.27a4.91 4.91 0 0 1-2.22-.58z" /></svg>
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-brand-brown">TikTok</span>
                  </div>
                  <span className="text-brand-orange text-xs font-semibold flex items-center gap-1 group-hover:underline">
                    {t('visitProfile')} <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </a>
              ) : null}

              {!creator.youtube_url && !creator.instagram_url && !creator.tiktok_url && !creator.social_links?.youtube && !creator.social_links?.instagram && !creator.social_links?.tiktok && (
                <p className="text-xs text-brand-brownLight font-medium p-3 bg-brand-cream/50 rounded-2xl border border-brand-border">
                  {t('connectSocialAccounts')}
                </p>
              )}
            </div>

            {/* Rate Card */}
            <div>
              <h3 className="font-bold text-sm sm:text-base text-brand-brown mb-2">{t('creatorRate')}</h3>
              <div className="h-[calc(100%-2rem)] min-h-[140px] p-5 flex flex-col justify-center items-center bg-brand-cream border border-brand-border rounded-2xl relative overflow-hidden group">
                <div className="relative z-10 text-center">
                  <span className="block text-brand-brownLight text-xs font-medium mb-1.5">{t('deliveryStartsAt')}</span>
                  {creatorRate > 0 ? (
                    <span className="text-3xl sm:text-4xl font-black text-brand-orange block mb-2 font-mono">
                      {formatDZD(creatorRate, language)}
                    </span>
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black text-brand-brown block mb-2">
                      {t('negotiablePrice')}
                    </span>
                  )}
                  <div className="px-3.5 py-1 bg-white border border-brand-border rounded-full text-[11px] font-bold text-brand-brown inline-block shadow-sm">
                    {t('negotiablePerCampaign')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Sticky Bottom Strip on Mobile, Static on Desktop */}
        {canHireCreator(user) && <div className="p-3.5 sm:p-6 border-t border-brand-border bg-white/95 backdrop-blur-md flex flex-col sm:flex-row gap-2.5 sm:gap-3 shrink-0 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] sm:shadow-none">
          <button
            type="button"
            onClick={() => onHire(creator)}
            className="flex-1 min-h-[48px] h-12 py-3 px-6 rounded-full font-bold btn-primary flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 active:scale-98 transition-all"
          >
            <Handshake className="w-5 h-5" />
            <span>{t('creatorHire')}</span>
          </button>
          <button
            type="button"
            onClick={() => onContact && onContact(creator)}
            className="flex-1 sm:flex-none min-h-[48px] h-12 py-3 px-6 rounded-full font-bold text-brand-brown bg-white border border-brand-border hover:bg-brand-cream transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98"
          >
            <MessageSquare className="w-4 h-4 text-brand-orange" />
            <span>{t('creatorContact')}</span>
          </button>
        </div>}
      </div>
    </div>
  );
}
