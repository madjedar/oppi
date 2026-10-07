import { supabase } from '../lib/supabase'

const PLATFORM_FEE_RATE = 0.05 // 5% platform fee

/**
 * Calculate fee breakdown for a campaign deal
 */
export function calculateFees(subtotal) {
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE)
  const total = subtotal + platformFee
  return { subtotal, platformFee, total }
}

/**
 * Format amount in Algerian Dinar with multi-language currency support
 */
export function formatDZD(amount, lang = 'ar') {
  if (!amount && amount !== 0) return '0';
  const num = Number(amount);
  if (isNaN(num)) return amount;

  if (lang === 'fr') {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(num) + ' DZD';
  }
  if (lang === 'en') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num) + ' DZD';
  }
  return new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(num) + ' د.ج';
}

/**
 * Create a ChargilyPay checkout session via Supabase Edge Function
 * The secret key stays server-side in the Edge Function
 */
export async function createCheckoutSession({ amount, dealId, creatorId, brandId, description }) {
  try {
    if (!supabase) {
      return { success: true, isTestMode: true };
    }

    const { data: { session } } = await supabase.auth.getSession();
    let token = session?.access_token;

    // Proactively refresh JWT token if within 60s of expiration
    const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
    if (expiresAt && Date.now() > expiresAt - 60000) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session?.access_token) {
        token = refreshData.session.access_token;
      }
    }

    const headers = token ? {
      Authorization: `Bearer ${token}`
    } : {};

    const callerOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const cleanOrigin = callerOrigin.replace(/\/$/, '');

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      headers,
      body: {
        amount,
        currency: 'dzd',
        deal_id: dealId,
        creator_id: creatorId,
        brand_id: brandId || session?.user?.id,
        description: description || 'OPPI — صفقة رعاية',
        success_url: `${cleanOrigin}?payment=success&deal_id=${dealId || ''}`,
        failure_url: `${cleanOrigin}?payment=failed&deal_id=${dealId || ''}`,
      },
    });

    if (!error && data?.checkout_url) {
      return { 
        success: true, 
        checkoutUrl: data.checkout_url, 
        checkoutId: data.checkout_id,
        transactionId: data.transaction_id 
      };
    }

    let errorMessage = 'تعذر إنشاء جلسة الدفع عبر Chargily Pay. يرجى المحاولة لاحقاً.';
    if (error) {
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errJson = await error.context.json();
          if (errJson?.error) errorMessage = errJson.error;
        } catch {
          if (error.message) errorMessage = error.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
    } else if (data?.error) {
      errorMessage = data.error;
    }

    console.error('[chargilyService] Checkout creation error:', errorMessage);
    return { success: false, error: errorMessage };
  } catch (err) {
    console.error('[chargilyService] Checkout creation exception:', err);
    return { success: false, error: err.message || 'فشل الاتصال ببوابة الدفع' };
  }
}

/**
 * Get payment status label and color for UI badges
 */
export function getPaymentStatusConfig(status) {
  const configs = {
    pending: { label: 'قيد الانتظار', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
    escrow_funded: { label: 'في الضمان', color: 'blue', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
    released: { label: 'تم التحرير', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
    refunded: { label: 'مسترجع', color: 'red', bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
    failed: { label: 'فشل', color: 'red', bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
  }
  return configs[status] || configs.pending
}

/**
 * Get payment method display info
 */
export function getPaymentMethodConfig(method) {
  const configs = {
    edahabia: { label: 'بطاقة الذهبية', icon: '💳', gradient: 'from-yellow-600 to-yellow-700' },
    cib: { label: 'بطاقة CIB', icon: '🏦', gradient: 'from-blue-700 to-blue-900' },
  }
  return configs[method] || configs.edahabia
}
