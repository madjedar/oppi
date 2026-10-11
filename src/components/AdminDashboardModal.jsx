import React, { useState, useEffect } from 'react';
import { 
  X, Activity, Users, FileText, Wallet, ShieldCheck, ShieldAlert,
  CheckCircle, XCircle, MoreVertical, Search, Globe
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { canAccessAdmin } from '../utils/authGuards';
import { formatDZD } from '../services/chargilyService';
import { supabase } from '../lib/supabase';
import { getLocalizedStatus } from '../utils/localized';

export default function AdminDashboardModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Authorization Check: Only Admin can fetch or view
  useEffect(() => {
    if (!isOpen) return;
    if (!canAccessAdmin(user)) {
      console.warn('Unauthorized access attempt to Admin Dashboard.');
      onClose();
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { getAllUsersAdmin, getAllCampaignsAdmin, getAllApplicationsAdmin } = await import('../services/dbService');
        const [userData, campaignData, appData] = await Promise.all([
          getAllUsersAdmin(),
          getAllCampaignsAdmin(),
          getAllApplicationsAdmin()
        ]);
        setUsers(userData || []);
        setCampaigns(campaignData || []);
        setApplications(appData || []);
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, user, onClose]);

  if (!isOpen || !canAccessAdmin(user)) return null;

  // Overview Stats
  const creatorCount = users.filter(u => u.role === 'creator').length;
  const brandCount = users.filter(u => u.role === 'brand').length;
  const totalBudget = campaigns.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
  const platformRevenue = Math.round(totalBudget * 0.10); // 10% platform fee calculation

  const handleVerifyUser = async (id) => {
    const { verifyUserAdmin } = await import('../services/dbService');
    try {
      await verifyUserAdmin(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_verified: true } : u));
    } catch (err) {
      console.error('Error verifying user:', err);
    }
  };

  const handleSuspendUser = async (id) => {
    const { suspendUserAdmin } = await import('../services/dbService');
    try {
      await suspendUserAdmin(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_verified: false } : u));
    } catch (err) {
      console.error('Error suspending user:', err);
    }
  };

  const handleApproveCampaign = async (id) => {
    const { updateCampaignStatus } = await import('../services/dbService');
    try {
      await updateCampaignStatus(id, 'active');
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'active' } : c));
    } catch (err) {
      console.error('Error approving campaign:', err);
    }
  };

  const handleRejectCampaign = async (id) => {
    const { updateCampaignStatus } = await import('../services/dbService');
    try {
      await updateCampaignStatus(id, 'rejected');
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
    } catch (err) {
      console.error('Error rejecting campaign:', err);
    }
  };

  const handleCompleteApplication = async (id) => {
    const { updateApplicationStatus } = await import('../services/dbService');
    try {
      await updateApplicationStatus(id, 'completed');
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'completed' } : a));
    } catch (err) {
      console.error('Error completing application:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-brand-brown/40 backdrop-blur-sm overflow-y-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-brand-border px-4 sm:px-8 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-cream border border-brand-border text-brand-orange flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-brand-brown flex items-center gap-3">
              {t('adminOverviewTitle')}
              <span className="px-3 py-1 rounded-full bg-brand-cream text-brand-orange text-xs font-bold border border-brand-orange/30">Admin</span>
            </h1>
            <p className="text-sm font-medium text-brand-brownLight">{t('adminOverviewSub')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            aria-label={t('close')}
            className="p-3 text-brand-brownLight hover:text-brand-orange hover:bg-brand-cream rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-8 border-b border-brand-border">
          {[
            { id: 'overview', label: t('adminOverview'), icon: Activity },
            { id: 'users', label: t('adminUsers'), icon: Users },
            { id: 'campaigns', label: t('adminCampaigns'), icon: FileText },
            { id: 'financial', label: `${t('adminEscrow')} 💰`, icon: Wallet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3.5 rounded-full font-bold text-sm flex items-center gap-2.5 transition-all whitespace-nowrap border shadow-sm ${
                  isActive
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-white text-brand-brownLight border-brand-border hover:border-brand-orange/30 hover:text-brand-orange'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="text-center py-12 text-slate-400 text-sm">{t('loading')}</div>
        )}

        {/* Tab 1: Overview */}
        {!loading && activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-2xl font-black text-brand-brown mb-6 tracking-wide">{t('adminOverview')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-brand-border rounded-[24px] shadow-sm p-6">
                <p className="text-sm font-bold text-brand-brownLight mb-2">{t('adminTotalCreators')}</p>
                <p className="text-3xl font-black text-brand-brown">{creatorCount}</p>
              </div>
              <div className="bg-white border border-brand-border rounded-[24px] shadow-sm p-6">
                <p className="text-sm font-bold text-brand-brownLight mb-2">{t('adminTotalBrands')}</p>
                <p className="text-3xl font-black text-brand-brown">{brandCount}</p>
              </div>
              <div className="bg-white border border-brand-border rounded-[24px] shadow-sm p-6">
                <p className="text-sm font-bold text-brand-brownLight mb-2">{t('adminTotalTx')}</p>
                <p className="text-3xl font-black text-brand-orange font-mono">{formatDZD(totalBudget, language)}</p>
              </div>
              <div className="bg-brand-cream border border-brand-border rounded-[24px] shadow-sm p-6">
                <p className="text-sm font-bold text-brand-brownLight mb-2">{t('adminPlatformFee')}</p>
                <p className="text-3xl font-black text-emerald-600 font-mono">{formatDZD(platformRevenue, language)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users */}
        {!loading && activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-brand-brown tracking-wide">{t('adminUsers')}</h3>
            </div>
            
            <div className="bg-white border border-brand-border rounded-[24px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <thead className="bg-brand-cream/50 text-brand-brownLight border-b border-brand-border">
                    <tr>
                      <th className="px-6 py-4 font-bold">{t('adminColName')}</th>
                      <th className="px-6 py-4 font-bold">{t('adminColRole')}</th>
                      <th className="px-6 py-4 font-bold">{t('adminColEmail')}</th>
                      <th className="px-6 py-4 font-bold">{t('adminColStatus')}</th>
                      <th className="px-6 py-4 font-bold text-center">{t('adminColActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-6 py-4 text-brand-brown font-bold">{userItem.full_name || userItem.brand_name || t('unnamedUser')}</td>
                        <td className="px-6 py-4 font-medium text-brand-brownLight">
                          {userItem.role === 'creator' ? t('roleCreator') : userItem.role === 'brand' ? t('roleBrand') : userItem.role || '—'}
                        </td>
                        <td className="px-6 py-4 text-brand-brownLight text-xs font-mono font-medium" dir="ltr">{userItem.id?.slice(0, 8)}...</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            userItem.is_verified ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-brand-cream text-brand-orange border-brand-orange/30'
                          }`}>
                            {userItem.is_verified ? t('verified') : t('pendingReview')}
                          </span>
                        </td>
                        <td className="px-6 py-4 flex items-center justify-center gap-2">
                          <button onClick={() => handleVerifyUser(userItem.id)} className="text-emerald-600 hover:text-emerald-700 px-4 py-1.5 bg-emerald-50 rounded-full font-bold text-xs border border-emerald-200">{t('adminActionVerify')}</button>
                          <button onClick={() => handleSuspendUser(userItem.id)} className="text-red-600 hover:text-red-700 px-4 py-1.5 bg-red-50 rounded-full font-bold text-xs border border-red-200">{t('adminActionSuspend')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Campaigns */}
        {!loading && activeTab === 'campaigns' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-2xl font-black text-brand-brown tracking-wide mb-6">{t('adminCampaigns')}</h3>
            <div className="grid gap-4">
              {campaigns.length === 0 ? (
                <p className="text-brand-brownLight font-medium text-center py-8">{t('noCampaignsYet')}</p>
              ) : (
                campaigns.map((camp) => (
                  <div key={camp.id} className="bg-white border border-brand-border rounded-[24px] shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-bold text-brand-brown tracking-wide">{camp.title}</h4>
                      <p className="text-sm font-medium text-brand-brownLight mt-1">{t('fromLabel')}: <span className="font-bold">{camp.brand?.brand_name || camp.brand?.full_name || t('roleBrand')}</span> | {t('budget')}: <span className="font-mono font-bold">{formatDZD(camp.budget, language)}</span></p>
                      <span className={`inline-block mt-3 px-3 py-1.5 rounded-full text-xs font-bold border ${
                        camp.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-brand-cream text-brand-orange border-brand-orange/30'
                      }`}>
                        {getLocalizedStatus(camp.status, language)}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      {camp.status !== 'active' && (
                        <button onClick={() => handleApproveCampaign(camp.id)} className="btn-primary px-6 py-2.5 text-sm font-bold">{t('adminActionApprove')}</button>
                      )}
                      <button onClick={() => handleRejectCampaign(camp.id)} className="px-6 py-2.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-full hover:bg-red-100 transition-colors font-bold">{t('adminActionReject')}</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Financial (Applications as Escrow) */}
        {!loading && activeTab === 'financial' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-2xl font-black text-brand-brown tracking-wide mb-6">{t('adminEscrow')}</h3>
            <div className="bg-white border border-brand-border rounded-[24px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <thead className="bg-brand-cream/50 text-brand-brownLight border-b border-brand-border">
                    <tr>
                      <th className="px-6 py-4 font-bold">{t('adminColCampaign')}</th>
                      <th className="px-6 py-4 font-bold">{t('adminColCreator')}</th>
                      <th className="px-6 py-4 font-bold">{t('walletAmountCol')}</th>
                      <th className="px-6 py-4 font-bold">{t('walletStatus')}</th>
                      <th className="px-6 py-4 font-bold text-center">{t('adminColActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {applications.filter(a => a.status === 'approved' || a.status === 'completed').map((app) => (
                      <tr key={app.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-6 py-4 text-brand-brown font-bold">{app.campaign?.title || '—'}</td>
                        <td className="px-6 py-4 font-medium text-brand-brownLight">{app.creator?.full_name || '—'}</td>
                        <td className="px-6 py-4 text-brand-orange font-black font-mono">{formatDZD(app.campaign?.budget || 0, language)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                            app.status === 'approved' ? 'bg-brand-cream text-brand-orange border-brand-orange/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}>
                            {getLocalizedStatus(app.status === 'approved' ? 'escrow_funded' : app.status, language)}
                          </span>
                        </td>
                        <td className="px-6 py-4 flex items-center justify-center gap-2">
                          {app.status === 'approved' ? (
                            <button onClick={() => handleCompleteApplication(app.id)} className="text-emerald-600 hover:text-emerald-700 px-4 py-2 bg-emerald-50 rounded-full font-bold text-xs border border-emerald-200">{t('adminReleaseFunds')}</button>
                          ) : (
                            <span className="text-brand-brownLight font-medium text-xs">{t('completedStatus')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {applications.filter(a => a.status === 'approved' || a.status === 'completed').length === 0 && (
                      <tr><td colSpan="5" className="px-6 py-8 text-center text-brand-brownLight font-medium">{t('noDealsYet')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
