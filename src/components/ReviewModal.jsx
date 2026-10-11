import React, { useState, useEffect } from 'react';
import { X, Star, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import OptimizedImage from './OptimizedImage';

import { validateReviewForm } from '../utils/validators';

const ReviewModal = ({ isOpen, onClose, creator }) => {
  const { t, language } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      setSubmitted(false);
      setSubmitting(false);
      setRating(0);
      setReviewText('');
      setHoveredStar(0);
      setErrorMsg('');
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const validation = validateReviewForm(rating, reviewText);
    if (!validation.isValid) {
      setErrorMsg(validation.error);
      return;
    }
    setErrorMsg('');
    setSubmitting(true);

    try {
      const { addReview } = await import('../services/dbService');
      if (creator?.id) {
        await addReview(creator.id, validation.rating, validation.reviewText);
      }
    } catch (err) {
      console.error('Failed to save review:', err);
      setErrorMsg(err.message || t('reviewSaveFailed'));
      setSubmitting(false);
      return;
    }

    if (isMounted.current) {
      setSubmitted(true);
      setTimeout(() => {
        if (isMounted.current) {
          setSubmitted(false);
          setRating(0);
          setReviewText('');
          onClose();
        }
      }, 2000);
    }
  };

  return (
    <div 
      className="modal-overlay flex items-center justify-center p-4 z-50 fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={onClose}
    >
      <div 
        className="modal-content bg-white border border-brand-border rounded-[32px] max-w-md w-full my-auto p-6 sm:p-8 relative animate-scale-in max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <button 
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="absolute top-5 start-5 text-brand-brownLight hover:text-brand-brown hover:bg-brand-cream p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {submitted ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-10 animate-scale-in text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" aria-hidden="true" />
            <h2 id="review-modal-title" className="text-xl font-bold text-brand-brown mb-2">{t('reviewThanks')}</h2>
            <p className="text-brand-brownLight text-sm">{t('reviewSuccessCommunity')}</p>
          </div>
        ) : (
          <>
            <h2 id="review-modal-title" className="text-2xl font-black text-brand-brown mb-5">{t('reviewTitle')}</h2>
            
            {creator && (
              <div className="bg-brand-cream border border-brand-border rounded-2xl p-4 flex items-center gap-3 mb-6">
                <OptimizedImage 
                  src={creator.avatar} 
                  fallbackType="creator"
                  seed={creator.name}
                  alt={creator.name} 
                  width="48"
                  height="48"
                  className="w-12 h-12 rounded-full object-cover border border-brand-border" 
                />
                <div>
                  <h3 className="text-brand-brown font-bold">{creator.name}</h3>
                  <p className="text-xs text-brand-brownLight">{creator.category}</p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold text-center animate-fade-in">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-center gap-2 mb-6" dir="ltr" role="group" aria-label={t('selectStarRating')}>
              {[1, 2, 3, 4, 5].map((index) => {
                const isActive = index <= (hoveredStar || rating);
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={submitting}
                    aria-label={`${index} / 5`}
                    className={`focus:outline-none transition-transform hover:scale-110 p-1 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onMouseEnter={() => !submitting && setHoveredStar(index)}
                    onMouseLeave={() => !submitting && setHoveredStar(0)}
                    onClick={() => !submitting && setRating(index)}
                  >
                    <Star 
                      className={`w-8 h-8 ${isActive ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} 
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>

            <label htmlFor="review-text-input" className="sr-only">
              {t('reviewPlaceholder')}
            </label>
            <textarea
              id="review-text-input"
              className="input-field w-full mb-6 resize-none text-xs"
              rows={4}
              placeholder={t('reviewPlaceholder')}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              disabled={submitting}
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className={`btn-primary w-full py-3.5 font-bold shadow-md shadow-brand-orange/20 ${rating === 0 || submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {submitting ? t('submitting') : t('reviewSubmit')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;
