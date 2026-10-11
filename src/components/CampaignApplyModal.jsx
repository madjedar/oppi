import React, { useState, useEffect } from 'react';
import { 
  X, Send, Sparkles, CheckCircle2, AlertCircle, 
  Building2, Calendar, DollarSign, Clock, Link as LinkIcon, ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { canApplyToCampaign } from '../utils/authGuards';
import { formatDZD } from '../services/chargilyService';
import { getLocalizedItem, getLocalizedDeliverable } from '../utils/localized';
import { validateApplicationForm, sanitizeText } from '../utils/validators';

export default function CampaignApplyModal({ 
  isOpen, 
  onClose, 
  campaign, 
  onSuccess 
}) {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [pitch, setPitch] = useState('');
  const [sampleUrl, setSampleUrl] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('5');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPitch('');
      setSampleUrl('');
      setDeliveryDays('5');
      setErrorMessage('');
      setSuccess(false);
    }
  }, [isOpen, campaign]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !campaign) return null;

  const campaignTitle = getLocalizedItem(campaign, 'title', language) || campaign.title || t('defaultCampaignTitle');
  const campaignCategory = getLocalizedItem(campaign, 'category', language) || campaign.category || t('general');
  const campaignDesc = getLocalizedItem(campaign, 'description', language) || campaign.description || '';
  const brandName = campaign.brand?.brand_name || campaign.brand?.full_name || campaign.brand_name || t('defaultBrandName');
  const deliverables = campaign.deliverables 
    ? (Array.isArray(campaign.deliverables) ? campaign.deliverables : [campaign.deliverables])
    : ['post', 'reel'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      setErrorMessage(t('applyLoginRequired'));
      return;
    }
    if (!canApplyToCampaign(user)) {
      setErrorMessage(t('onlyCreatorsCanApplyMsg'));
      return;
    }

    const validation = validateApplicationForm({ pitch, sampleUrl, deliveryDays });
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setErrorMessage(firstError);
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const { applyToCampaign, createNotification } = await import('../services/dbService');
      
      const pitchPayload = {
        pitch_text: sanitizeText(pitch, 1000),
        portfolio_url: sampleUrl.trim() || null,
        delivery_days: Number(deliveryDays) || 5
      };

      await applyToCampaign(campaign.id, user.id, pitchPayload);

      // Send in-app notification to brand owner
      if (campaign.brand_id) {
        try {
          await createNotification(
            campaign.brand_id,
            t('newApplicationOnCampaign'),
            `${user?.profile?.full_name || user?.user_metadata?.full_name || t('defaultCreatorName')} - "${campaignTitle}".`
          );
        } catch (notifErr) {
          console.warn('Could not dispatch in-app notification to brand:', notifErr);
        }
      }

      setSuccess(true);
      if (onSuccess) onSuccess(campaign);

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Error submitting campaign application:', err);
      if (err?.code === '23505') {
        setErrorMessage(t('alreadyApplied'));
      } else {
        setErrorMessage(err?.message || t('applicationError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-apply-modal-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-[32px] sm:rounded-2xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-brand-border animate-scale-in relative max-h-[92vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-8"
        onClick={(e) => e.stopPropagation()}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 shrink-0" />

        {/* Close Button */}
        <button 
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="absolute top-3.5 sm:top-5 start-3.5 sm:start-5 p-2 text-brand-brownLight hover:text-brand-brown rounded-full hover:bg-brand-cream transition-colors active:scale-95"
          title={t('close')}
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-brand-border pt-1 sm:pt-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[16px] bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold shadow-inner shrink-0">
            <Sparkles className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="campaign-apply-modal-title" className="text-lg sm:text-xl font-black text-brand-brown truncate">
              {t('applyModalTitle')}
            </h2>
            <p className="text-xs font-medium text-brand-brownLight mt-0.5 truncate">
              {brandName} • {campaignCategory}
            </p>
          </div>
        </div>

        {/* Campaign Summary Card */}
        <div className="p-3.5 sm:p-4 rounded-[20px] bg-brand-cream/80 border border-brand-border mb-5 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-black text-brand-brown text-sm line-clamp-1">{campaignTitle}</h4>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-brand-orange text-white font-mono shadow-sm shrink-0">
              {formatDZD(campaign.budget, language)}
            </span>
          </div>

          {campaignDesc && (
            <p className="text-xs text-brand-brownLight line-clamp-2 leading-relaxed">
              {campaignDesc}
            </p>
          )}

          <div className="pt-2 border-t border-brand-border/60 flex flex-wrap gap-1.5">
            {deliverables.map((deliv, idx) => (
              <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-brand-brown border border-brand-border/60">
                ✓ {getLocalizedDeliverable(deliv, language)}
              </span>
            ))}
          </div>
        </div>

        {/* Success State */}
        {success ? (
          <div role="status" aria-live="polite" className="p-8 text-center bg-emerald-50 rounded-[24px] border border-emerald-200 animate-scale-in">
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-3 animate-bounce" aria-hidden="true" />
            <h3 className="font-black text-emerald-800 text-lg mb-1">{t('applySuccessTitle')}</h3>
            <p className="text-emerald-700 text-xs">
              {t('applySuccessDesc')}
            </p>
          </div>
        ) : (
          /* Application Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pitch Textarea */}
            <div>
              <label htmlFor="apply-pitch-input" className="block text-xs font-bold text-brand-brown mb-1.5">
                {t('pitchLabel')}
              </label>
              <textarea
                id="apply-pitch-input"
                rows={3}
                placeholder={t('pitchPlaceholder')}
                className="input-field w-full text-xs leading-relaxed p-3 rounded-xl"
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            {/* Sample Link */}
            <div>
              <label htmlFor="apply-sample-url-input" className="block text-xs font-bold text-brand-brown mb-1.5">
                {t('sampleLink')}
              </label>
              <div className="relative">
                <LinkIcon className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-brownLight" aria-hidden="true" />
                <input
                  id="apply-sample-url-input"
                  type="url"
                  placeholder="https://instagram.com/reel/example"
                  className="input-field w-full ps-10 text-xs font-mono text-start"
                  value={sampleUrl}
                  onChange={(e) => setSampleUrl(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Delivery Days Timeline */}
            <div>
              <label className="block text-xs font-bold text-brand-brown mb-1.5">
                {t('deliveryTimeline')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: '3', label: `3 ${t('daysPlural')}` },
                  { value: '5', label: `5 ${t('daysPlural')}` },
                  { value: '7', label: `7 ${t('daysPlural')}` },
                  { value: '10', label: `10 ${t('daysPlural')}` }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDeliveryDays(option.value)}
                    disabled={submitting}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all min-h-[44px] flex items-center justify-center ${
                      deliveryDays === option.value
                        ? 'bg-brand-orange text-white border-brand-orange shadow-sm scale-[1.02]'
                        : 'bg-brand-cream/60 text-brand-brownLight border-brand-border hover:border-brand-orange/40 active:scale-95'
                    } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Escrow Guarantee Pill */}
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span>{t('campaignBudgetEscrowGuaranteed')}</span>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button with min-h-[48px] touch target */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full min-h-[48px] h-12 py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/20 mt-2 active:scale-98 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? t('submitting') : t('sendApplication')}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
