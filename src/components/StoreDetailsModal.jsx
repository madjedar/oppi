import React, { useEffect, useState } from 'react';
import { X, MapPin, Star, Building2, BadgeCheck, Briefcase, Send, CheckCircle2, ShieldCheck, ExternalLink, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatDZD } from '../services/chargilyService';
import { getLocalizedItem } from '../utils/localized';
import OptimizedImage from './OptimizedImage';
import { canViewCampaignDirectory } from '../utils/authGuards';

export default function StoreDetailsModal({ isOpen, onClose, store, user, onApplyCampaign }) {
  const { t, language } = useLanguage();
  const [storeCampaigns, setStoreCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!store) return;
      setLoading(true);
      try {
        const { getCampaigns } = await import('../services/dbService');
        const allCampaigns = await getCampaigns();
        
        const storeNames = [
          store.brand_name, 
          store.name, 
          store.full_name,
          typeof store.name === 'object' ? store.name.ar : null,
          typeof store.name === 'object' ? store.name.en : null,
          typeof store.name === 'object' ? store.name.fr : null,
        ].filter(Boolean).map(n => String(n).trim().toLowerCase());

        // Filter campaigns where brand_id matches store.id or brand name matches
        const myCampaigns = allCampaigns.filter(c => {
          if (c.brand_id && store.id && c.brand_id === store.id) return true;
          if (c.brand_id === store.id) return true;
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

        const combinedCampaigns = [
          ...myCampaigns,
          ...(Array.isArray(store.campaigns) ? store.campaigns : [])
        ].filter((c, idx, arr) => arr.findIndex(item => item.id === c.id || item.title === c.title) === idx);
        
        setStoreCampaigns(combinedCampaigns);
      } catch (error) {
        console.error("Error fetching store campaigns:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen) {
      fetchCampaigns();
    }
  }, [isOpen, store]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !store || !canViewCampaignDirectory(user)) return null;

  const storeName = getLocalizedItem(store, 'name', language);
  const storeSector = getLocalizedItem(store, 'sector', language);
  const storeLocation = getLocalizedItem(store, 'location', language);
  const storeBio = getLocalizedItem(store, 'bio', language);

  const displayCampaigns = storeCampaigns;

  const activeCampaignsList = storeCampaigns.filter(c => 
    c.status !== 'completed' && c.status !== 'paused' && c.status !== 'cancelled'
  );
  const activeCampaignsCount = activeCampaignsList.length > 0 
    ? activeCampaignsList.length 
    : (storeCampaigns.length > 0 ? storeCampaigns.length : (Number(store.activeCampaigns) || 0));

  const calculatedBudget = (activeCampaignsList.length > 0 ? activeCampaignsList : storeCampaigns)
    .reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
  const displayTotalBudget = calculatedBudget > 0 
    ? calculatedBudget 
    : (Number(store.totalBudget) || 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-overlay overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-modal-title"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl animate-scale-in flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Close button */}
        <button 
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="absolute z-20 p-2 text-brand-brownLight top-3.5 sm:top-4 start-3.5 sm:start-4 bg-white/90 rounded-full hover:bg-brand-cream hover:text-brand-brown transition-all backdrop-blur-md shadow-sm active:scale-95"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="overflow-y-auto p-5 sm:p-8 scrollbar-thin scrollbar-thumb-brand-border space-y-6 sm:space-y-8 flex-1 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] sm:pb-8">
          {/* Header & Logo */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6 text-center md:text-start border-b border-brand-border pb-6 pt-2 sm:pt-0">
            <div className="relative shrink-0">
              <OptimizedImage 
                src={store.logo} 
                fallbackType="brand"
                seed={store.name}
                alt={storeName} 
                width="112"
                height="112"
                className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover bg-brand-cream p-2 border border-brand-border shadow-md"
              />
              {store.verified && (
                <div className="absolute -bottom-1 -end-1 bg-blue-500 rounded-full p-1 border-2 border-white shadow-sm text-white">
                  <BadgeCheck className="w-5 h-5" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <h2 id="store-modal-title" className="text-2xl sm:text-3xl font-black text-brand-brown flex items-center justify-center md:justify-start gap-2">
                {storeName}
              </h2>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs sm:text-sm text-brand-brownLight">
                <span className="flex items-center gap-1 font-medium">
                  <Building2 className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                  {storeSector}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-4 h-4 text-brand-orange" aria-hidden="true" />
                  {storeLocation}
                </span>
                {store.rating && store.reviewCount > 0 ? (
                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star className="w-4 h-4 fill-amber-500" aria-hidden="true" />
                    <span className="font-bold text-brand-brown">{store.rating}</span>
                    <span className="text-brand-brownLight">({store.reviewCount})</span>
                  </span>
                ) : null}
              </div>

              <p className="text-xs sm:text-sm text-brand-brownLight leading-relaxed max-w-lg mt-2 font-medium">
                {storeBio}
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 bg-white border border-brand-border rounded-2xl text-center shadow-sm">
              <span className="text-[11px] sm:text-xs text-brand-brownLight font-medium block mb-1">{t('activeCampaignsCount')}</span>
              <span className="text-xl sm:text-2xl font-black text-brand-orange">
                {activeCampaignsCount} {t('campaignsPlural')}
              </span>
            </div>
            <div className="p-3.5 sm:p-4 bg-white border border-brand-border rounded-2xl text-center shadow-sm">
              <span className="text-[11px] sm:text-xs text-brand-brownLight font-medium block mb-1">{t('budgetOffer')}</span>
              <span className="text-xl sm:text-2xl font-black text-brand-orange">{formatDZD(displayTotalBudget, language)}</span>
            </div>
          </div>

          {/* Store Campaigns Section */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-black text-brand-brown flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-brand-orange" />
              {t('availableOpportunities')}
            </h3>

            {displayCampaigns.length === 0 ? (
              <div className="text-center py-8 bg-brand-cream/30 rounded-2xl border border-brand-border/60 p-6">
                <p className="text-xs text-brand-brownLight font-medium">
                  {t('noStoreCampaigns')}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 sm:space-y-4">
                {displayCampaigns.map((campaign) => {
                  const campaignTitle = getLocalizedItem(campaign, 'title', language);
                  const campaignDesc = getLocalizedItem(campaign, 'description', language);
                  const campaignDeliverables = (campaign.deliverables && campaign.deliverables[language]) || campaign.deliverables?.ar || campaign.deliverables || [];

                  return (
                    <div key={campaign.id} className="bg-white p-4 sm:p-5 border border-brand-border rounded-[24px] flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-brand-brown text-sm sm:text-base">{campaignTitle}</h4>
                          <p className="text-xs text-brand-brownLight mt-1 leading-relaxed font-medium line-clamp-2">{campaignDesc}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-brand-orange/10 text-brand-orange border border-brand-orange/20 whitespace-nowrap">
                          {formatDZD(campaign.budget, language)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-brand-border">
                        {(Array.isArray(campaignDeliverables) ? campaignDeliverables : (typeof campaignDeliverables === 'string' ? [campaignDeliverables] : [])).map((deliv, idx) => (
                          <span key={idx} className="px-2.5 py-0.5 rounded-md bg-brand-cream border-brand-border text-brand-brownLight text-[11px] sm:text-xs border font-medium">
                            ✓ {deliv}
                          </span>
                        ))}
                      </div>

                      {/* Full-width thumb-friendly CTA button with min-h-[48px] */}
                      <button 
                        type="button"
                        onClick={() => onApplyCampaign(campaign)}
                        className="btn-primary w-full min-h-[48px] h-12 py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-md shadow-brand-orange/20 active:scale-98 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        <span>{t('applyNow')}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Guarantee Security Note */}
          <div className="p-4 rounded-2xl bg-brand-cream border border-brand-border text-xs text-brand-brownLight flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-brand-orange shrink-0" />
            <div>
              <span className="font-bold text-brand-brown block">{t('checkoutTerms')}</span>
              <span className="font-medium mt-0.5 block">{t('oppiEscrowProtectionGuarantee')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
