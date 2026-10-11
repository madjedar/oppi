/**
 * Localized Item String Resolver & Dynamic Taxonomy Localization
 * OPPI
 * 
 * Provides robust dictionary lookups for Categories, Deliverables, Statuses,
 * Wilayas, and custom multilingual data structures.
 */

export const CATEGORIES_MAP = {
  all: { ar: 'الكل', fr: 'Tous', en: 'All' },
  'الكل': { ar: 'الكل', fr: 'Tous', en: 'All' },
  tech: { ar: 'تقنية وجيمنج', fr: 'High-Tech & Gaming', en: 'Tech & Gaming' },
  'تكنولوجيا': { ar: 'تكنولوجيا', fr: 'High-Tech & Gaming', en: 'Tech & Gaming' },
  'تقنية': { ar: 'تقنية وجيمنج', fr: 'High-Tech & Gaming', en: 'Tech & Gaming' },
  fashion: { ar: 'أزياء وموضة', fr: 'Mode & Beauté', en: 'Fashion & Beauty' },
  'موضة وأزياء': { ar: 'موضة وأزياء', fr: 'Mode & Beauté', en: 'Fashion & Beauty' },
  'أزياء وموضة': { ar: 'أزياء وموضة', fr: 'Mode & Beauté', en: 'Fashion & Beauty' },
  food: { ar: 'طبخ ومأكولات', fr: 'Cuisine & Gastronomie', en: 'Food & Cooking' },
  'طبخ وأكل': { ar: 'طبخ ومأكولات', fr: 'Cuisine & Gastronomie', en: 'Food & Cooking' },
  'طبخ ومأكولات': { ar: 'طبخ ومأكولات', fr: 'Cuisine & Gastronomie', en: 'Food & Cooking' },
  lifestyle: { ar: 'أسلوب حياة', fr: 'Style de vie', en: 'Lifestyle' },
  'أسلوب حياة': { ar: 'أسلوب حياة', fr: 'Style de vie', en: 'Lifestyle' },
  beauty: { ar: 'تجميل وعناية', fr: 'Beauté & Soins', en: 'Beauty & Skincare' },
  'تجميل وعناية': { ar: 'تجميل وعناية', fr: 'Beauté & Soins', en: 'Beauty & Skincare' },
  education: { ar: 'تعليم وتدريب', fr: 'Éducation & Formation', en: 'Education & Training' },
  'تعليم': { ar: 'تعليم', fr: 'Éducation & Formation', en: 'Education' },
  fitness: { ar: 'رياضة وصحة', fr: 'Fitness & Santé', en: 'Fitness & Health' },
  'رياضة ولياقة': { ar: 'رياضة ولياقة', fr: 'Fitness & Santé', en: 'Fitness & Health' },
  'رياضة وصحة': { ar: 'رياضة وصحة', fr: 'Fitness & Santé', en: 'Fitness & Health' },
  travel: { ar: 'سياحة وسفر', fr: 'Voyage & Tourisme', en: 'Travel & Tourism' },
  'سفر وسياحة': { ar: 'سفر وسياحة', fr: 'Voyage & Tourisme', en: 'Travel & Tourism' },
  'سياحة وسفر': { ar: 'سياحة وسفر', fr: 'Voyage & Tourisme', en: 'Travel & Tourism' },
  ecommerce: { ar: 'تجارة إلكترونية', fr: 'E-commerce', en: 'E-commerce' },
  'تجارة إلكترونية': { ar: 'تجارة إلكترونية', fr: 'E-commerce', en: 'E-commerce' },
  gaming: { ar: 'ألعاب فيديو', fr: 'Jeux Vidéo', en: 'Gaming' },
  general: { ar: 'عام', fr: 'Général', en: 'General' },
  'عام': { ar: 'عام', fr: 'Général', en: 'General' }
};

export const DELIVERABLES_MAP = {
  post: { ar: 'منشور إنستغرام', fr: 'Publication Instagram', en: 'Instagram Post' },
  'منشور إنستغرام': { ar: 'منشور إنستغرام', fr: 'Publication Instagram', en: 'Instagram Post' },
  story: { ar: 'قصة (Story)', fr: 'Story Instagram', en: 'Instagram Story' },
  'قصة (Story)': { ar: 'قصة (Story)', fr: 'Story Instagram', en: 'Instagram Story' },
  reel: { ar: 'فيديو ريلز', fr: 'Reel Instagram', en: 'Instagram Reel' },
  'فيديو ريلز': { ar: 'فيديو ريلز', fr: 'Reel Instagram', en: 'Instagram Reel' },
  tiktok: { ar: 'فيديو تيك توك', fr: 'Vidéo TikTok', en: 'TikTok Video' },
  'فيديو تيك توك': { ar: 'فيديو تيك توك', fr: 'Vidéo TikTok', en: 'TikTok Video' },
  youtube: { ar: 'فيديو يوتيوب', fr: 'Vidéo YouTube', en: 'YouTube Video' },
  'فيديو يوتيوب': { ar: 'فيديو يوتيوب', fr: 'Vidéo YouTube', en: 'YouTube Video' },
  review: { ar: 'مراجعة منتج', fr: 'Test Produit', en: 'Product Review' },
  'مراجعة منتج': { ar: 'مراجعة منتج', fr: 'Test Produit', en: 'Product Review' },
  event: { ar: 'حضور فعالية', fr: 'Présence Événement', en: 'Event Attendance' },
  'حضور فعالية': { ar: 'حضور فعالية', fr: 'Présence Événement', en: 'Event Attendance' }
};

export const STATUSES_MAP = {
  pending: { ar: 'قيد الانتظار', fr: 'En attente', en: 'Pending' },
  escrow_funded: { ar: 'الضمان مؤمن', fr: 'Fonds sécurisés', en: 'Escrow Funded' },
  in_progress: { ar: 'قيد التنفيذ', fr: 'En cours', en: 'In Progress' },
  submitted: { ar: 'تم تسليم العمل', fr: 'Livrable soumis', en: 'Delivered' },
  completed: { ar: 'مكتمل ومحرر', fr: 'Terminé & Libéré', en: 'Completed & Released' },
  released: { ar: 'تم تحرير المستحقات', fr: 'Fonds libérés', en: 'Funds Released' },
  rejected: { ar: 'مرفوض', fr: 'Refusé', en: 'Rejected' },
  disputed: { ar: 'نزاع مفتوح', fr: 'En litige', en: 'Disputed' },
  active: { ar: 'نشط', fr: 'Actif', en: 'Active' },
  paused: { ar: 'متوقف مؤقتاً', fr: 'En pause', en: 'Paused' },
  closed: { ar: 'مغلق', fr: 'Fermé', en: 'Closed' },
  draft: { ar: 'مسودة', fr: 'Brouillon', en: 'Draft' },
  refunded: { ar: 'مسترجع', fr: 'Remboursé', en: 'Refunded' },
  failed: { ar: 'فشل', fr: 'Échoué', en: 'Failed' },
  paid: { ar: 'مدفوع', fr: 'Payé', en: 'Paid' },
  unpaid: { ar: 'غير مدفوع', fr: 'Non payé', en: 'Unpaid' }
};

export const WILAYAS_DATA = [
  { code: '01', ar: 'أدرار', fr: 'Adrar', en: 'Adrar' },
  { code: '02', ar: 'الشلف', fr: 'Chlef', en: 'Chlef' },
  { code: '03', ar: 'الأغواط', fr: 'Laghouat', en: 'Laghouat' },
  { code: '04', ar: 'أم البواقي', fr: 'Oum El Bouaghi', en: 'Oum El Bouaghi' },
  { code: '05', ar: 'باتنة', fr: 'Batna', en: 'Batna' },
  { code: '06', ar: 'بجاية', fr: 'Béjaïa', en: 'Bejaia' },
  { code: '07', ar: 'بسكرة', fr: 'Biskra', en: 'Biskra' },
  { code: '08', ar: 'بشار', fr: 'Béchar', en: 'Bechar' },
  { code: '09', ar: 'البليدة', fr: 'Blida', en: 'Blida' },
  { code: '10', ar: 'البويرة', fr: 'Bouira', en: 'Bouira' },
  { code: '11', ar: 'تمنراست', fr: 'Tamanrasset', en: 'Tamanrasset' },
  { code: '12', ar: 'تبسة', fr: 'Tébessa', en: 'Tebessa' },
  { code: '13', ar: 'تلمسان', fr: 'Tlemcen', en: 'Tlemcen' },
  { code: '14', ar: 'تيارت', fr: 'Tiaret', en: 'Tiaret' },
  { code: '15', ar: 'تيزي وزو', fr: 'Tizi Ouzou', en: 'Tizi Ouzou' },
  { code: '16', ar: 'الجزائر', fr: 'Alger', en: 'Algiers' },
  { code: '17', ar: 'الجلفة', fr: 'Djelfa', en: 'Djelfa' },
  { code: '18', ar: 'جيجل', fr: 'Jijel', en: 'Jijel' },
  { code: '19', ar: 'سطيف', fr: 'Sétif', en: 'Setif' },
  { code: '20', ar: 'سعيدة', fr: 'Saïda', en: 'Saida' },
  { code: '21', ar: 'سكيكدة', fr: 'Skikda', en: 'Skikda' },
  { code: '22', ar: 'سيدي بلعباس', fr: 'Sidi Bel Abbès', en: 'Sidi Bel Abbes' },
  { code: '23', ar: 'عنابة', fr: 'Annaba', en: 'Annaba' },
  { code: '24', ar: 'قالمة', fr: 'Guelma', en: 'Guelma' },
  { code: '25', ar: 'قسنطينة', fr: 'Constantine', en: 'Constantine' },
  { code: '26', ar: 'المدية', fr: 'Médéa', en: 'Medea' },
  { code: '27', ar: 'مستغانم', fr: 'Mostaganem', en: 'Mostaganem' },
  { code: '28', ar: 'المسيلة', fr: "M'Sila", en: "M'Sila" },
  { code: '29', ar: 'معسكر', fr: 'Mascara', en: 'Mascara' },
  { code: '30', ar: 'ورقلة', fr: 'Ouargla', en: 'Ouargla' },
  { code: '31', ar: 'وهران', fr: 'Oran', en: 'Oran' },
  { code: '32', ar: 'البيض', fr: 'El Bayadh', en: 'El Bayadh' },
  { code: '33', ar: 'إليزي', fr: 'Illizi', en: 'Illizi' },
  { code: '34', ar: 'برج بوعريريج', fr: 'Bordj Bou Arreridj', en: 'Bordj Bou Arreridj' },
  { code: '35', ar: 'بومرداس', fr: 'Boumerdès', en: 'Boumerdes' },
  { code: '36', ar: 'الطارف', fr: 'El Tarf', en: 'El Tarf' },
  { code: '37', ar: 'تندوف', fr: 'Tindouf', en: 'Tindouf' },
  { code: '38', ar: 'تيسمسيلت', fr: 'Tissemsilt', en: 'Tissemsilt' },
  { code: '39', ar: 'الوادي', fr: 'El Oued', en: 'El Oued' },
  { code: '40', ar: 'خنشلة', fr: 'Khenchela', en: 'Khenchela' },
  { code: '41', ar: 'سوق أهراس', fr: 'Souk Ahras', en: 'Souk Ahras' },
  { code: '42', ar: 'تيبازة', fr: 'Tipaza', en: 'Tipaza' },
  { code: '43', ar: 'ميلة', fr: 'Mila', en: 'Mila' },
  { code: '44', ar: 'عين الدفلى', fr: 'Aïn Defla', en: 'Ain Defla' },
  { code: '45', ar: 'النعامة', fr: 'Naâma', en: 'Naama' },
  { code: '46', ar: 'عين تموشنت', fr: 'Aïn Témouchent', en: 'Ain Temouchent' },
  { code: '47', ar: 'غرداية', fr: 'Ghardaïa', en: 'Ghardaia' },
  { code: '48', ar: 'غليزان', fr: 'Relizane', en: 'Relizane' },
  { code: '49', ar: 'تيميمون', fr: 'Timimoun', en: 'Timimoun' },
  { code: '50', ar: 'برج باجي مختار', fr: 'Bordj Badji Mokhtar', en: 'Bordj Badji Mokhtar' },
  { code: '51', ar: 'أولاد جلال', fr: 'Ouled Djellal', en: 'Ouled Djellal' },
  { code: '52', ar: 'بني عباس', fr: 'Béni Abbès', en: 'Beni Abbes' },
  { code: '53', ar: 'عين صالح', fr: 'In Salah', en: 'In Salah' },
  { code: '54', ar: 'عين قزام', fr: 'In Guezzam', en: 'In Guezzam' },
  { code: '55', ar: 'تقرت', fr: 'Touggourt', en: 'Touggourt' },
  { code: '56', ar: 'جانت', fr: 'Djanet', en: 'Djanet' },
  { code: '57', ar: 'المغير', fr: "El M'Ghair", en: "El M'Ghair" },
  { code: '58', ar: 'المنيعة', fr: 'El Meniaa', en: 'El Meniaa' },
];

/**
 * Safely extracts localized string for a given field from an object or string.
 * Supports multilingual fallback: requested lang -> 'en' -> 'ar' -> empty string.
 */
export const getLocalizedItem = (item, field, lang = 'ar') => {
  if (!item || !item[field]) return '';
  if (typeof item[field] === 'string') return item[field];
  return (
    item[field][lang] ||
    item[field]['en'] ||
    item[field]['ar'] ||
    item[field]['fr'] ||
    ''
  );
};

/**
 * Translates category identifier to target language
 */
export const getLocalizedCategory = (category, lang = 'ar') => {
  if (!category) return '';
  const key = String(category).toLowerCase().trim();
  const entry = CATEGORIES_MAP[key] || CATEGORIES_MAP[category];
  if (entry) {
    return entry[lang] || entry['en'] || entry['ar'] || category;
  }
  return category;
};

/**
 * Translates deliverable identifier to target language
 */
export const getLocalizedDeliverable = (deliverable, lang = 'ar') => {
  if (!deliverable) return '';
  const key = String(deliverable).toLowerCase().trim();
  const entry = DELIVERABLES_MAP[key] || DELIVERABLES_MAP[deliverable];
  if (entry) {
    return entry[lang] || entry['en'] || entry['ar'] || deliverable;
  }
  return deliverable;
};

/**
 * Translates deal / application / campaign status to target language
 */
export const getLocalizedStatus = (status, lang = 'ar') => {
  if (!status) return '';
  const key = String(status).toLowerCase().trim();
  const entry = STATUSES_MAP[key];
  if (entry) {
    return entry[lang] || entry['en'] || entry['ar'] || status;
  }
  return status;
};

/**
 * Translates Wilaya name to target language (e.g. 16 - Alger vs 16 - الجزائر)
 */
export const getLocalizedWilaya = (wilayaInput, lang = 'ar', includeCode = false) => {
  if (!wilayaInput) return '';
  const clean = String(wilayaInput).trim();
  
  // Find matching wilaya in dataset
  const match = WILAYAS_DATA.find((w) => {
    return (
      w.code === clean ||
      w.ar === clean ||
      w.fr.toLowerCase() === clean.toLowerCase() ||
      w.en.toLowerCase() === clean.toLowerCase() ||
      clean.includes(w.ar) ||
      clean.toLowerCase().includes(w.fr.toLowerCase())
    );
  });

  if (match) {
    const name = match[lang] || match['fr'] || match['ar'];
    return includeCode ? `${match.code} - ${name}` : name;
  }

  return clean;
};

/**
 * Returns list of wilayas formatted for the active language
 */
export const getLocalizedWilayasList = (lang = 'ar') => {
  return WILAYAS_DATA.map((w) => ({
    code: w.code,
    name: w[lang] || w.fr,
    displayName: `${w.code} - ${w[lang] || w.fr}`
  }));
};

export default getLocalizedItem;
