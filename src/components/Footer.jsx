import React from 'react';
import { Globe, MessageCircle, Camera, Mail, MapPin, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { preloadContactModal } from '../utils/preloadChunks';

const Footer = ({ onLinkClick, onOpenContact }) => {
  const { t } = useLanguage();
  return (
    <footer className="relative bg-gradient-to-b from-[#0B1528] to-[#070E1A] text-white mt-auto overflow-hidden">
      {/* Top Wave Transition from White Canvas into Dark Navy Footer */}
      <div className="w-full overflow-hidden leading-none rotate-180">
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative block w-full h-8 sm:h-14 preserve-3d"
          preserveAspectRatio="none"
        >
          <path
            d="M0,32L80,37.3C160,43,320,53,480,50.7C640,48,800,32,960,26.7C1120,21,1280,27,1360,29.3L1440,32L1440,80L1360,80C1280,80,1120,80,960,80C800,80,640,80,480,80C320,80,160,80,80,80L0,80Z"
            fill="#F8FAFC"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          {/* Column 1 - Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4 group">
              <picture className="flex-shrink-0">
                <img 
                  src="/logo.jpg" 
                  alt="OPPI Logo" 
                  width="40" 
                  height="40" 
                  loading="lazy" 
                  decoding="async" 
                  className="h-10 w-auto object-contain rounded-xl bg-white p-1 shadow-sm" 
                />
              </picture>
              <span className="text-white text-2xl font-black font-inter tracking-wide" dir="ltr">
                OPPI<span className="text-brand-orange">.</span>
              </span>
            </div>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              {t('footerAbout') || 'المنصة الجزائرية الرائدة التي تجمع بين العلامات التجارية وصناع المحتوى لعقد صفقات تسويقية احترافية وموثقة.'}
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs text-slate-200 border border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>دفع وحسابات بنكية جزائرية مضمونة 100%</span>
            </div>
          </div>

          {/* Column 2 - Quick Links */}
          <div>
            <h4 className="text-white font-bold text-base mb-4 tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-orange"></span>
              <span>{t('footerLinks')}</span>
            </h4>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => onLinkClick?.('creators')} 
                  className="text-slate-300 hover:text-brand-orange transition-colors block text-start font-medium text-sm"
                >
                  {t('footerCreators')}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onLinkClick?.('stores')} 
                  className="text-slate-300 hover:text-brand-orange transition-colors block text-start font-medium text-sm"
                >
                  {t('footerBrands')}
                </button>
              </li>
              <li>
                <button 
                  onClick={onOpenContact} 
                  className="text-slate-300 hover:text-brand-orange transition-colors block text-start font-medium text-sm"
                >
                  طلب انضمام علامة تجارية
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3 - Contact */}
          <div>
            <h4 className="text-white font-bold text-base mb-4 tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-orange"></span>
              <span>{t('footerContact')}</span>
            </h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="mailto:madjedalirachedi291@gmail.com"
                  className="flex items-center gap-2.5 text-slate-300 hover:text-brand-orange transition-colors text-sm font-medium"
                >
                  <Mail className="w-4 h-4 text-brand-orange shrink-0" />
                  <span className="font-mono text-xs" dir="ltr">madjedalirachedi291@gmail.com</span>
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-slate-300 text-sm font-medium">
                <MapPin className="w-4 h-4 text-brand-orange shrink-0" />
                <span>{t('footerCity')}</span>
              </li>
              <li className="pt-2">
                <button
                  onClick={onOpenContact}
                  onMouseEnter={preloadContactModal}
                  onFocus={preloadContactModal}
                  className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow-lg shadow-brand-orange/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Mail className="w-4 h-4" />
                  <span>تواصل معنا مباشرة</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Partners Strip */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 py-6 border-t border-white/10">
          <span className="text-slate-400 text-xs sm:text-sm font-medium">{t('paymentPartners')}:</span>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/15 flex items-center gap-1.5">
              📱 {t('checkoutBaridimob')}
            </span>
            <div className="w-px h-4 bg-white/20"></div>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/15 flex items-center gap-1.5">
              💳 {t('checkoutEdahabia')}
            </span>
            <div className="w-px h-4 bg-white/20"></div>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/15 flex items-center gap-1.5">
              🏦 {t('checkoutCIB')}
            </span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-2 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p className="text-center md:text-start">
            © {new Date().getFullYear()} OPPI — {t('footerRights')}
          </p>
          <p className="flex items-center justify-center gap-1.5 text-slate-300">
            <span>{t('footerMadeIn') || 'صنع بكل فخر في الجزائر 🇩🇿'}</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
