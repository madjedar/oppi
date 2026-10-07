import React, { useState } from 'react';
import { Sparkles, Building2, Search, ShieldCheck, CheckCircle2, Star, Users, MapPin, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Hero = ({ onOpenAuth, onOpenDashboard }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedCat, setSelectedCat] = useState('الكل');
  const [selectedWilaya, setSelectedWilaya] = useState('all');

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const showcaseSection = document.getElementById('creators') || document.getElementById('main-content');
    if (showcaseSection) {
      showcaseSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#070E1A] via-[#0B1528] to-[#0E1D36] text-white pt-16 sm:pt-20 lg:pt-24 pb-28 sm:pb-36 px-4 sm:px-6 lg:px-8">
      {/* Background Decorative Glows */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-brand-orange/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Main Hero Copy (Left / Right depending on direction) */}
          <div className="lg:col-span-7 text-center lg:text-start flex flex-col items-center lg:items-start">
            
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-bold text-white mb-6 backdrop-blur-md shadow-inner">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
              <span className="text-brand-orange font-black">OPPI</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-200">المنصة الأولى للرعاية والتسويق في الجزائر</span>
            </div>

            {/* Bold Headline inspired by reference */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight sm:leading-tight lg:leading-[1.15] tracking-tight">
              <span>ابنِ علامتك بذكاء،</span>
              <span className="block text-brand-orange mt-1">وانطلق نحو القمة.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mb-8 leading-relaxed font-normal">
              صل متجرك وعلامتك التجارية بأفضل صناع المحتوى المؤثرين في الجزائر. إبرام صفقات، إدارة حملات، ودفع آمن 100% مع ضمان التسليم.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-10">
              {user ? (
                <button
                  onClick={() => onOpenDashboard('overview')}
                  className="btn-primary px-8 py-4 text-base font-bold flex items-center justify-center gap-3 shadow-xl shadow-brand-orange/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{t('goToDashboard')}</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onOpenAuth('signup', 'brand')}
                    className="btn-primary px-8 py-4 text-base font-bold flex items-center justify-center gap-2.5 shadow-xl shadow-brand-orange/30 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Building2 className="w-5 h-5" />
                    <span>{t('joinBrand')}</span>
                  </button>
                  <button
                    onClick={() => onOpenAuth('signup', 'creator')}
                    className="btn-glass px-8 py-4 text-base font-bold flex items-center justify-center gap-2.5 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-5 h-5 text-brand-orange" />
                    <span>{t('joinCreator')}</span>
                  </button>
                </>
              )}
            </div>

            {/* Trust Mini-Stats Strip */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 w-full max-w-lg">
              <div className="text-center lg:text-start">
                <span className="block text-2xl font-black text-white font-mono">+500</span>
                <span className="text-xs text-slate-400 font-medium">صانع محتوى موثق</span>
              </div>
              <div className="text-center lg:text-start">
                <span className="block text-2xl font-black text-brand-orange font-mono">100%</span>
                <span className="text-xs text-slate-400 font-medium">ضمان الدفع الآمن</span>
              </div>
              <div className="text-center lg:text-start">
                <span className="block text-2xl font-black text-white font-mono">58</span>
                <span className="text-xs text-slate-400 font-medium">ولاية مغطاة</span>
              </div>
            </div>

          </div>

          {/* Right Floating Discovery Card & Visual Accent (matching reference image) */}
          <div className="lg:col-span-5 relative flex justify-center">
            
            {/* Orange organic decorative swoop behind the card */}
            <div className="absolute -bottom-6 -left-6 sm:-bottom-10 sm:-left-10 w-56 h-56 sm:w-72 sm:h-72 bg-brand-orange rounded-full opacity-90 blur-sm pointer-events-none -z-0"></div>
            
            {/* Arched image thumbnail preview */}
            <div className="absolute -top-10 -right-4 sm:-right-8 z-10 hidden sm:flex items-center gap-3 bg-brand-navyDark/90 backdrop-blur-md border border-white/20 p-2.5 rounded-2xl shadow-2xl">
              <div className="w-10 h-10 rounded-xl bg-brand-orange flex items-center justify-center text-white font-bold text-sm">
                ⭐ 4.9
              </div>
              <div className="text-start pe-2">
                <p className="text-xs font-bold text-white">حملات ناجحة</p>
                <p className="text-[10px] text-slate-300">أعلى نسب تفاعل</p>
              </div>
            </div>

            {/* Floating White Card */}
            <div className="w-full max-w-md bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-800 relative z-10">
              
              <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-brand-navy">ابحث عن صانع المحتوى</h3>
                  <p className="text-xs text-slate-500 mt-0.5">اختر تخصصك وانطلق بحملتك</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-brand-orange flex items-center justify-center font-bold">
                  <Search className="w-5 h-5" />
                </div>
              </div>

              <form onSubmit={handleHeroSearch} className="space-y-4">
                {/* Field 1: Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">مجال المحتوى</label>
                  <select
                    value={selectedCat}
                    onChange={(e) => setSelectedCat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all cursor-pointer"
                  >
                    <option value="الكل">جميع التخصصات</option>
                    <option value="تكنولوجيا">تكنولوجيا وإلكترونيات</option>
                    <option value="موضة وأزياء">موضة وأزياء</option>
                    <option value="تجميل وعناية">تجميل وعناية بالبشرة</option>
                    <option value="طبخ وأكل">طبخ ومطاعم</option>
                    <option value="سفر وسياحة">سفر وتجارب</option>
                    <option value="رياضة ولياقة">رياضة ولياقة بدنية</option>
                  </select>
                </div>

                {/* Field 2: Wilaya */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الولاية / النطاق الجغرافي</label>
                  <select
                    value={selectedWilaya}
                    onChange={(e) => setSelectedWilaya(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all cursor-pointer"
                  >
                    <option value="all">كل ولايات الجزائر (58 ولاية)</option>
                    <option value="الجزائر">الجزائر العاصمة</option>
                    <option value="وهران">وهران</option>
                    <option value="قسنطينة">قسنطينة</option>
                    <option value="سطيف">سطيف</option>
                    <option value="عنابة">عنابة</option>
                    <option value="باتنة">باتنة</option>
                  </select>
                </div>

                {/* Field 3: Budget Range */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الميزانية التقديرية</label>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-center py-2 px-1 text-[11px] font-bold rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                      أقل من 15 ألف
                    </span>
                    <span className="text-center py-2 px-1 text-[11px] font-bold rounded-xl bg-orange-50 text-brand-orange border border-brand-orange/30">
                      15k - 30k
                    </span>
                    <span className="text-center py-2 px-1 text-[11px] font-bold rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                      أكثر من 30 ألف
                    </span>
                  </div>
                </div>

                {/* Submit / Explore button */}
                <button
                  type="submit"
                  className="w-full btn-primary py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/30 hover:shadow-brand-orange/50 active:scale-95 transition-all mt-2"
                >
                  <Search className="w-4 h-4" />
                  <span>استكشف المبدعين الآن</span>
                </button>
              </form>

              {/* Secure Payment Note */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>دفع مضمون عبر الذهبية و CIB و بريدي موب</span>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Dynamic Smooth Organic Wave Divider to White Canvas (matching reference design) */}
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
