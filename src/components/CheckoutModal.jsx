import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Lock, CreditCard, CheckCircle, Loader2, Landmark, Smartphone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { canHireCreator } from '../utils/authGuards';
import { calculateFees, formatDZD, createCheckoutSession } from '../services/chargilyService';
import { getLocalizedItem, getLocalizedDeliverable } from '../utils/localized';

export default function CheckoutModal({ isOpen, onClose, creator, campaign, applicationId }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('edahabia');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setAgreed(false);
      setSuccess(false);
      setError(null);
      setPaymentMethod('edahabia');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseAmount = campaign?.budget || 25000;
  const { platformFee, total } = calculateFees(baseAmount);

  const handlePay = async () => {
    if (!agreed) return;

    if (!user) {
      setError(t('checkoutErrorLoginRequired'));
      return;
    }

    if (!canHireCreator(user)) {
      setError(t('checkoutErrorStoreOnly'));
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await createCheckoutSession({
        ...campaign,
        amount: total,
        paymentMethod
      });
      
      if (result.success && result.checkoutUrl) {
        // Save pending payment metadata locally so App.jsx can confirm when returned
        try {
          sessionStorage.setItem('pending_chargily_checkout', JSON.stringify({
            checkoutId: result.checkoutId,
            applicationId,
            creatorId: creator?.id,
            campaignTitle: campaign?.title
          }));
        } catch (e) {
          console.warn('Could not store pending checkout in session:', e);
        }

        if (applicationId) {
          const { updateApplicationStatus } = await import('../services/dbService');
          await updateApplicationStatus(applicationId, 'approved').catch(e => console.warn(e));
        }
        if (creator?.id) {
          const { createNotification } = await import('../services/dbService');
          await createNotification(
            creator.id,
            t('hiredInNewCampaign'),
            t('hiredInNewCampaignDesc')
          ).catch(e => console.warn(e));
        }
        // Redirect to Chargily Pay payment gateway
        window.location.href = result.checkoutUrl;
      } else {
        setError(result.error || t('checkoutError') || t('checkoutFailed'));
      }
    } catch (err) {
      setError(err.message || t('checkoutFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-overlay overflow-y-auto" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-2xl p-5 sm:p-8 max-h-[92vh] overflow-y-auto shadow-2xl animate-scale-in pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-8"
        onClick={(e) => e.stopPropagation()}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 shrink-0" />

        <button 
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="absolute z-10 text-brand-brownLight top-3.5 sm:top-4 start-3.5 sm:start-4 hover:text-brand-brown hover:bg-brand-cream p-2 rounded-full transition-colors bg-white/80 backdrop-blur-sm shadow-sm active:scale-95"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {success ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-10 text-center animate-fade-in-up">
            <CheckCircle className="w-16 h-16 text-brand-orange mb-4" aria-hidden="true" />
            <h2 id="checkout-modal-title" className="text-2xl font-bold text-brand-brown mb-2">{t('checkoutSuccessTitle')}</h2>
            <p className="text-brand-brownLight mb-6 text-sm">{t('checkoutSuccessDesc')}</p>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary w-full min-h-[48px] h-12 py-3 rounded-full font-bold"
            >
              {t('continue')}
            </button>
          </div>
        ) : (
          <>
            <h2 id="checkout-modal-title" className="mb-5 text-xl sm:text-2xl font-bold text-brand-brown pt-1 sm:pt-0">{t('checkoutTitle')}</h2>

            {/* Deal Summary */}
            <div className="p-4 mb-5 bg-brand-cream border border-brand-border rounded-2xl">
              <h3 className="mb-1.5 font-bold text-brand-brown text-base">{getLocalizedItem(campaign, 'title', language) || campaign?.title || t('defaultCampaignTitle')}</h3>
              <p className="text-xs text-brand-brownLight mb-2.5">{t('with')}: <span className="font-bold text-brand-brown">{getLocalizedItem(creator, 'name', language) || creator?.name || t('defaultCreatorName')}</span></p>
              <div className="flex flex-wrap gap-1.5">
                {((campaign?.deliverables && campaign?.deliverables[language]) || campaign?.deliverables?.ar || campaign?.deliverables || ['post', 'story']).map((item, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-white text-brand-brownLight border border-brand-border shadow-sm">
                    {getLocalizedDeliverable(item, language)}
                  </span>
                ))}
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="p-4 mb-5 rounded-2xl bg-brand-cream border border-brand-border space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-brand-brownLight">
                <span>{t('campaignCost')}</span>
                <span className="font-medium text-brand-brown">{formatDZD(baseAmount, language)}</span>
              </div>
              <div className="flex justify-between items-center text-brand-brownLight">
                <span>{t('escrowFee')}</span>
                <span className="font-medium text-brand-brown">{formatDZD(platformFee, language)}</span>
              </div>
              <div className="pt-2.5 mt-2.5 border-t border-brand-border flex justify-between items-center">
                <span className="font-bold text-brand-brown">{t('grandTotal')}</span>
                <span className="text-lg sm:text-xl font-black text-brand-orange">{formatDZD(total, language)}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-5">
              <h3 className="mb-2.5 text-xs sm:text-sm font-bold text-brand-brown">{t('selectPaymentMethod')}</h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('edahabia')}
                  disabled={loading}
                  className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border transition-all min-h-[52px] ${paymentMethod === 'edahabia' ? 'border-brand-orange bg-brand-orange/10 ring-2 ring-brand-orange/20 scale-[1.02]' : 'border-brand-border hover:border-brand-orange/50 bg-white hover:bg-brand-cream active:scale-95'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <CreditCard className={`w-6 h-6 sm:w-7 sm:h-7 mb-1 ${paymentMethod === 'edahabia' ? 'text-brand-orange' : 'text-brand-brownLight'}`} aria-hidden="true" />
                  <span className={`font-bold text-[11px] sm:text-xs text-center ${paymentMethod === 'edahabia' ? 'text-brand-orange' : 'text-brand-brownLight'}`}>{t('edahabiaCard')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('baridimob')}
                  disabled={loading}
                  className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border transition-all min-h-[52px] ${paymentMethod === 'baridimob' ? 'border-brand-orange bg-brand-orange/10 ring-2 ring-brand-orange/20 scale-[1.02]' : 'border-brand-border hover:border-brand-orange/50 bg-white hover:bg-brand-cream active:scale-95'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Smartphone className={`w-6 h-6 sm:w-7 sm:h-7 mb-1 ${paymentMethod === 'baridimob' ? 'text-brand-orange' : 'text-brand-brownLight'}`} aria-hidden="true" />
                  <span className={`font-bold text-[11px] sm:text-xs text-center ${paymentMethod === 'baridimob' ? 'text-brand-orange' : 'text-brand-brownLight'}`}>{t('baridimobApp')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cib')}
                  disabled={loading}
                  className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border transition-all min-h-[52px] ${paymentMethod === 'cib' ? 'border-brand-orange bg-brand-orange/10 ring-2 ring-brand-orange/20 scale-[1.02]' : 'border-brand-border hover:border-brand-orange/50 bg-white hover:bg-brand-cream active:scale-95'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Landmark className={`w-6 h-6 sm:w-7 sm:h-7 mb-1 ${paymentMethod === 'cib' ? 'text-brand-orange' : 'text-brand-brownLight'}`} aria-hidden="true" />
                  <span className={`font-bold text-[11px] sm:text-xs text-center ${paymentMethod === 'cib' ? 'text-brand-orange' : 'text-brand-brownLight'}`}>{t('cibCard')}</span>
                </button>
              </div>
            </div>

            {/* Escrow Flow Visual */}
            <div className="mb-5 relative">
              <div className="absolute top-1/2 inset-x-4 h-[2px] bg-brand-border -translate-y-1/2 z-0" />
              <div className="relative z-10 flex justify-between gap-1.5 sm:gap-2">
                <div className="flex-1 p-2 text-center rounded-xl bg-white border border-brand-border shadow-sm">
                  <div className="w-7 h-7 mx-auto mb-0.5 bg-brand-cream rounded-full flex items-center justify-center text-xs">💰</div>
                  <span className="text-[9px] sm:text-[10px] text-brand-brownLight font-medium block">{t('checkoutStep1')}</span>
                </div>
                <div className="flex-1 p-2 text-center rounded-xl bg-white border border-brand-orange/50 shadow-sm ring-1 ring-brand-orange/20">
                  <div className="w-7 h-7 mx-auto mb-0.5 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center text-xs">🔒</div>
                  <span className="text-[9px] sm:text-[10px] text-brand-brownLight font-medium block">{t('checkoutStep2')}</span>
                </div>
                <div className="flex-1 p-2 text-center rounded-xl bg-white border border-brand-border shadow-sm">
                  <div className="w-7 h-7 mx-auto mb-0.5 bg-brand-cream rounded-full flex items-center justify-center text-xs">✅</div>
                  <span className="text-[9px] sm:text-[10px] text-brand-brownLight font-medium block">{t('checkoutStep3')}</span>
                </div>
              </div>
            </div>

            {error && (
              <div role="alert" className="p-3 mb-4 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl">
                {error}
              </div>
            )}

            {/* Terms Checkbox */}
            <label className="flex items-start gap-2.5 mb-5 cursor-pointer group select-none">
              <div className="relative flex items-center pt-0.5 shrink-0">
                <input 
                  type="checkbox" 
                  className={`w-5 h-5 transition-all border-2 rounded bg-white border-brand-border checked:bg-brand-orange checked:border-brand-orange focus:ring-brand-orange/50 appearance-none ${loading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  disabled={loading}
                />
                <CheckCircle className={`absolute inset-0 w-5 h-5 text-white pointer-events-none transition-opacity ${agreed ? 'opacity-100' : 'opacity-0'}`} />
              </div>
              <span className="text-xs text-brand-brownLight group-hover:text-brand-brown transition-colors leading-relaxed">
                {t('checkoutTerms')}
              </span>
            </label>

            {/* Pay Button with min-h-[48px] */}
            <button
              type="button"
              onClick={handlePay}
              disabled={!agreed || loading}
              className={`btn-primary w-full min-h-[48px] h-12 py-3 rounded-full font-bold flex items-center justify-center gap-2 text-sm transition-all active:scale-98 ${
                !agreed 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'shadow-lg shadow-brand-orange/25'
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>{t('checkoutPayBtn')} — {formatDZD(total, language)}</>
              )}
            </button>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-brand-brownLight font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t('secureCheckoutBadge')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
