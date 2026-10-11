import { describe, it, expect } from 'vitest';
import {
  isAdmin,
  isBrand,
  isCreator,
  canApplyToCampaign,
  canCreateCampaign,
  canHireCreator,
  canViewCreatorDirectory,
  canViewCampaignDirectory,
  canViewCreatorProfile
} from './authGuards';

describe('Role & Authorization Guards', () => {
  describe('isAdmin', () => {
    it('identifies admin by role property', () => {
      expect(isAdmin({ role: 'admin' })).toBe(true);
      expect(isAdmin({ user_metadata: { role: 'admin' } })).toBe(true);
      expect(isAdmin({ profile: { role: 'admin' } })).toBe(true);
    });

    it('identifies admin by hardcoded admin email', () => {
      expect(isAdmin({ email: 'madjedalirachedi291@gmail.com' })).toBe(true);
      expect(isAdmin({ email: 'madjedar@gmail.com' })).toBe(true);
    });

    it('returns false for non-admin users or null', () => {
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin({ role: 'creator', email: 'creator@example.com' })).toBe(false);
      expect(isAdmin({ role: 'brand', email: 'brand@example.com' })).toBe(false);
    });
  });

  describe('isBrand', () => {
    it('returns true for brand roles', () => {
      expect(isBrand({ role: 'brand' })).toBe(true);
      expect(isBrand({ profile: { role: 'brand' } })).toBe(true);
    });

    it('returns false for creator or null', () => {
      expect(isBrand(null)).toBe(false);
      expect(isBrand({ role: 'creator' })).toBe(false);
    });
  });

  describe('isCreator', () => {
    it('returns true for creator roles', () => {
      expect(isCreator({ role: 'creator' })).toBe(true);
      expect(isCreator({ profile: { role: 'creator' } })).toBe(true);
    });

    it('returns false for brand or null', () => {
      expect(isCreator(null)).toBe(false);
      expect(isCreator({ role: 'brand' })).toBe(false);
    });
  });

  describe('canApplyToCampaign', () => {
    it('allows creators to apply to campaigns', () => {
      const creator = { role: 'creator', email: 'regular_creator@example.com' };
      expect(canApplyToCampaign(creator)).toBe(true);
    });

    it('allows creators whose email matches admin addresses or usernames to apply', () => {
      const creatorWithAdminEmail = { role: 'creator', email: 'madjedar@gmail.com' };
      expect(canApplyToCampaign(creatorWithAdminEmail)).toBe(true);

      const creatorWithProfileRole = { email: 'madjedalirachedi291@gmail.com', profile: { role: 'creator' } };
      expect(canApplyToCampaign(creatorWithProfileRole)).toBe(true);
    });

    it('allows platform administrators to apply for testing active campaigns', () => {
      expect(canApplyToCampaign({ role: 'admin' })).toBe(true);
      expect(canApplyToCampaign({ email: 'madjedar@gmail.com' })).toBe(true);
    });

    it('disallows brands and unauthenticated users', () => {
      expect(canApplyToCampaign(null)).toBe(false);
      expect(canApplyToCampaign({ role: 'brand', email: 'brand_owner@example.com' })).toBe(false);
    });
  });

  describe('canCreateCampaign', () => {
    it('allows store / company / brand accounts to create campaigns', () => {
      expect(canCreateCampaign({ role: 'brand' })).toBe(true);
      expect(canCreateCampaign({ role: 'store' })).toBe(true);
      expect(canCreateCampaign({ role: 'company' })).toBe(true);
      expect(canCreateCampaign({ profile: { role: 'brand' } })).toBe(true);
      expect(canCreateCampaign({ profile: { role: 'store' } })).toBe(true);
      expect(canCreateCampaign({ user_metadata: { role: 'company' } })).toBe(true);
    });

    it('strictly disallows creator accounts from creating campaigns', () => {
      expect(canCreateCampaign({ role: 'creator' })).toBe(false);
      expect(canCreateCampaign({ profile: { role: 'creator' } })).toBe(false);
      expect(canCreateCampaign({ role: 'creator', email: 'madjedar@gmail.com' })).toBe(false);
    });

    it('disallows unauthenticated users', () => {
      expect(canCreateCampaign(null)).toBe(false);
    });
  });

  describe('canHireCreator', () => {
    it('allows brands to hire creators', () => {
      expect(canHireCreator({ role: 'brand' })).toBe(true);
    });

    it('disallows creators and unauthenticated users', () => {
      expect(canHireCreator(null)).toBe(false);
      expect(canHireCreator({ role: 'creator' })).toBe(false);
    });
  });

  describe('marketplace visibility', () => {
    it('segregates creator and campaign directories by role', () => {
      expect(canViewCreatorDirectory(null)).toBe(true);
      expect(canViewCreatorDirectory({ role: 'brand' })).toBe(true);
      expect(canViewCreatorDirectory({ role: 'admin' })).toBe(true);
      expect(canViewCreatorDirectory({ role: 'creator' })).toBe(false);

      expect(canViewCampaignDirectory(null)).toBe(true);
      expect(canViewCampaignDirectory({ role: 'creator' })).toBe(true);
      expect(canViewCampaignDirectory({ role: 'admin' })).toBe(true);
      expect(canViewCampaignDirectory({ role: 'brand' })).toBe(false);
    });

    it('limits creator profiles to brands, admins, and the creator themselves', () => {
      expect(canViewCreatorProfile(null, 'creator-1')).toBe(false);
      expect(canViewCreatorProfile({ role: 'brand' }, 'creator-1')).toBe(true);
      expect(canViewCreatorProfile({ role: 'admin' }, 'creator-1')).toBe(true);
      expect(canViewCreatorProfile({ id: 'creator-1', role: 'creator' }, 'creator-1')).toBe(true);
      expect(canViewCreatorProfile({ id: 'creator-2', role: 'creator' }, 'creator-1')).toBe(false);
    });
  });
});
