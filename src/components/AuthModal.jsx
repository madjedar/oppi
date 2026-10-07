import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Sparkles, Building2, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { validatePasswordStrength } from '../utils/validators';

const AuthModal = ({ isOpen, onClose, initialMode = 'login', initialRole = 'creator' }) => {
  const { user, updateRole, loginDevUser } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'select_role' | 'forgot_password' | 'update_password'
  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Rate Limiting Cooldowns
  const [cooldown, setCooldown] = useState(0);
  const [resetCooldown, setResetCooldown] = useState(0);

  // Handle generic short cooldown ticker
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Handle forgot password long cooldown ticker
  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  useEffect(() => {
    setMode(initialMode);
    setRole(initialRole);
    setError(null);
    setSuccessMsg(null);
    setPassword('');
    setConfirmPassword('');
  }, [initialMode, initialRole, isOpen]);

  useEffect(() => {
    // If user is logged in via OAuth but hasn't set a role yet, prompt them to pick a role
    if (user && isOpen && (!user.role || user.role === 'null')) {
      setMode('select_role');
    }
  }, [user, isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && mode !== 'select_role') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, mode]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      if (!supabase) {
        throw new Error('Supabase client is not initialized. Please verify your .env credentials.');
      }
      sessionStorage.setItem('oauth_login', 'true');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          }
        }
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Google Auth Error:', err);
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = async (selectedRole) => {
    setLoading(true);
    setError(null);
    try {
      await updateRole(selectedRole);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not configured.');
      }

      if (mode === 'forgot_password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/#reset-password`
        });
        if (resetError) throw resetError;
        setSuccessMsg(t('authResetLinkSent'));
        setResetCooldown(60); // 60 seconds cooldown to prevent spam
        return;
      }

      if (mode === 'update_password') {
        const passCheck = validatePasswordStrength(password);
        if (!passCheck.isValid) {
          throw new Error(passCheck.error);
        }
        if (password !== confirmPassword) {
          throw new Error('كلمتا المرور غير متطابقتين.');
        }

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        
        setSuccessMsg('تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.');
        setTimeout(() => setMode('login'), 2000);
        return;
      }

      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (loginError) {
          if (loginError.message?.toLowerCase().includes('invalid login credentials')) {
            throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
          } else if (loginError.message?.toLowerCase().includes('email not confirmed')) {
            throw new Error('يرجى تأكيد بريدك الإلكتروني عبر الرابط المرسل إليك أولاً.');
          }
          throw loginError;
        }
        onClose();
      } else if (mode === 'signup') {
        const passCheck = validatePasswordStrength(password);
        if (!passCheck.isValid) {
          throw new Error(passCheck.error);
        }
        if (password !== confirmPassword) {
          throw new Error('كلمتا المرور غير متطابقتين.');
        }

        const { data, error: signupError } = await supabase.auth.signUp({ 
          email: email.trim(), 
          password, 
          options: { 
            data: { full_name: fullName, role },
            emailRedirectTo: window.location.origin
          } 
        });
        if (signupError) throw signupError;
        
        if (data?.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: fullName,
              role: role
            });
          } catch (profileErr) {
            console.warn('Profile upsert notice:', profileErr);
          }
          await updateRole(role);
        }

        // If email confirmation is enabled and user doesn't have an active session yet
        if (data?.user && !data?.session) {
          setSuccessMsg(t('authCheckEmailForConfirmation'));
        } else {
          onClose();
        }
      }
    } catch (err) {
      console.error('Auth submit error:', err);
      setError(err.message || t('authError'));
      if (mode === 'login' || mode === 'signup') {
        setCooldown(3); // 3 seconds cooldown on failure
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={() => { if (mode !== 'select_role') onClose(); }}
    >
      <div 
        className="modal-content relative w-full max-w-md p-6 sm:p-8 animate-fade-in-up shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <button 
          type="button"
          onClick={onClose}
          aria-label="إغلاق النافذة"
          className="absolute top-4 left-4 p-2 text-brand-brownLight hover:text-brand-brown rounded-full hover:bg-brand-cream transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex justify-center mb-4">
          <picture className="flex-shrink-0">
            <img 
              src="/logo.jpg" 
              alt="OPPI" 
              width="64"
              height="64"
              loading="lazy"
              decoding="async"
              className="h-16 w-auto object-contain rounded-2xl bg-brand-cream p-1.5 shadow-sm border border-brand-border" 
            />
          </picture>
        </div>

        {mode === 'select_role' ? (
          <div className="text-center">
            <h2 id="auth-modal-title" className="text-2xl font-bold text-brand-brown mb-2">{t('selectAccountType')}</h2>
            <p className="text-sm text-brand-brownLight mb-6">{t('selectRoleSub')}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
              <button
                type="button"
                onClick={() => handleRoleSelection('creator')}
                disabled={loading}
                className="p-4 sm:p-5 rounded-3xl border border-brand-border bg-white hover:bg-brand-cream transition-all text-center group flex flex-col items-center gap-3 shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-full bg-brand-cream text-brand-orange flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6" aria-hidden="true" />
                </div>
                <span className="font-bold text-brand-brown block">{t('roleCreator')}</span>
                <span className="text-xs text-brand-brownLight block">{t('roleCreatorSub')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelection('brand')}
                disabled={loading}
                className="p-4 sm:p-5 rounded-3xl border border-brand-border bg-white hover:bg-brand-cream transition-all text-center group flex flex-col items-center gap-3 shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-full bg-brand-cream text-brand-orange flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <span className="font-bold text-brand-brown block">{t('roleBrand')}</span>
                <span className="text-xs text-brand-brownLight block">{t('roleBrandSub')}</span>
              </button>
            </div>
          </div>
        ) : mode === 'forgot_password' ? (
          <div>
            <h2 id="auth-modal-title" className="text-2xl font-bold text-brand-brown mb-2 text-center">
              {t('authForgotPasswordTitle')}
            </h2>
            <p className="text-xs text-brand-brownLight mb-6 text-center">
              {t('authForgotPasswordSub')}
            </p>

            {successMsg && (
              <div role="status" aria-live="polite" className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold text-center flex items-center justify-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold text-center animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-brownLight" />
                <input 
                  type="email" 
                  placeholder={t('authEmail')}
                  className="input-field w-full pr-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full py-3 mt-4 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  t('authSendResetLinkBtn')
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                className="text-sm text-brand-orange hover:text-brand-orangeLight font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>{t('authBackToLogin')}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 id="auth-modal-title" className="text-2xl font-bold text-brand-brown mb-6 text-center">
              {mode === 'login' ? t('authLoginTitle') : t('authSignupTitle')}
            </h2>

            {/* Role Switcher in Signup Mode */}
            {mode === 'signup' && (
              <div className="mb-6">
                <label className="block text-xs font-semibold text-brand-brownLight mb-2">{t('accountType')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('creator')}
                    className={`py-2.5 px-3 rounded-full border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      role === 'creator'
                        ? 'bg-brand-orange/10 border-brand-orange text-brand-orange shadow-sm'
                        : 'bg-white border-brand-border text-brand-brownLight hover:text-brand-brown hover:bg-brand-cream'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{t('roleCreator')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('brand')}
                    className={`py-2.5 px-3 rounded-full border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      role === 'brand'
                        ? 'bg-brand-orange/10 border-brand-orange text-brand-orange shadow-sm'
                        : 'bg-white border-brand-border text-brand-brownLight hover:text-brand-brown hover:bg-brand-cream'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>{t('roleBrand')}</span>
                  </button>
                </div>
              </div>
            )}

            {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <div className="mb-4 p-3 bg-amber-50/90 border border-amber-200 rounded-2xl text-right">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                    <span>⚡ بيئة التطوير (Localhost) — دخول تجريبي سريع:</span>
                  </span>
                  <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">Dev Mode</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      loginDevUser('brand');
                      onClose();
                    }}
                    className="py-2 px-2 rounded-xl bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 text-xs font-bold transition-all text-center flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span>🛍️ متجر تجريبي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      loginDevUser('creator');
                      onClose();
                    }}
                    className="py-2 px-2 rounded-xl bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 text-xs font-bold transition-all text-center flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span>🎬 صانع محتوى</span>
                  </button>
                </div>
              </div>
            )}

            {mode !== 'update_password' && (
              <>
                <button 
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                  className="w-full py-3 px-4 border border-brand-border rounded-xl flex items-center justify-center gap-3 text-brand-brown font-semibold hover:bg-brand-cream transition-colors disabled:opacity-50"
                >
                  <img 
                    src="https://www.google.com/favicon.ico" 
                    alt="Google" 
                    width="20" 
                    height="20" 
                    loading="lazy" 
                    decoding="async" 
                    className="w-5 h-5" 
                  />
                  {t('authGoogle')}
                </button>

                <div className="flex items-center gap-4 mb-6 mt-6">
                  <div className="flex-1 h-px bg-brand-border"></div>
                  <span className="text-sm text-brand-brownLight">{t('authOr')}</span>
                  <div className="flex-1 h-px bg-brand-border"></div>
                </div>
              </>
            )}

            {successMsg && (
              <div role="status" aria-live="polite" className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold text-center flex items-center justify-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold text-center animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-brownLight" />
                  <input 
                    type="text" 
                    placeholder={t('authFullName')}
                    className="input-field w-full pr-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              )}

              {mode !== 'update_password' && (
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-brownLight" />
                  <input 
                    type="email" 
                    placeholder={t('authEmail')}
                    className="input-field w-full pr-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              )}

              {mode !== 'forgot_password' && (
                <>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-brownLight" />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder={mode === 'update_password' ? 'كلمة المرور الجديدة' : t('authPassword')}
                      className="input-field w-full pr-10 pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-brownLight hover:text-brand-brown focus:outline-none"
                      title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {(mode === 'signup' || mode === 'update_password') && (
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-brownLight" />
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        placeholder={mode === 'update_password' ? 'تأكيد كلمة المرور الجديدة' : 'تأكيد كلمة المرور'}
                        className="input-field w-full pr-10 pl-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-brownLight hover:text-brand-brown focus:outline-none"
                        title={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </>
              )}

              {mode === 'login' && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot_password'); setError(null); setSuccessMsg(null); }}
                    className="text-xs font-semibold text-brand-brownLight hover:text-brand-orange transition-colors"
                  >
                    {t('authForgotPasswordLink')}
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || (mode === 'forgot_password' && resetCooldown > 0) || (mode !== 'forgot_password' && cooldown > 0)}
                className="btn-primary w-full py-3 mt-6 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  (mode === 'forgot_password' && resetCooldown > 0) ? `أعد المحاولة بعد ${resetCooldown} ثانية` :
                  (cooldown > 0) ? `انتظر ${cooldown}...` :
                  mode === 'login' ? t('authLoginBtn') : 
                  mode === 'signup' ? t('authSignupBtn') : 
                  mode === 'update_password' ? 'تحديث كلمة المرور' :
                  t('authSendResetLinkBtn')
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccessMsg(null); }}
                className="text-sm text-brand-orange hover:text-brand-orangeLight font-medium transition-colors"
              >
                {mode === 'login' 
                  ? t('authSwitchToSignup') 
                  : t('authSwitchToLogin')
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;

