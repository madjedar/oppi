/**
 * Role-Based Access Control (RBAC) & Authorization Helper Utilities
 * OPPI
 */

export const ADMIN_EMAILS = [
  'madjedalirachedi291@gmail.com',
  'madjedar@gmail.com'
];

/**
 * Checks whether the given user has administrator privileges
 * @param {object|null} user 
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  return (
    user.role === 'admin' ||
    user.isAdmin === true ||
    user.profile?.role === 'admin' ||
    user.user_metadata?.role === 'admin' ||
    ADMIN_EMAILS.includes(email)
  );
};

/**
 * Checks whether the user is a Brand / Store Owner
 * @param {object|null} user 
 * @returns {boolean}
 */
export const isBrand = (user) => {
  if (!user) return false;
  return (
    user.role === 'brand' ||
    user.profile?.role === 'brand' ||
    user.user_metadata?.role === 'brand' ||
    user.user_metadata?.account_type === 'brand'
  );
};

/**
 * Checks whether the user is a Content Creator
 * @param {object|null} user 
 * @returns {boolean}
 */
export const isCreator = (user) => {
  if (!user) return false;
  return (
    user.role === 'creator' ||
    user.profile?.role === 'creator' ||
    user.user_metadata?.role === 'creator' ||
    user.user_metadata?.account_type === 'creator'
  );
};

/**
 * Checks whether the user is authorized to apply to campaigns
 * @param {object|null} user 
 * @returns {boolean}
 */
export const canApplyToCampaign = (user) => {
  if (!user) return false;
  return isCreator(user) || isAdmin(user);
};

/**
 * Checks whether the user is authorized to create/manage campaigns.
 * Strictly only for users who have a store / project account (brand), never for creators.
 * @param {object|null} user 
 * @returns {boolean}
 */
export const canCreateCampaign = (user) => {
  if (!user) return false;
  if (isCreator(user)) return false;
  return isBrand(user);
};

/**
 * Checks whether the user is authorized to hire a creator & fund escrow
 * @param {object|null} user 
 * @returns {boolean}
 */
export const canHireCreator = (user) => {
  return isBrand(user) || isAdmin(user);
};

/**
 * Checks whether the user is authorized to access the Admin Panel
 * @param {object|null} user 
 * @returns {boolean}
 */
export const canAccessAdmin = (user) => {
  return isAdmin(user);
};

/**
 * Checks whether the user is authorized to submit deliverables for a deal
 * @param {object|null} user 
 * @param {object} application 
 * @returns {boolean}
 */
export const canSubmitDeliverable = (user, application) => {
  if (!user || !application) return false;
  return user.id === application.creator_id || isCreator(user);
};

/**
 * Checks whether the user is authorized to request payouts (BaridiMob/CCP)
 * @param {object|null} user 
 * @returns {boolean}
 */
export const canRequestPayout = (user) => {
  return isCreator(user);
};

/**
 * Checks whether the user is authorized to access the Creator Dashboard
 * @param {object|null} user 
 * @returns {boolean}
 */
export const canAccessCreatorDashboard = (user) => {
  return isCreator(user) || isAdmin(user);
};

/**
 * Checks whether the user is authorized to access the Brand Dashboard
 * @param {object|null} user 
 * @returns {boolean}
 */
export const canAccessBrandDashboard = (user) => {
  return isBrand(user) || isAdmin(user);
};
