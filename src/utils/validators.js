/**
 * Input Validation & Sanitization Engine for OPPI
 * Multilingual & Tailored for the Algerian market (Phone numbers, BaridiMob/CCP RIPs, DZD Currency)
 */

function getCurrentLang(lang) {
  if (lang && ['ar', 'fr', 'en'].includes(lang)) return lang;
  if (typeof document !== 'undefined' && document.documentElement?.lang) {
    const docLang = document.documentElement.lang;
    if (['ar', 'fr', 'en'].includes(docLang)) return docLang;
  }
  return 'ar';
}

/**
 * Validates password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)
 * @param {string} password
 * @param {string} [lang]
 * @returns {{ isValid: boolean, error: string|null }}
 */
export function validatePasswordStrength(password, lang) {
  const l = getCurrentLang(lang);
  const msgs = {
    len: {
      ar: 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.',
      fr: 'Le mot de passe doit contenir au moins 8 caractères.',
      en: 'Password must be at least 8 characters.'
    },
    upper: {
      ar: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل.',
      fr: 'Le mot de passe doit contenir au moins une lettre majuscule.',
      en: 'Password must contain at least one uppercase letter.'
    },
    lower: {
      ar: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل.',
      fr: 'Le mot de passe doit contenir au moins une lettre minuscule.',
      en: 'Password must contain at least one lowercase letter.'
    },
    num: {
      ar: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.',
      fr: 'Le mot de passe doit contenir au moins un chiffre.',
      en: 'Password must contain at least one number.'
    },
    special: {
      ar: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (مثل !@#$%).',
      fr: 'Le mot de passe doit contenir au moins un caractère spécial (ex: !@#$%).',
      en: 'Password must contain at least one special character (e.g. !@#$%).'
    }
  };

  if (!password || password.length < 8) {
    return { isValid: false, error: msgs.len[l] };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: msgs.upper[l] };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: msgs.lower[l] };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: msgs.num[l] };
  }
  if (!/[!@#$%^&*()_+[\]{};':"\\|,.<>/?~`-]/.test(password)) {
    return { isValid: false, error: msgs.special[l] };
  }
  return { isValid: true, error: null };
}

/**
 * Validates and normalizes Algerian phone numbers
 * Accepts: 05XXXXXXXX, 06XXXXXXXX, 07XXXXXXXX, +2135XXXXXXXX, +2136XXXXXXXX, +2137XXXXXXXX, 02X/03X/04X
 * @param {string} phone
 * @param {string} [lang]
 * @returns {{ isValid: boolean, formatted: string, error: string|null }}
 */
export function validateAlgerianPhone(phone, lang) {
  const l = getCurrentLang(lang);
  const requiredMsg = {
    ar: 'رقم الهاتف مطلوب',
    fr: 'Le numéro de téléphone est requis',
    en: 'Phone number is required'
  }[l];

  const invalidMsg = {
    ar: 'رقم هاتف جزائري غير صالح (يجب أن يبدأ بـ 05 أو 06 أو 07 ويتكون من 10 أرقام)',
    fr: 'Numéro algérien invalide (doit commencer par 05, 06 ou 07 et comporter 10 chiffres)',
    en: 'Invalid Algerian phone number (must start with 05, 06, or 07 and contain 10 digits)'
  }[l];

  if (!phone || typeof phone !== 'string') {
    return { isValid: false, formatted: '', error: requiredMsg };
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
    error: invalidMsg
  };
}

/**
 * Validates Algerian BaridiMob / CCP RIP (Relevé d'Identité Postale)
 * Standard Algerian RIP consists of exactly 20 digits (Bank code 007 + Guichet 99999 + Account + Key)
 * @param {string} rip
 * @param {string} [lang]
 * @returns {{ isValid: boolean, formatted: string, displayFormatted: string, error: string|null }}
 */
export function validateAlgerianRIP(rip, lang) {
  const l = getCurrentLang(lang);
  const requiredMsg = {
    ar: 'رقم الـ RIP مطلوب',
    fr: 'Le numéro RIP est requis',
    en: 'RIP number is required'
  }[l];

  if (!rip || typeof rip !== 'string') {
    return { isValid: false, formatted: '', error: requiredMsg };
  }

  // Strip all spaces, hyphens, and non-digit characters
  const cleaned = rip.trim().replace(/\D/g, '');

  if (cleaned.length !== 20) {
    const lenMsg = {
      ar: `رقم الـ RIP يجب أن يتكون من 20 رقماً تماماً (المدخل حالياً: ${cleaned.length} رقم)`,
      fr: `Le numéro RIP doit comporter exactement 20 chiffres (actuel : ${cleaned.length})`,
      en: `RIP number must be exactly 20 digits (current: ${cleaned.length})`
    }[l];
    return {
      isValid: false,
      formatted: cleaned,
      error: lenMsg
    };
  }

  // Format nicely with spaces: 00799999 1234567890 12
  const formatted = `${cleaned.slice(0, 8)} ${cleaned.slice(8, 18)} ${cleaned.slice(18, 20)}`;

  return { isValid: true, formatted: cleaned, displayFormatted: formatted, error: null };
}

/**
 * Validates standard web URL
 * @param {string} url
 * @param {boolean} [requireHttps]
 * @param {string} [lang]
 * @returns {{ isValid: boolean, normalized: string, error: string|null }}
 */
export function validateUrl(url, requireHttps = false, lang) {
  const l = getCurrentLang(lang);
  const msgs = {
    req: { ar: 'الرابط مطلوب', fr: "L'URL est requise", en: 'URL is required' },
    proto: { ar: 'بروتوكول الرابط غير صالح', fr: "Protocole de l'URL invalide", en: 'Invalid URL protocol' },
    https: { ar: 'يجب أن يبدأ الرابط بـ https:// الآمن', fr: "L'URL doit commencer par https://", en: 'URL must use secure https://' },
    host: { ar: 'اسم النطاق غير صالح', fr: 'Nom de domaine invalide', en: 'Invalid domain name' },
    invalid: { ar: 'صيغة الرابط غير صحيحة', fr: "Format d'URL invalide", en: 'Invalid URL format' }
  };

  if (!url || typeof url !== 'string') {
    return { isValid: false, normalized: '', error: msgs.req[l] };
  }

  let trimmed = url.trim();

  // If protocol is missing, prepend https://
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, normalized: trimmed, error: msgs.proto[l] };
    }
    if (requireHttps && parsed.protocol !== 'https:') {
      return { isValid: false, normalized: trimmed, error: msgs.https[l] };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { isValid: false, normalized: trimmed, error: msgs.host[l] };
    }
    return { isValid: true, normalized: trimmed, error: null };
  } catch {
    return { isValid: false, normalized: trimmed, error: msgs.invalid[l] };
  }
}

/**
 * Validates and normalizes social media profile links
 * Accepts either a handle (@username) or full URL
 * @param {'instagram'|'tiktok'|'youtube'|'facebook'|'website'} platform
 * @param {string} input
 * @param {string} [lang]
 * @returns {{ isValid: boolean, normalized: string, error: string|null }}
 */
export function validateSocialUrl(platform, input, lang) {
  const l = getCurrentLang(lang);
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
    return validateUrl(trimmed, false, l);
  }

  // Handle cleanup
  const cleanHandle = trimmed.replace(/^[@/]+/, '');
  if (!cleanHandle) {
    const err = {
      ar: 'اسم الحساب غير صالح',
      fr: 'Identifiant de compte invalide',
      en: 'Invalid account handle'
    }[l];
    return { isValid: false, normalized: '', error: err };
  }

  const base = domainMap[platform] || 'https://';
  return { isValid: true, normalized: `${base}${cleanHandle}`, error: null };
}

/**
 * Validates numeric monetary amount in Algerian Dinar (DZD)
 * @param {number|string} amount
 * @param {{ min?: number, max?: number, fieldName?: string, lang?: string }} options
 * @returns {{ isValid: boolean, value: number, error: string|null }}
 */
export function validateAmount(amount, { min = 100, max = 10000000, fieldName, lang } = {}) {
  const l = getCurrentLang(lang);
  const defaultField = {
    ar: 'المبلغ',
    fr: 'Le montant',
    en: 'Amount'
  }[l];
  const fName = fieldName || defaultField;

  const num = Number(amount);
  if (isNaN(num)) {
    const numErr = {
      ar: `${fName} يجب أن يكون رقماً صحيحاً`,
      fr: `${fName} doit être un nombre valide`,
      en: `${fName} must be a valid number`
    }[l];
    return { isValid: false, value: 0, error: numErr };
  }

  if (num < min) {
    const minErr = {
      ar: `${fName} يجب ألا يقل عن ${min.toLocaleString('ar-DZ')} د.ج`,
      fr: `${fName} ne doit pas être inférieur à ${min.toLocaleString('fr-FR')} DZD`,
      en: `${fName} must not be less than ${min.toLocaleString('en-US')} DZD`
    }[l];
    return { isValid: false, value: num, error: minErr };
  }

  if (num > max) {
    const maxErr = {
      ar: `${fName} يجب ألا يتجاوز ${max.toLocaleString('ar-DZ')} د.ج`,
      fr: `${fName} ne doit pas dépasser ${max.toLocaleString('fr-FR')} DZD`,
      en: `${fName} must not exceed ${max.toLocaleString('en-US')} DZD`
    }[l];
    return { isValid: false, value: num, error: maxErr };
  }

  return { isValid: true, value: num, error: null };
}

/**
 * Validates an uploaded image file (size, MIME type)
 * @param {File} file
 * @param {number} [maxMb]
 * @param {string} [lang]
 * @returns {{ isValid: boolean, error: string|null }}
 */
export function validateImageFile(file, maxMb = 5, lang) {
  const l = getCurrentLang(lang);
  if (!file) {
    const err = {
      ar: 'لم يتم اختيار أي ملف',
      fr: 'Aucun fichier sélectionné',
      en: 'No file selected'
    }[l];
    return { isValid: false, error: err };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    const err = {
      ar: 'صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة (JPG, PNG, WEBP)',
      fr: 'Format non supporté. Veuillez choisir une image (JPG, PNG, WEBP)',
      en: 'Unsupported format. Please select an image (JPG, PNG, WEBP)'
    }[l];
    return { isValid: false, error: err };
  }

  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const err = {
      ar: `حجم الصورة كبير جداً (${sizeMb} ميغابايت). الحد الأقصى المسموح هو ${maxMb} ميغابايت.`,
      fr: `Fichier trop volumineux (${sizeMb} Mo). La taille maximale est de ${maxMb} Mo.`,
      en: `Image too large (${sizeMb} MB). Maximum allowed size is ${maxMb} MB.`
    }[l];
    return { isValid: false, error: err };
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
 * @param {string} [reviewText]
 * @param {string} [lang]
 * @returns {{ isValid: boolean, rating: number, reviewText: string, error: string|null }}
 */
export function validateReviewForm(rating, reviewText = '', lang) {
  const l = getCurrentLang(lang);
  const numRating = Math.round(Number(rating));
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    const err = {
      ar: 'التقييم يجب أن يكون بين 1 و 5 نجوم',
      fr: 'La note doit être comprise entre 1 et 5 étoiles',
      en: 'Rating must be between 1 and 5 stars'
    }[l];
    return { isValid: false, rating: 0, reviewText: '', error: err };
  }

  const sanitized = sanitizeText(reviewText, 1000);
  return { isValid: true, rating: numRating, reviewText: sanitized, error: null };
}

/**
 * Validates Campaign creation / editing form
 * @param {object} campaign
 * @param {string} [lang]
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateCampaignForm(campaign, lang) {
  const l = getCurrentLang(lang);
  const errors = {};

  const title = (campaign.title || '').trim();
  if (!title) {
    errors.title = { ar: 'عنوان الحملة مطلوب', fr: 'Le titre de la campagne est requis', en: 'Campaign title is required' }[l];
  } else if (title.length < 5) {
    errors.title = { ar: 'عنوان الحملة قصير جداً (5 أحرف على الأقل)', fr: 'Le titre est trop court (au moins 5 caractères)', en: 'Campaign title is too short (at least 5 characters)' }[l];
  } else if (title.length > 100) {
    errors.title = { ar: 'عنوان الحملة طويل جداً (100 حرف كحد أقصى)', fr: 'Le titre est trop long (100 caractères maximum)', en: 'Campaign title is too long (100 characters max)' }[l];
  }

  const budgetFieldName = { ar: 'ميزانية الحملة', fr: 'Budget de la campagne', en: 'Campaign budget' }[l];
  const budgetCheck = validateAmount(campaign.budget, { min: 1000, max: 10000000, fieldName: budgetFieldName, lang: l });
  if (!budgetCheck.isValid) {
    errors.budget = budgetCheck.error;
  }

  const desc = (campaign.description || '').trim();
  if (desc && desc.length < 15) {
    errors.description = { ar: 'وصف الحملة قصير جداً (15 حرفاً على الأقل لتوضيح متطلبات الحملة)', fr: 'La description est trop courte (au moins 15 caractères)', en: 'Campaign description is too short (at least 15 characters)' }[l];
  }

  if (campaign.deadline) {
    const deadlineDate = new Date(campaign.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(deadlineDate.getTime())) {
      errors.deadline = { ar: 'تاريخ الموعد النهائي غير صالح', fr: 'Date limite invalide', en: 'Invalid deadline date' }[l];
    } else if (deadlineDate < today) {
      errors.deadline = { ar: 'الموعد النهائي يجب أن يكون تاريخاً في المستقبل', fr: 'La date limite doit être dans le futur', en: 'Deadline must be a future date' }[l];
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
 * @param {string} [lang]
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validatePayoutForm(payout, availableBalance, lang) {
  const l = getCurrentLang(lang);
  const errors = {};

  const payoutFieldName = { ar: 'مبلغ السحب', fr: 'Montant du retrait', en: 'Payout amount' }[l];
  const amountCheck = validateAmount(payout.amount, {
    min: 1000,
    max: availableBalance > 0 ? availableBalance : 1000,
    fieldName: payoutFieldName,
    lang: l
  });

  if (!amountCheck.isValid) {
    errors.amount = amountCheck.error;
  } else if (availableBalance <= 0 || amountCheck.value > availableBalance) {
    const balMsg = {
      ar: `رصيدك المتاح للسحب هو ${availableBalance.toLocaleString('ar-DZ')} د.ج فقط`,
      fr: `Votre solde disponible est de ${availableBalance.toLocaleString('fr-FR')} DZD seulement`,
      en: `Your available balance is only ${availableBalance.toLocaleString('en-US')} DZD`
    }[l];
    errors.amount = balMsg;
  }

  const ripCheck = validateAlgerianRIP(payout.ripNumber, l);
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
 * @param {string} [lang]
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateApplicationForm(application, lang) {
  const l = getCurrentLang(lang);
  const errors = {};

  const pitch = (application.pitch || '').trim();
  if (!pitch) {
    errors.pitch = { ar: 'رسالة التقديم (Pitch) مطلوبة لشرح فكرتك للراعي', fr: 'Le message de candidature (pitch) est requis', en: 'Pitch message is required to explain your proposal' }[l];
  } else if (pitch.length < 10) {
    errors.pitch = { ar: 'رسالة التقديم قصيرة جداً (10 أحرف على الأقل)', fr: 'Le pitch est trop court (au moins 10 caractères)', en: 'Pitch is too short (at least 10 characters)' }[l];
  } else if (pitch.length > 1000) {
    errors.pitch = { ar: 'رسالة التقديم طويلة جداً (1000 حرف كحد أقصى)', fr: 'Le pitch est trop long (1000 caractères max)', en: 'Pitch is too long (1000 characters max)' }[l];
  }

  if (application.sampleUrl && application.sampleUrl.trim()) {
    const urlCheck = validateUrl(application.sampleUrl, false, l);
    if (!urlCheck.isValid) {
      errors.sampleUrl = { ar: 'رابط نموذج العمل غير صالح (يجب أن يكون رابطاً صحيحاً)', fr: 'Lien du livrable invalide', en: 'Invalid sample work URL' }[l];
    }
  }

  const days = Number(application.deliveryDays);
  if (isNaN(days) || days < 1 || days > 60) {
    errors.deliveryDays = { ar: 'مدة التسليم يجب أن تكون بين 1 و 60 يوماً', fr: 'Le délai de livraison doit être entre 1 et 60 jours', en: 'Delivery timeframe must be between 1 and 60 days' }[l];
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates a direct chat message
 * @param {string} text
 * @param {string} [lang]
 * @returns {{ isValid: boolean, sanitized: string, error: string|null }}
 */
export function validateChatMessage(text, lang) {
  const l = getCurrentLang(lang);
  if (!text || typeof text !== 'string' || !text.trim()) {
    const err = { ar: 'لا يمكن إرسال رسالة فارغة', fr: "Impossible d'envoyer un message vide", en: 'Cannot send an empty message' }[l];
    return { isValid: false, sanitized: '', error: err };
  }

  const sanitized = sanitizeText(text, 1000);
  if (sanitized.length === 0) {
    const err = { ar: 'محتوى الرسالة غير صالح', fr: 'Contenu du message invalide', en: 'Invalid message content' }[l];
    return { isValid: false, sanitized: '', error: err };
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
