/**
 * Input Validation & Sanitization Engine for OPPI
 * Tailored for the Algerian market (Phone numbers, BaridiMob/CCP RIPs, DZD Currency)
 */

/**
 * Validates password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)
 * @param {string} password
 * @returns {{ isValid: boolean, error: string|null }}
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل.' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل.' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.' };
  }
  if (!/[!@#$%^&*()_+\[\]{};':"\\|,.<>\/?~`-]/.test(password)) {
    return { isValid: false, error: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (مثل !@#$%).' };
  }
  return { isValid: true, error: null };
}

/**
 * Validates and normalizes Algerian phone numbers
 * Accepts: 05XXXXXXXX, 06XXXXXXXX, 07XXXXXXXX, +2135XXXXXXXX, +2136XXXXXXXX, +2137XXXXXXXX, 02X/03X/04X
 * @param {string} phone
 * @returns {{ isValid: boolean, formatted: string, error: string|null }}
 */
export function validateAlgerianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, formatted: '', error: 'رقم الهاتف مطلوب' };
  }

  // Strip all non-digit characters except leading +
  const cleaned = phone.trim().replace(/[^\d+]/g, '');

  // 1. National mobile format: 05, 06, 07 followed by 8 digits (10 digits total)
  const nationalMobileRegex = /^(0)(5|6|7)\d{8}$/;

  // 2. International mobile format: +213 or 00213 followed by 5/6/7 and 8 digits
  const intlMobileRegex = /^(\+213|00213)(5|6|7)\d{8}$/;

  // 3. National landline format: 02X, 03X, 04X followed by 6-7 digits
  const landlineRegex = /^(0)(2\d|3\d|4\d)\d{6,7}$/;

  if (nationalMobileRegex.test(cleaned)) {
    return { isValid: true, formatted: cleaned, error: null };
  }

  if (intlMobileRegex.test(cleaned)) {
    // Normalize to standard 0X format for consistent database storage
    const normalized = '0' + cleaned.replace(/^(\+213|00213)/, '');
    return { isValid: true, formatted: normalized, error: null };
  }

  if (landlineRegex.test(cleaned)) {
    return { isValid: true, formatted: cleaned, error: null };
  }

  return {
    isValid: false,
    formatted: cleaned,
    error: 'رقم هاتف جزائري غير صالح (يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام)'
  };
}

/**
 * Validates Algerian BaridiMob / CCP RIP (Relevé d'Identité Postale)
 * Standard Algerian RIP consists of exactly 20 digits (Bank code 007 + Guichet 99999 + Account + Key)
 * @param {string} rip
 * @returns {{ isValid: boolean, formatted: string, error: string|null }}
 */
export function validateAlgerianRIP(rip) {
  if (!rip || typeof rip !== 'string') {
    return { isValid: false, formatted: '', error: 'رقم الـ RIP مطلوب' };
  }

  // Strip all spaces, hyphens, and non-digit characters
  const cleaned = rip.trim().replace(/\D/g, '');

  if (cleaned.length !== 20) {
    return {
      isValid: false,
      formatted: cleaned,
      error: `رقم الـ RIP يجب أن يتكون من 20 رقماً تماماً (المدخل حالياً: ${cleaned.length} رقم)`
    };
  }

  // Format nicely with spaces: 00799999 1234567890 12
  const formatted = `${cleaned.slice(0, 8)} ${cleaned.slice(8, 18)} ${cleaned.slice(18, 20)}`;

  return { isValid: true, formatted: cleaned, displayFormatted: formatted, error: null };
}

/**
 * Validates standard web URL
 * @param {string} url
 * @param {boolean} requireHttps
 * @returns {{ isValid: boolean, normalized: string, error: string|null }}
 */
export function validateUrl(url, requireHttps = false) {
  if (!url || typeof url !== 'string') {
    return { isValid: false, normalized: '', error: 'الرابط مطلوب' };
  }

  let trimmed = url.trim();

  // If protocol is missing, prepend https://
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, normalized: trimmed, error: 'بروتوكول الرابط غير صالح' };
    }
    if (requireHttps && parsed.protocol !== 'https:') {
      return { isValid: false, normalized: trimmed, error: 'يجب أن يبدأ الرابط بـ https:// الآمن' };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { isValid: false, normalized: trimmed, error: 'اسم النطاق غير صالح' };
    }
    return { isValid: true, normalized: trimmed, error: null };
  } catch {
    return { isValid: false, normalized: trimmed, error: 'صيغة الرابط غير صحيحة' };
  }
}

/**
 * Validates and normalizes social media profile links
 * Accepts either a handle (@username) or full URL
 * @param {'instagram'|'tiktok'|'youtube'|'facebook'|'website'} platform
 * @param {string} input
 * @returns {{ isValid: boolean, normalized: string, error: string|null }}
 */
export function validateSocialUrl(platform, input) {
  if (!input || !input.trim()) {
    return { isValid: true, normalized: '', error: null }; // Optional fields
  }

  const trimmed = input.trim();

  const domainMap = {
    instagram: 'https://instagram.com/',
    tiktok: 'https://tiktok.com/@',
    youtube: 'https://youtube.com/@',
    facebook: 'https://facebook.com/',
    website: 'https://'
  };

  if (/^https?:\/\//i.test(trimmed)) {
    return validateUrl(trimmed);
  }

  // Handle cleanup
  const cleanHandle = trimmed.replace(/^[@/]+/, '');
  if (!cleanHandle) {
    return { isValid: false, normalized: '', error: 'اسم الحساب غير صالح' };
  }

  const base = domainMap[platform] || 'https://';
  return { isValid: true, normalized: `${base}${cleanHandle}`, error: null };
}

/**
 * Validates numeric monetary amount in Algerian Dinar (DZD)
 * @param {number|string} amount
 * @param {{ min?: number, max?: number, fieldName?: string }} options
 * @returns {{ isValid: boolean, value: number, error: string|null }}
 */
export function validateAmount(amount, { min = 100, max = 10000000, fieldName = 'المبلغ' } = {}) {
  const num = Number(amount);
  if (isNaN(num)) {
    return { isValid: false, value: 0, error: `${fieldName} يجب أن يكون رقماً صحيحاً` };
  }

  if (num < min) {
    return { isValid: false, value: num, error: `${fieldName} يجب ألا يقل عن ${min.toLocaleString('ar-DZ')} د.ج` };
  }

  if (num > max) {
    return { isValid: false, value: num, error: `${fieldName} يجب ألا يتجاوز ${max.toLocaleString('ar-DZ')} د.ج` };
  }

  return { isValid: true, value: num, error: null };
}

/**
 * Validates an uploaded image file (size, MIME type)
 * @param {File} file
 * @param {number} maxMb
 * @returns {{ isValid: boolean, error: string|null }}
 */
export function validateImageFile(file, maxMb = 5) {
  if (!file) {
    return { isValid: false, error: 'لم يتم اختيار أي ملف' };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة (JPG, PNG, WEBP)' };
  }

  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return { isValid: false, error: `حجم الصورة كبير جداً (${sizeMb} ميغابايت). الحد الأقصى المسموح هو ${maxMb} ميغابايت.` };
  }

  return { isValid: true, error: null };
}

/**
 * Sanitizes text to prevent Cross-Site Scripting (XSS), Injection & Control Character exploits
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeText(text, maxLength = 2000) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove paired <script> tags
    .replace(/<script\b[^>]*>/gi, '') // Remove orphan <script> tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove paired <iframe> tags
    .replace(/<iframe\b[^>]*>/gi, '') // Remove orphan <iframe> tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove paired <object> tags
    .replace(/<object\b[^>]*>/gi, '') // Remove orphan <object> tags
    .replace(/<embed\b[^>]*>/gi, '') // Remove <embed> void tags
    .replace(/<\/embed>/gi, '')
    .replace(/javascript:/gi, '') // Strip javascript: pseudo-protocol
    .replace(/on\w+\s*=/gi, '') // Strip inline event handlers like onerror=, onclick=
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Strip unprintable control characters
    .slice(0, maxLength);
}

/**
 * Validates Creator Review form
 * @param {number|string} rating
 * @param {string} reviewText
 * @returns {{ isValid: boolean, rating: number, reviewText: string, error: string|null }}
 */
export function validateReviewForm(rating, reviewText = '') {
  const numRating = Math.round(Number(rating));
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    return { isValid: false, rating: 0, reviewText: '', error: 'التقييم يجب أن يكون بين 1 و 5 نجوم' };
  }

  const sanitized = sanitizeText(reviewText, 1000);
  return { isValid: true, rating: numRating, reviewText: sanitized, error: null };
}

/**
 * Validates Campaign creation / editing form
 * @param {object} campaign
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateCampaignForm(campaign) {
  const errors = {};

  const title = (campaign.title || '').trim();
  if (!title) {
    errors.title = 'عنوان الحملة مطلوب';
  } else if (title.length < 5) {
    errors.title = 'عنوان الحملة قصير جداً (5 أحرف على الأقل)';
  } else if (title.length > 100) {
    errors.title = 'عنوان الحملة طويل جداً (100 حرف كحد أقصى)';
  }

  const budgetCheck = validateAmount(campaign.budget, { min: 1000, max: 10000000, fieldName: 'ميزانية الحملة' });
  if (!budgetCheck.isValid) {
    errors.budget = budgetCheck.error;
  }

  const desc = (campaign.description || '').trim();
  if (desc && desc.length < 15) {
    errors.description = 'وصف الحملة قصير جداً (15 حرفاً على الأقل لتوضيح متطلبات الحملة)';
  }

  if (campaign.deadline) {
    const deadlineDate = new Date(campaign.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(deadlineDate.getTime())) {
      errors.deadline = 'تاريخ الموعد النهائي غير صالح';
    } else if (deadlineDate < today) {
      errors.deadline = 'الموعد النهائي يجب أن يكون تاريخاً في المستقبل';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates Creator Payout Request form
 * @param {object} payout
 * @param {number} availableBalance
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validatePayoutForm(payout, availableBalance) {
  const errors = {};

  const amountCheck = validateAmount(payout.amount, {
    min: 1000,
    max: availableBalance > 0 ? availableBalance : 1000,
    fieldName: 'مبلغ السحب'
  });

  if (!amountCheck.isValid) {
    errors.amount = amountCheck.error;
  } else if (availableBalance <= 0 || amountCheck.value > availableBalance) {
    errors.amount = `رصيدك المتاح للسحب هو ${availableBalance.toLocaleString('ar-DZ')} د.ج فقط`;
  }

  const ripCheck = validateAlgerianRIP(payout.ripNumber);
  if (!ripCheck.isValid) {
    errors.ripNumber = ripCheck.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates Creator Application Pitch form
 * @param {object} application
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateApplicationForm(application) {
  const errors = {};

  const pitch = (application.pitch || '').trim();
  if (!pitch) {
    errors.pitch = 'رسالة التقديم (Pitch) مطلوبة لشرح فكرتك للراعي';
  } else if (pitch.length < 10) {
    errors.pitch = 'رسالة التقديم قصيرة جداً (10 أحرف على الأقل)';
  } else if (pitch.length > 1000) {
    errors.pitch = 'رسالة التقديم طويلة جداً (1000 حرف كحد أقصى)';
  }

  if (application.sampleUrl && application.sampleUrl.trim()) {
    const urlCheck = validateUrl(application.sampleUrl);
    if (!urlCheck.isValid) {
      errors.sampleUrl = 'رابط نموذج العمل غير صالح (يجب أن يكون رابطاً صحيحاً)';
    }
  }

  const days = Number(application.deliveryDays);
  if (isNaN(days) || days < 1 || days > 60) {
    errors.deliveryDays = 'مدة التسليم يجب أن تكون بين 1 و 60 يوماً';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates a direct chat message
 * @param {string} text
 * @returns {{ isValid: boolean, sanitized: string, error: string|null }}
 */
export function validateChatMessage(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { isValid: false, sanitized: '', error: 'لا يمكن إرسال رسالة فارغة' };
  }

  const sanitized = sanitizeText(text, 1000);
  if (sanitized.length === 0) {
    return { isValid: false, sanitized: '', error: 'محتوى الرسالة غير صالح' };
  }

  return { isValid: true, sanitized, error: null };
}

// ═══════════════════════════════════════════════════════
// INJECTION & ATTACK PREVENTION HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Validates and sanitizes a URL before rendering in <a href={...}> or window.open
 * Protects against DOM XSS Protocol Injections (javascript:, data:text/html, vbscript:)
 * @param {string} url
 * @param {string} defaultFallback
 * @returns {string} Safe URL or fallback (default: '#')
 */
export function safeHref(url, defaultFallback = '#') {
  if (!url || typeof url !== 'string') return defaultFallback;
  
  const trimmed = url.trim();
  if (!trimmed) return defaultFallback;

  // Immediately block dangerous protocol prefixes (case-insensitive)
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    console.warn('[safeHref] Blocked dangerous protocol injection attempt:', trimmed);
    return defaultFallback;
  }

  // Prepend https:// if protocol is omitted and looks like a domain
  let normalized = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized)) {
    normalized = 'https://' + normalized;
  }

  try {
    const parsed = new URL(normalized);
    // Strict protocol whitelist
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(parsed.protocol.toLowerCase())) {
      console.warn('[safeHref] Blocked disallowed protocol:', parsed.protocol);
      return defaultFallback;
    }
    return parsed.href;
  } catch {
    return defaultFallback;
  }
}

/**
 * Validates whether a string is a valid RFC-4122 compliant UUID (v1-v5)
 * Protects against PostgREST filter injection and query tampering
 * @param {string} str
 * @returns {boolean}
 */
export function isValidUUID(str) {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

/**
 * Escapes special Regular Expression characters to prevent ReDoS (RegEx Denial of Service)
 * @param {string} string
 * @returns {string}
 */
export function escapeRegExp(string) {
  if (!string || typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitizes single-line fields (e.g. descriptions, titles) to prevent CRLF / Header Injection
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeForPayload(str, maxLength = 200) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\r\n\x00-\x1F\x7F]+/g, ' ') // Strip newlines & control characters
    .trim()
    .slice(0, maxLength);
}

