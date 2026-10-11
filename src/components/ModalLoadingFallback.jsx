import React from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * ModalLoadingFallback
 * Rendered inside Suspense while a dynamically split modal bundle is loading.
 * Glassmorphic, lightweight, and branded.
 */
export default function ModalLoadingFallback() {
  const { t } = useLanguage();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label={t('loading')}
    >
      <div className="bg-white/95 border border-brand-border rounded-[28px] p-6 shadow-2xl flex flex-col items-center gap-3 min-w-[180px] max-w-xs animate-scale-in">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-brand-orange/20 border-t-brand-orange animate-spin" />
          <div className="w-4 h-4 rounded-full bg-brand-orange/10 animate-pulse" />
        </div>
        <span className="text-xs font-bold text-brand-brown">{t('loading')}</span>
      </div>
    </div>
  );
}
