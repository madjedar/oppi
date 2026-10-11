import React from 'react';
import { Search, SlidersHorizontal, RotateCcw, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedCategory, getLocalizedWilayasList } from '../utils/localized';

export default function CampaignFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedWilaya,
  onWilayaChange,
  selectedBudgetRange,
  onBudgetRangeChange,
  selectedDeliverable,
  onDeliverableChange,
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
          <label htmlFor="campaign-search-input" className="sr-only">{t('campaignSearchPlaceholder')}</label>
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-brownLight" aria-hidden="true" />
          <input id="campaign-search-input" type="text" placeholder={t('campaignSearchPlaceholder')} value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} className="input-field pr-12 pl-10 w-full text-sm" />
          {searchQuery && <button type="button" onClick={() => onSearchChange('')} aria-label={t('clearSearchText')} className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-brand-brownLight hover:text-brand-brown rounded-full"><X className="w-4 h-4" /></button>}
        </div>
        <button type="button" onClick={onToggleFilters} className={`px-5 py-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 border transition-all ${showFilters || hasActiveFilters ? 'bg-brand-orange text-white border-brand-orange' : 'bg-brand-cream text-brand-brown border-brand-border'}`}>
          <SlidersHorizontal className="w-4 h-4" /><span>{t('campaignFilters')}</span>
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
        </button>
        {hasActiveFilters && <button type="button" onClick={onReset} className="px-4 py-3 rounded-full text-xs font-bold text-red-500 bg-red-50 border border-red-200 flex items-center justify-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('clearFilters')}</span></button>}
      </div>
      <div role="tablist" aria-label={t('contentCategories')} className="flex gap-2 overflow-x-auto no-scrollbar pt-1 pb-1">
        {categories.map((category) => <button key={category} type="button" role="tab" aria-selected={selectedCategory === category} onClick={() => onCategoryChange(category)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border shadow-sm ${selectedCategory === category ? 'bg-brand-brown text-white border-brand-brown' : 'bg-white text-brand-brownLight border-brand-border'}`}>{getLocalizedCategory(category, language)}</button>)}
      </div>
      {showFilters && (
        <div className="pt-4 border-t border-brand-border/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <label className="text-[11px] font-bold text-brand-brown">{t('filterByWilaya')}<select value={selectedWilaya} onChange={(event) => onWilayaChange(event.target.value)} className="input-field w-full text-xs py-2 bg-white mt-1.5"><option value="all">{t('allWilayas')}</option>{getLocalizedWilayasList(language).map((wilaya) => <option key={wilaya.code} value={wilaya.label}>{wilaya.label}</option>)}</select></label>
          <label className="text-[11px] font-bold text-brand-brown">{t('filterByCampaignBudget')}<select value={selectedBudgetRange} onChange={(event) => onBudgetRangeChange(event.target.value)} className="input-field w-full text-xs py-2 bg-white mt-1.5"><option value="all">{t('allBudgets')}</option><option value="under30k">{t('budgetUnder30k')}</option><option value="30k-75k">{t('budget30kTo75k')}</option><option value="above75k">{t('budgetAbove75k')}</option></select></label>
          <label className="text-[11px] font-bold text-brand-brown">{t('filterByDeliverables')}<select value={selectedDeliverable} onChange={(event) => onDeliverableChange(event.target.value)} className="input-field w-full text-xs py-2 bg-white mt-1.5"><option value="all">{t('allDeliverables')}</option><option value="video">{t('deliverableVideo')}</option><option value="post">{t('deliverablePost')}</option><option value="story">{t('deliverableStory')}</option></select></label>
        </div>
      )}
    </div>
  );
}
