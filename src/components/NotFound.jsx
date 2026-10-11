import React from 'react';
import { Home, Compass } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import { useLanguage } from '../context/LanguageContext';

function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <Header 
        onOpenAuth={() => window.location.href = '/'} 
        onOpenDashboard={() => window.location.href = '/'} 
        onOpenCreateCampaign={() => window.location.href = '/'}
        onOpenProfileSettings={() => window.location.href = '/'}
        onOpenContact={() => window.location.href = '/'}
      />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="relative inline-block mb-8">
            <div className="text-[120px] sm:text-[150px] font-black text-brand-brown/5 leading-none select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center animate-bounce-slow">
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-full flex items-center justify-center shadow-lg border border-brand-border">
                <Compass className="w-12 h-12 sm:w-14 sm:h-14 text-brand-orange" />
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black text-brand-brown mb-4 tracking-wide">
            {t('notFoundTitle')}
          </h1>
          
          <p className="text-brand-brownLight text-sm sm:text-base leading-relaxed mb-10 max-w-sm mx-auto">
            {t('notFoundDesc')}
          </p>

          <button 
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-brown text-white px-8 py-4 rounded-full font-bold transition-all shadow-md hover:shadow-xl hover:-translate-y-1"
          >
            <Home className="w-5 h-5" />
            <span>{t('backToHome')}</span>
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default NotFound;
