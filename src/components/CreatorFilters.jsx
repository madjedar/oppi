import React from 'react';
import { Search, SlidersHorizontal, RotateCcw, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedCategory, getLocalizedWilayasList } from '../utils/localized';

export default function CreatorFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedWilaya,
  onWilayaChange,
  selectedPriceRange,
  onPriceRangeChange,
  selectedFollowerRange,
  onFollowerRangeChange,
  selectedPlatform,
  onPlatformChange,
  sortBy,
  onSortChange,
  showFilters,
  onToggleFilters,
  onReset,
  hasActiveFilters,
  categories
}) {
  const { t, language } = useLanguage();

  return (
    <div className="bg-white border border-brand-border rounded-[28px] p-5 sm:p-6 mb-8 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="creator-search-input" className="sr-only">{t('creatorSearchPlaceholder')}</label>
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-brownLight" aria-hidden="true" />
          <input
            id="creator-search-input"
            type="text"
            placeholder={t('creatorSearchPlaceholder')}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="input-field pr-12 pl-10 w-full text-sm"
          />
          {searchQuery && (
            <button type="button" onClick={() => onSearchChange('')} aria-label={t('clearSearchText')} className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-brand-brownLight hover:text-brand-brown rounded-full">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <button type="button" onClick={onToggleFilters} className={`px-5 py-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 border transition-all ${showFilters || hasActiveFilters ? 'bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/20' : 'bg-brand-cream text-brand-brown border-brand-border hover:border-brand-orange/40'}`}>
          <SlidersHorizontal className="w-4 h-4" />
          <span>{t('creatorFilters')}</span>
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
        </button>
        {hasActiveFilters && (
          <button type="button" onClick={onReset} className="px-4 py-3 rounded-full text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center justify-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('clearFilters')}</span>
          </button>
        )}
      </div>

      <div role="tablist" aria-label={t('contentCategories')} className="flex gap-2 overflow-x-auto no-scrollbar pt-1 pb-1">
        {categories.map((category) => (
          <button key={category} type="button" role="tab" aria-selected={selectedCategory === category} onClick={() => onCategoryChange(category)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border shadow-sm ${selectedCategory === category ? 'bg-brand-brown text-white border-brand-brown' : 'bg-white text-brand-brownLight hover:bg-brand-cream hover:text-brand-brown border-brand-border'}`}>
            {getLocalizedCategory(category, language)}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="pt-4 border-t border-brand-border/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
          <label className="text-[11px] font-bold text-brand-brown">
            {t('filterByWilaya')}
            <select value={selectedWilaya} onChange={(event) => onWilayaChange(event.target.value)} className="input-field w-full text-xs py-2 bg-white mt-1.5">
              <option value="all">{t('allWilayas')}</option>
              {getLocalizedWilayasList(language).map((wilaya) => <option key={wilaya.code} value={wilaya.label}>{wilaya.label}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-bold text-brand-brown">
            {t('filterByPrice')}
            <select value={selectedPriceRange} onChange={(event) => onPriceRangeChange(event.target.value)} className="input-field w-full text-xs py-2 bg-white mt-1.5">
              <option value="all">{t('allPrices')}</option>
              <option value="under15k">{t('priceUnder15k')}</option>
              <option value="15k-30k">{t('price15kTo30k')}</option>
              <option value="30k-60k">{t('price30kTo60k')}</option>
              <option value="above60k">{t('priceAbove60k')}</option>
            </select>
          </label>
          <label className="text-[11px] font-bold text-brand-brown">
            {t('filterByFollowers')}
            <select value={selectedFollowerRange} onChange={(event) => onFollowerRangeChange(event.target.value)} className="input-field w-full text-xs py-2 bg-white mt-1.5">
              <option value="all">{t('allFollowerRanges')}</option>
              <option value="under50k">{t('followersUnder50k')}</option>
              <option value="50k-250k">{t('followers50kTo250k')}</option>
              <option value="250k-1m">{t('followers250kTo1m')}</option>
              <option value="above1m">{t('followersAbove1m')}</option>
            </select>
          </label>
          <label className="text-[11px] font-bold text-brand-brown">
            {t('filterByPlatform')}
            <select value={selectedPlatform} onChange={(event) => onPlatformChange(event.target.value)} className="input-field w-full text-xs py-2 bg-white mt-1.5">
              <option value="all">{t('allPlatforms')}</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
            </select>
          </label>
          <label className="text-[11px] font-bold text-brand-brown">
            {t('sortBy')}
            <select value={sortBy} onChange={(event) => onSortChange(event.target.value)} className="input-field w-full text-xs py-2 bg-white mt-1.5">
              <option value="featured">{t('sortFeatured')}</option>
              <option value="rate-asc">{t('sortRateAsc')}</option>
              <option value="rate-desc">{t('sortRateDesc')}</option>
              <option value="name">{t('sortName')}</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
