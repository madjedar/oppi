import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, MapPin, AtSign, PlayCircle, Share2, Globe, DollarSign, Briefcase, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { validateAlgerianPhone, validateImageFile, validateSocialUrl, validateAmount, sanitizeText } from '../utils/validators';
import { getLocalizedWilayasList } from '../utils/localized';
import OptimizedImage from './OptimizedImage';

const ProfileSettingsModal = ({ isOpen, onClose, isMandatory = false }) => {
  const { user, profile, updateProfileData } = useAuth();
  const { t, language } = useLanguage();
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    brand_name: '',
    bio: '',
    category: '',
    wilaya: '',
    phone: '',
    avatar_url: '',
    rate_per_post: '',
    instagram_url: '',
    tiktok_url: '',
    youtube_url: '',
    facebook_url: '',
    website_url: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  useEffect(() => {
    if (isOpen && profile) {
      setFormData({
        full_name: profile.full_name || '',
        brand_name: profile.brand_name || '',
        bio: profile.bio || '',
        category: profile.category || '',
        wilaya: profile.wilaya || '',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || '',
        rate_per_post: profile.rate_per_post || '',
        instagram_url: profile.instagram_url || '',
        tiktok_url: profile.tiktok_url || '',
        youtube_url: profile.youtube_url || '',
        facebook_url: profile.facebook_url || '',
        website_url: profile.website_url || ''
      });
    }
  }, [isOpen, profile]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, isMandatory]);

  const isMounted = React.useRef(true);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  if (!isOpen) return null;

  const handleAvatarUpload = async (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      
      const fileCheck = validateImageFile(file, 5);
      if (!fileCheck.isValid) {
        setErrorMsg(fileCheck.error);
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      setUploading(true);
      setErrorMsg(null);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setErrorMsg(t('profileImageUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    
    if (isMandatory) {
      if (!formData.full_name?.trim() || !formData.phone?.trim() || !formData.wilaya?.trim()) {
        setErrorMsg(t('fillRequiredProfileFields'));
        return;
      }
    }

    // Phone validation
    let sanitizedPhone = formData.phone?.trim() || '';
    if (sanitizedPhone) {
      const phoneCheck = validateAlgerianPhone(sanitizedPhone);
      if (!phoneCheck.isValid) {
        setErrorMsg(phoneCheck.error);
        return;
      }
      sanitizedPhone = phoneCheck.formatted;
    }

    // Rate validation for creators
    let sanitizedRate = formData.rate_per_post;
    if (sanitizedRate !== '' && sanitizedRate !== null && sanitizedRate !== undefined) {
      const rateCheck = validateAmount(sanitizedRate, { min: 500, max: 2000000, fieldName: t('ratePerPostField') });
      if (!rateCheck.isValid) {
        setErrorMsg(rateCheck.error);
        return;
      }
      sanitizedRate = rateCheck.value;
    } else {
      sanitizedRate = null;
    }

    // Normalize social URLs
    const instagramCheck = validateSocialUrl('instagram', formData.instagram_url);
    const tiktokCheck = validateSocialUrl('tiktok', formData.tiktok_url);
    const youtubeCheck = validateSocialUrl('youtube', formData.youtube_url);
    const facebookCheck = validateSocialUrl('facebook', formData.facebook_url);
    const websiteCheck = validateSocialUrl('website', formData.website_url);

    if (!instagramCheck.isValid) { setErrorMsg(t('invalidInstagramLink')); return; }
    if (!tiktokCheck.isValid) { setErrorMsg(t('invalidTiktokLink')); return; }
    if (!youtubeCheck.isValid) { setErrorMsg(t('invalidYoutubeLink')); return; }
    if (!facebookCheck.isValid) { setErrorMsg(t('invalidFacebookLink')); return; }
    if (!websiteCheck.isValid) { setErrorMsg(t('invalidWebsiteLink')); return; }

    setIsSaving(true);
    
    try {
      if (updateProfileData) {
        const cleanedData = {
          ...formData,
          full_name: sanitizeText(formData.full_name, 70),
          brand_name: sanitizeText(formData.brand_name, 70),
          bio: sanitizeText(formData.bio, 500),
          phone: sanitizedPhone,
          rate_per_post: sanitizedRate,
          instagram_url: instagramCheck.normalized,
          tiktok_url: tiktokCheck.normalized,
          youtube_url: youtubeCheck.normalized,
          facebook_url: facebookCheck.normalized,
          website_url: websiteCheck.normalized,
        };
        await updateProfileData(cleanedData);
      }
      if (isMounted.current) {
        setShowSuccess(true);
        setTimeout(() => {
          if (isMounted.current) {
            setShowSuccess(false);
            onClose();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      if (isMounted.current) {
        setErrorMsg(error.message || 'Error updating profile');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const isCreator = profile?.role === 'creator';
  const isBrand = profile?.role === 'brand';
  const isRTL = language === 'ar';
  const localizedWilayas = getLocalizedWilayasList(language);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-settings-modal-title"
    >
      <div 
        className={`relative w-full max-w-2xl my-auto overflow-hidden bg-brand-cream border border-brand-border rounded-[24px] animate-scale-in flex flex-col max-h-[90vh] shadow-xl ${isRTL ? 'text-right' : 'text-left'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-border bg-white">
          <div>
            <h2 id="profile-settings-modal-title" className="text-xl font-black text-brand-brown tracking-wide">
              {t('profileSettings')}
            </h2>
            {isMandatory && (
              <p className="text-brand-orange mt-1 font-bold text-xs">
                {t('completeProfileRequired')}
              </p>
            )}
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="p-2 text-brand-brownLight hover:text-brand-brown hover:bg-brand-brown/5 rounded-full transition-colors"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-brand-border p-6 bg-brand-cream/30">
          <form id="profile-settings-form" onSubmit={handleSubmit} className="space-y-8">
            {errorMsg && (
              <div role="alert" className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-medium">
                {errorMsg}
              </div>
            )}
            
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-black text-brand-brown mb-4 border-b border-brand-border pb-2">
                {t('basicInfo')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                    <User size={16} className="text-brand-orange" />
                    {t('fullName')}
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange} disabled={isSaving}
                    className="w-full bg-white border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown font-medium placeholder-brand-brownLight/50 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all text-sm shadow-sm"
                    placeholder={`${t('enterYour')} ${t('fullName')}`}
                  />
                </div>

                {isBrand && (
                  <div>
                    <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                      <Briefcase size={16} className="text-brand-orange" />
                      {t('brandName')}
                    </label>
                    <input
                      type="text"
                      name="brand_name"
                      value={formData.brand_name}
                      onChange={handleChange} disabled={isSaving}
                      className="w-full bg-white border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown font-medium placeholder-brand-brownLight/50 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all text-sm shadow-sm"
                      placeholder={`${t('enterYour')} ${t('brandName')}`}
                    />
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                    <Camera size={16} className="text-brand-orange" />
                    {t('avatarUrl')}
                  </label>
                  <div className="flex items-center gap-3">
                    {formData.avatar_url && (
                      <OptimizedImage 
                        src={formData.avatar_url} 
                        fallbackType="user"
                        seed={formData.full_name || 'User'}
                        alt="Avatar" 
                        width="48"
                        height="48"
                        className="w-12 h-12 rounded-full object-cover border border-brand-border shadow-sm" 
                      />
                    )}
                    <label className="cursor-pointer bg-white hover:bg-[#FAFAFA] border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown transition-all text-sm flex-1 text-center font-bold shadow-sm">
                      {uploading ? t('uploading') : t('choosePhotoFromDevice')}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                    <Phone size={16} className="text-brand-orange" />
                    {t('phone')}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange} disabled={isSaving}
                    className="w-full bg-white border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown font-medium placeholder-brand-brownLight/50 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all text-sm shadow-sm"
                    placeholder="05..."
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                    <MapPin size={16} className="text-brand-orange" />
                    {t('location')}
                  </label>
                  <select
                    name="wilaya"
                    value={formData.wilaya}
                    onChange={handleChange} disabled={isSaving}
                    className="w-full bg-white border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown font-medium placeholder-brand-brownLight/50 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all text-sm appearance-none shadow-sm"
                  >
                    <option value="">-- {t('location')} --</option>
                    {localizedWilayas.map((w) => (
                      <option key={w.code} value={w.label}>{w.label}</option>
                    ))}
                  </select>
                </div>
                
                {isCreator && (
                  <div>
                    <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                      <DollarSign size={16} className="text-brand-orange" />
                      {t('ratePerPost')}
                    </label>
                    <input
                      type="number"
                      name="rate_per_post"
                      value={formData.rate_per_post}
                      onChange={handleChange} disabled={isSaving}
                      className="w-full bg-white border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown font-medium placeholder-brand-brownLight/50 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all text-sm shadow-sm font-mono"
                      placeholder="DZD"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                  <User size={16} className="text-brand-orange" />
                  {t('bio')}
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange} disabled={isSaving}
                  rows={4}
                  className="w-full bg-white border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown font-medium placeholder-brand-brownLight/50 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all text-sm resize-none shadow-sm"
                  placeholder={`${t('enterYour')} ${t('bio')}`}
                />
              </div>
            </div>

            {/* Social Links Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-black text-brand-brown mb-4 border-b border-brand-border pb-2">
                {t('socialLinks')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                    <AtSign size={16} className="text-brand-orange" />
                    Instagram
                  </label>
                  <input
                    type="url"
                    name="instagram_url"
                    value={formData.instagram_url}
                    onChange={handleChange} disabled={isSaving}
                    className="w-full bg-white border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown font-medium placeholder-brand-brownLight/50 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all text-sm shadow-sm"
                    placeholder="https://instagram.com/..."
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                    <span className="font-bold text-brand-brown text-xs">TikTok</span>
                  </label>
                  <input
                    type="url"
                    name="tiktok_url"
                    value={formData.tiktok_url}
                    onChange={handleChange} disabled={isSaving}
                    className="w-full bg-white border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown font-medium placeholder-brand-brownLight/50 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all text-sm shadow-sm"
                    placeholder="https://tiktok.com/@..."
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                    <PlayCircle size={16} className="text-brand-orange" />
                    YouTube
                  </label>
                  <input
                    type="url"
                    name="youtube_url"
                    value={formData.youtube_url}
                    onChange={handleChange} disabled={isSaving}
                    className="w-full bg-white border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown font-medium placeholder-brand-brownLight/50 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all text-sm shadow-sm"
                    placeholder="https://youtube.com/..."
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                    <Share2 size={16} className="text-brand-orange" />
                    Facebook
                  </label>
                  <input
                    type="url"
                    name="facebook_url"
                    value={formData.facebook_url}
                    onChange={handleChange} disabled={isSaving}
                    className="w-full bg-white border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown font-medium placeholder-brand-brownLight/50 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all text-sm shadow-sm"
                    placeholder="https://facebook.com/..."
                    dir="ltr"
                  />
                </div>

                {isBrand && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-brand-brown mb-1.5 flex items-center gap-2">
                      <Globe size={16} className="text-brand-orange" />
                      {t('websiteUrl')}
                    </label>
                    <input
                      type="url"
                      name="website_url"
                      value={formData.website_url}
                      onChange={handleChange} disabled={isSaving}
                      className="w-full bg-white border border-brand-border rounded-[16px] px-4 py-3 text-brand-brown font-medium placeholder-brand-brownLight/50 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all text-sm shadow-sm"
                      placeholder="https://..."
                      dir="ltr"
                    />
                  </div>
                )}
              </div>
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brand-border bg-white flex justify-end gap-3">
          {!isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-[16px] font-bold text-brand-brownLight hover:text-brand-brown bg-brand-cream border border-brand-border hover:bg-[#FAFAFA] transition-all"
            >
              {t('cancel')}
            </button>
          )}
          <button
            type="submit"
            form="profile-settings-form"
            disabled={isSaving || showSuccess}
            className={`btn-primary px-6 py-3 rounded-[16px] font-bold flex items-center gap-2 ${
              isSaving || showSuccess ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            <Save size={18} />
            {showSuccess ? t('saved') : isSaving ? t('saving') : t('save')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileSettingsModal;
