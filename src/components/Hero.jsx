import React from 'react';
import { Sparkles, Building2, ShieldCheck, CreditCard, Handshake } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Hero = ({ onOpenAuth }) => {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#070E1A] via-[#0B1528] to-[#0E1D36] text-white pt-16 sm:pt-20 lg:pt-24 pb-28 sm:pb-36 px-4 sm:px-6 lg:px-8">
      {/* Background Decorative Glows */}
      <div className="absolute top-10 end-1/4 w-96 h-96 bg-brand-orange/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 start-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          {/* Top pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-bold text-white mb-6 backdrop-blur-md shadow-inner">
            <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
            <span className="text-brand-orange font-black">OPPI</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-200">{t('heroBadge')}</span>
          </div>

          {/* Bold Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight sm:leading-tight lg:leading-[1.15] tracking-tight">
            <span>{t('heroHeadline1')}</span>
            <span className="block text-brand-orange mt-1">{t('heroHeadline2')}</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            {t('heroSub')}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-14 justify-center">
            <button
              onClick={() => onOpenAuth('signup', 'brand')}
              className="btn-primary px-8 py-4 text-base font-bold flex items-center justify-center gap-2.5 shadow-xl shadow-brand-orange/30 hover:scale-105 active:scale-95 transition-all"
            >
              <Building2 className="w-5 h-5" />
              <span>{t('guestBrandCta')}</span>
            </button>
            <button
              onClick={() => onOpenAuth('signup', 'creator')}
              className="btn-glass px-8 py-4 text-base font-bold flex items-center justify-center gap-2.5 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles className="w-5 h-5 text-brand-orange" />
              <span>{t('guestCreatorCta')}</span>
            </button>
          </div>

          {/* Trust & Real Value Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-8 border-t border-white/10 w-full max-w-2xl mx-auto">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 backdrop-blur-sm shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <span>{t('heroFeatureEscrow')}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 backdrop-blur-sm shadow-sm">
              <CreditCard className="w-4 h-4 text-brand-orange shrink-0" aria-hidden="true" />
              <span>{t('heroFeaturePayments')}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 backdrop-blur-sm shadow-sm">
              <Handshake className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
              <span>{t('heroFeatureDirectDeals')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Smooth Organic Wave Divider to White Canvas */}
      <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none pointer-events-none">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative block w-full h-12 sm:h-20 lg:h-24 preserve-3d"
          preserveAspectRatio="none"
        >
          <path
            d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,58.7C840,43,960,21,1080,21.3C1200,21,1320,43,1380,53.3L1440,64L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"
            fill="#F8FAFC"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
