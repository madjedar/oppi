import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Send, Copy, Check, MessageSquare, 
  Sparkles, CheckCircle2, Phone, MapPin, ShieldCheck, ArrowUpRight 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { sanitizeForPayload, sanitizeText } from '../utils/validators';

export default function ContactModal({ isOpen, onClose }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const CONTACT_EMAIL = 'madjedalirachedi291@gmail.com';

  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    subject: 'استفسار عام / طلب مساعدة',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setSentSuccess(false);
      setFormData(prev => ({
        ...prev,
        name: user?.user_metadata?.full_name || prev.name,
        email: user?.email || prev.email,
        message: ''
      }));
    }
  }, [isOpen, user]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(CONTACT_EMAIL).catch(() => {
          fallbackCopy(CONTACT_EMAIL);
        });
      } else {
        fallbackCopy(CONTACT_EMAIL);
      }
    } catch {
      fallbackCopy(CONTACT_EMAIL);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (e) {
      console.warn('Fallback copy failed:', e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const safeName = sanitizeForPayload(formData.name, 70);
    const safeEmail = sanitizeForPayload(formData.email, 100);
    const safeSubject = sanitizeForPayload(formData.subject, 100);
    const safeMessage = sanitizeText(formData.message, 2000);

    // Format mailto body safely
    const mailtoSubject = encodeURIComponent(`[OPPI] ${safeSubject} - ${safeName}`);
    const mailtoBody = encodeURIComponent(
      `الاسم: ${safeName}\nالبريد: ${safeEmail}\n\nالرسالة:\n${safeMessage}`
    );

    // Open user's default email client
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`;

    setSentSuccess(true);
    setSubmitting(false);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={onClose}
      dir="rtl"
    >
      <div 
        className="relative w-full max-w-lg my-auto p-6 sm:p-8 max-h-[90vh] overflow-y-auto modal-content rounded-[32px] bg-white shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          type="button"
          onClick={onClose}
          aria-label="إغلاق نافذة التواصل"
          className="absolute z-10 text-brand-brownLight top-5 left-5 hover:text-brand-brown hover:bg-brand-cream p-2 rounded-full transition-colors bg-white/80 backdrop-blur-sm shadow-sm"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-brand-border">
          <div className="w-12 h-12 rounded-[16px] bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold">
            <Mail className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="contact-modal-title" className="text-xl font-black text-brand-brown">
              {t('contactUsTitle') || 'تواصل معنا مباشرة'}
            </h2>
            <p className="text-xs font-medium text-brand-brownLight mt-0.5">
              {t('contactUsSub') || 'فريق OPPI جاهز لمساعدتك والرد على كافة استفساراتك'}
            </p>
          </div>
        </div>

        {/* Quick Email Card */}
        <div className="p-4 rounded-[22px] bg-brand-cream/80 border border-brand-border mb-6">
          <span className="text-xs font-bold text-brand-brownLight block mb-2">
            البريد الإلكتروني المباشر:
          </span>
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-brand-border shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              <Mail className="w-4 h-4 text-brand-orange shrink-0" aria-hidden="true" />
              <span className="text-xs font-bold text-brand-brown font-mono truncate select-all" dir="ltr">
                {CONTACT_EMAIL}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyEmail}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-brand-cream hover:bg-brand-orange/10 text-brand-brown hover:text-brand-orange border border-brand-border transition-all flex items-center gap-1"
                title="نسخ البريد"
                aria-label="نسخ عنوان البريد الإلكتروني"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ'}</span>
              </button>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                aria-label="إرسال بريد إلكتروني مباشر"
                className="p-1.5 rounded-lg text-xs font-bold bg-brand-orange text-white hover:bg-brand-orange/90 transition-all flex items-center justify-center"
                title="فتح تطبيق البريد"
              >
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center bg-emerald-50 rounded-[24px] border border-emerald-200 animate-scale-in">
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto mb-3 animate-bounce" />
            <h4 className="font-black text-emerald-800 text-lg mb-1">تم فتح تطبيق البريد! ✉️</h4>
            <p className="text-emerald-700 text-xs">
              سيتم إرسال رسالتك مباشرة إلى {CONTACT_EMAIL} وسنرد عليك في أقرب وقت.
            </p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-brand-brown mb-1.5">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  placeholder="محمد أحمد"
                  className="input-field w-full text-xs"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={submitting}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-brown mb-1.5">
                  بريدك الإلكتروني *
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="input-field w-full text-xs text-left dir-ltr"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-brown mb-1.5">
                موضوع الرسالة
              </label>
              <select
                className="input-field w-full text-xs"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                disabled={submitting}
              >
                <option value="استفسار عام">استفسار عام عن المنصة</option>
                <option value="شراكة تجارية أو رعاية">شراكة تجارية أو رعاية</option>
                <option value="مشكلة في الدفع أو الضمان">مشكلة في الدفع أو حساب الضمان</option>
                <option value="دعم فني وتوثيق الحساب">دعم فني وتوثيق الحساب</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-brown mb-1.5">
                نص الرسالة *
              </label>
              <textarea
                rows={4}
                placeholder="اكتب استفسارك أو تفاصيل رسالتك هنا..."
                className="input-field w-full text-xs leading-relaxed"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                disabled={submitting}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-brand-orange/20 mt-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'جاري الإرسال...' : 'إرسال الرسالة عبر البريد'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
