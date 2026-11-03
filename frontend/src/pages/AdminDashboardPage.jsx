import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import {
  apiGetAdminStats,
  apiGetAdminUsers,
  apiUpdateUserStatus,
  apiGetAdminReports,
  apiResolveReport,
  apiGetAdminVerifications,
  apiReviewVerification,
  apiGetAdminAuditLogs,
  apiAdminDeletePost
} from '../services/api';
import VerifiedBadge from '../components/VerifiedBadge';
import { getAvatarUrl, formatRelativeTime } from '../utils/formatDate';
import {
  ShieldCheckIcon,
  BadgeCheckIcon,
  UsersIcon,
  FlagIcon,
  BanIcon,
  CheckIcon,
  RefreshCwIcon,
  SearchIcon,
  TrashIcon,
  GlobeIcon,
  FilmIcon,
  FileTextIcon
} from '../components/Icons';

export const AdminDashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'reports' | 'verifications' | 'audit'

  // Loading states
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState(null);

  // Users Tab state
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  // Moderation Reports Tab state
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState('pending');

  // Verifications Tab state
  const [verifications, setVerifications] = useState([]);
  const [verificationsLoading, setVerificationsLoading] = useState(false);
  const [verificationStatusFilter, setVerificationStatusFilter] = useState('pending');

  // Audit Logs Tab state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Action busy state
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Check Admin permission
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated]);

  // Load stats initially
  useEffect(() => {
    if (user?.role === 'admin') {
      loadStats();
    }
  }, [user]);

  // Load content when tab changes
  useEffect(() => {
    if (user?.role !== 'admin') return;

    if (activeTab === 'overview') {
      loadStats();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'verifications') {
      loadVerifications();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, usersPage, userRoleFilter, userStatusFilter, reportStatusFilter, verificationStatusFilter]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const res = await apiGetAdminStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load system metrics', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await apiGetAdminUsers({
        page: usersPage,
        limit: 20,
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter
      });
      if (res.success) {
        setUsers(res.users);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSearchUsersSubmit = (e) => {
    e.preventDefault();
    setUsersPage(1);
    loadUsers();
  };

  const loadReports = async () => {
    try {
      setReportsLoading(true);
      const res = await apiGetAdminReports({
        status: reportStatusFilter
      });
      if (res.success) {
        setReports(res.reports);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load reports', 'error');
    } finally {
      setReportsLoading(false);
    }
  };

  const loadVerifications = async () => {
    try {
      setVerificationsLoading(true);
      const res = await apiGetAdminVerifications({
        status: verificationStatusFilter
      });
      if (res.success) {
        setVerifications(res.requests);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load verification requests', 'error');
    } finally {
      setVerificationsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await apiGetAdminAuditLogs({ limit: 40 });
      if (res.success) {
        setAuditLogs(res.logs);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load audit logs', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  // Actions: User Management
  const handleToggleUserSuspension = async (targetUser) => {
    const isCurrentlySuspended = targetUser.isSuspended;
    let reason = '';
    if (!isCurrentlySuspended) {
      const input = window.prompt(`Enter reason for suspending @${targetUser.username}:`, 'Violation of community safety standards');
      if (input === null) return;
      reason = input.trim() || 'Terms of service violation';
    }

    try {
      setActionLoadingId(targetUser._id);
      const res = await apiUpdateUserStatus(targetUser._id, {
        isSuspended: !isCurrentlySuspended,
        suspendedReason: reason
      });
      if (res.success) {
        showToast(`User @${targetUser.username} ${isCurrentlySuspended ? 'unsuspended' : 'suspended'}.`, 'success');
        setUsers((prev) =>
          prev.map((u) => (u._id === targetUser._id ? { ...u, isSuspended: !isCurrentlySuspended, suspendedReason: reason } : u))
        );
      }
    } catch (err) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleUserVerification = async (targetUser) => {
    const nextStatus = !targetUser.isVerified;
    try {
      setActionLoadingId(targetUser._id);
      const res = await apiUpdateUserStatus(targetUser._id, {
        isVerified: nextStatus,
        verificationStatus: nextStatus ? 'verified' : 'none'
      });
      if (res.success) {
        showToast(`Verification ${nextStatus ? 'granted to' : 'revoked from'} @${targetUser.username}.`, 'success');
        setUsers((prev) =>
          prev.map((u) => (u._id === targetUser._id ? { ...u, isVerified: nextStatus, verificationStatus: nextStatus ? 'verified' : 'none' } : u))
        );
      }
    } catch (err) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeUserRole = async (targetUser, newRole) => {
    try {
      setActionLoadingId(targetUser._id);
      const res = await apiUpdateUserStatus(targetUser._id, {
        role: newRole
      });
      if (res.success) {
        showToast(`Role updated to ${newRole} for @${targetUser.username}.`, 'success');
        setUsers((prev) =>
          prev.map((u) => (u._id === targetUser._id ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      showToast(err.message || 'Role change failed', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Actions: Moderation Reports
  const handleResolveReport = async (reportId, status, resolutionNote = '') => {
    try {
      setActionLoadingId(reportId);
      const res = await apiResolveReport(reportId, { status, resolutionNote });
      if (res.success) {
        showToast(`Report marked as ${status}.`, 'success');
        setReports((prev) => prev.filter((r) => r._id !== reportId));
      }
    } catch (err) {
      showToast(err.message || 'Failed to update report', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteReportedPost = async (postId, reportId) => {
    if (!window.confirm('Are you sure you want to delete this reported post from Connectly? This action cannot be undone.')) return;
    try {
      setActionLoadingId(reportId);
      const res = await apiAdminDeletePost(postId);
      if (res.success) {
        showToast('Post deleted successfully by administrator.', 'success');
        await apiResolveReport(reportId, { status: 'resolved', resolutionNote: 'Post deleted by Admin' });
        setReports((prev) => prev.filter((r) => r._id !== reportId));
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete post', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Actions: Verification Applications
  const handleReviewVerification = async (requestId, status) => {
    let reviewerNote = '';
    if (status === 'rejected') {
      const note = window.prompt('Optional note explaining rejection:', 'Profile does not meet notability guidelines.');
      if (note === null) return;
      reviewerNote = note.trim();
    }

    try {
      setActionLoadingId(requestId);
      const res = await apiReviewVerification(requestId, {
        status,
        reviewerNote
      });
      if (res.success) {
        showToast(`Verification request ${status}.`, 'success');
        setVerifications((prev) => prev.filter((v) => v._id !== requestId));
      }
    } catch (err) {
      showToast(err.message || 'Failed to process verification', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Guard for non-admin accounts
  if (user && user.role !== 'admin') {
    return (
      <div className="admin-portal max-w-lg mx-auto my-12 p-8 text-center card">
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            color: '#ef4444'
          }}
        >
          <BanIcon size={36} />
        </div>
        <h2 className="text-xl font-bold text-main mb-2">Access Denied</h2>
        <p className="text-secondary text-sm mb-6">
          Administrator privileges are required to view the Connectly Management Console.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Return to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="admin-portal max-w-6xl mx-auto pb-16 px-4">
      {/* Top Banner Header */}
      <div className="admin-header-card p-6 rounded-2xl mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shrink-0">
              <ShieldCheckIcon size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="admin-portal-title text-2xl font-black tracking-tight">Admin Console</h1>
                <span className="admin-portal-badge px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Master Control
                </span>
              </div>
              <p className="admin-portal-sub text-xs mt-0.5">
                Connectly platform moderation, security, verification, and audit operations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'overview') loadStats();
              else if (activeTab === 'users') loadUsers();
              else if (activeTab === 'reports') loadReports();
              else if (activeTab === 'verifications') loadVerifications();
              else if (activeTab === 'audit') loadAuditLogs();
            }}
            className="btn btn-outline admin-refresh-btn flex items-center gap-2 text-xs font-semibold"
            title="Refresh Data"
          >
            <RefreshCwIcon size={14} className={loadingStats || usersLoading || reportsLoading || verificationsLoading || auditLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-nav-tabs flex items-center gap-2 overflow-x-auto mt-6 pt-4 border-t">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`admin-tab-btn px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'overview' ? 'active' : ''
            }`}
          >
            <GlobeIcon size={14} />
            <span>Platform Overview</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('users'); setUsersPage(1); }}
            className={`admin-tab-btn px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'users' ? 'active' : ''
            }`}
          >
            <UsersIcon size={14} />
            <span>User Management</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`admin-tab-btn px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'reports' ? 'active' : ''
            }`}
          >
            <FlagIcon size={14} />
            <span>Moderation Reports</span>
            {stats?.pendingReports > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">
                {stats.pendingReports}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verifications')}
            className={`admin-tab-btn px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'verifications' ? 'active' : ''
            }`}
          >
            <BadgeCheckIcon size={14} />
            <span>Verification Requests</span>
            {stats?.pendingVerifications > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500 text-white font-bold">
                {stats.pendingVerifications}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`admin-tab-btn px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'audit' ? 'active' : ''
            }`}
          >
            <FileTextIcon size={14} />
            <span>Security Audit Logs</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Platform Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="admin-stat-card p-4 rounded-2xl">
              <div className="flex items-center justify-between admin-stat-title mb-2">
                <span className="text-xs font-bold">Total Users</span>
                <UsersIcon size={16} className="text-indigo-400" />
              </div>
              <div className="admin-stat-value text-2xl font-black">{stats?.totalUsers || 0}</div>
              <div className="admin-stat-sub text-[11px] mt-1">Platform-wide</div>
            </div>

            <div className="admin-stat-card p-4 rounded-2xl">
              <div className="flex items-center justify-between admin-stat-title mb-2">
                <span className="text-xs font-bold">Total Posts</span>
                <FileTextIcon size={16} className="text-emerald-400" />
              </div>
              <div className="admin-stat-value text-2xl font-black">{stats?.totalPosts || 0}</div>
              <div className="admin-stat-sub text-[11px] mt-1">Active feed items</div>
            </div>

            <div className="admin-stat-card p-4 rounded-2xl">
              <div className="flex items-center justify-between admin-stat-title mb-2">
                <span className="text-xs font-bold">Reels & Clips</span>
                <FilmIcon size={16} className="text-pink-400" />
              </div>
              <div className="admin-stat-value text-2xl font-black">{stats?.totalReels || 0}</div>
              <div className="admin-stat-sub text-[11px] mt-1">Vertical media</div>
            </div>

            <div className="admin-stat-card p-4 rounded-2xl">
              <div className="flex items-center justify-between admin-stat-title mb-2">
                <span className="text-xs font-bold">Communities</span>
                <GlobeIcon size={16} className="text-amber-400" />
              </div>
              <div className="admin-stat-value text-2xl font-black">{stats?.totalCommunities || 0}</div>
              <div className="admin-stat-sub text-[11px] mt-1">Interest groups</div>
            </div>

            <div className="admin-stat-card p-4 rounded-2xl">
              <div className="flex items-center justify-between admin-stat-title mb-2">
                <span className="text-xs font-bold">Open Reports</span>
                <FlagIcon size={16} className="text-red-400" />
              </div>
              <div className="admin-stat-value text-2xl font-black" style={{ color: '#ef4444' }}>
                {stats?.pendingReports || 0}
              </div>
              <div className="admin-stat-sub text-[11px] mt-1">Needs review</div>
            </div>

            <div className="admin-stat-card p-4 rounded-2xl">
              <div className="flex items-center justify-between admin-stat-title mb-2">
                <span className="text-xs font-bold">Verifications</span>
                <BadgeCheckIcon size={16} className="text-sky-400" />
              </div>
              <div className="admin-stat-value text-2xl font-black" style={{ color: '#38bdf8' }}>
                {stats?.pendingVerifications || 0}
              </div>
              <div className="admin-stat-sub text-[11px] mt-1">Pending approval</div>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="admin-card p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-main mb-3 flex items-center gap-2">
                <FlagIcon size={16} className="text-red-400" />
                <span>Pending Community Reports</span>
              </h3>
              {stats?.pendingReports > 0 ? (
                <div
                  className="p-4 rounded-xl flex items-center justify-between"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  <div className="text-xs">
                    <p className="font-bold text-main">{stats.pendingReports} reports await administrator resolution.</p>
                    <p className="text-secondary mt-0.5">Protect community safety from harassment or violations.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className="btn btn-sm btn-primary"
                    style={{ background: '#ef4444', borderColor: '#ef4444' }}
                  >
                    Review Now
                  </button>
                </div>
              ) : (
                <p className="text-xs text-secondary">No unresolved moderation reports at this time. All clear!</p>
              )}
            </div>

            <div className="admin-card p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-main mb-3 flex items-center gap-2">
                <BadgeCheckIcon size={16} className="text-sky-400" />
                <span>Pending Creator Verifications</span>
              </h3>
              {stats?.pendingVerifications > 0 ? (
                <div
                  className="p-4 rounded-xl flex items-center justify-between"
                  style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                >
                  <div className="text-xs">
                    <p className="font-bold text-main">{stats.pendingVerifications} verification requests submitted.</p>
                    <p className="text-secondary mt-0.5">Review and grant official verified blue badges.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('verifications')}
                    className="btn btn-sm btn-primary"
                    style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}
                  >
                    Review Requests
                  </button>
                </div>
              ) : (
                <p className="text-xs text-secondary">No pending verification applications at this time.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="admin-filter-bar p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearchUsersSubmit} className="relative w-full md:w-80">
              <SearchIcon size={16} className="absolute left-3 top-3 text-muted" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search username or email..."
                className="admin-search-input w-full pl-9 pr-4 py-2 rounded-xl text-xs"
              />
            </form>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={userRoleFilter}
                onChange={(e) => { setUserRoleFilter(e.target.value); setUsersPage(1); }}
                className="admin-filter-select px-3 py-2 rounded-xl text-xs"
              >
                <option value="">All Roles</option>
                <option value="admin">Admins</option>
                <option value="moderator">Moderators</option>
                <option value="user">Standard Users</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => { setUserStatusFilter(e.target.value); setUsersPage(1); }}
                className="admin-filter-select px-3 py-2 rounded-xl text-xs"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="admin-table-container overflow-x-auto rounded-2xl shadow-xl">
            {usersLoading ? (
              <div className="py-16 text-center text-secondary">
                <div className="spinner mx-auto mb-2" />
                <p className="text-xs">Loading user registry...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center text-secondary text-xs">
                No users matched the search criteria.
              </div>
            ) : (
              <table className="admin-table w-full text-left text-xs">
                <thead>
                  <tr className="admin-tr-head">
                    <th className="admin-th py-3 px-4">User</th>
                    <th className="admin-th py-3 px-4">Role</th>
                    <th className="admin-th py-3 px-4">Verification</th>
                    <th className="admin-th py-3 px-4">Status</th>
                    <th className="admin-th py-3 px-4">Joined</th>
                    <th className="admin-th py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                  {users.map((u) => {
                    const isBusy = actionLoadingId === u._id;
                    return (
                      <tr key={u._id} className="admin-tr hover:bg-hover transition">
                        {/* User Identity */}
                        <td className="admin-td py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={getAvatarUrl(u)}
                              alt={u.fullName}
                              className="w-8 h-8 rounded-full object-cover border"
                              style={{ borderColor: 'var(--border-color)' }}
                            />
                            <div>
                              <div className="admin-user-name font-bold text-main flex items-center gap-1">
                                <span>{u.fullName}</span>
                                <VerifiedBadge isVerified={u.isVerified} size={13} />
                              </div>
                              <div className="admin-user-meta text-[11px] text-secondary">
                                @{u.username} • {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role selection */}
                        <td className="admin-td py-3 px-4">
                          <select
                            disabled={isBusy || u._id === user?._id}
                            value={u.role || 'user'}
                            onChange={(e) => handleChangeUserRole(u, e.target.value)}
                            className="admin-filter-select px-2 py-1 rounded-lg text-[11px]"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>

                        {/* Verification Status */}
                        <td className="admin-td py-3 px-4">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleUserVerification(u)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 transition ${
                              u.isVerified
                                ? 'bg-sky-500/15 text-sky-400 border-sky-500/40'
                                : 'text-secondary border-current opacity-70 hover:opacity-100'
                            }`}
                            title="Click to toggle verified badge"
                          >
                            <BadgeCheckIcon size={12} />
                            <span>{u.isVerified ? 'Verified' : 'Unverified'}</span>
                          </button>
                        </td>

                        {/* Status / Suspension */}
                        <td className="admin-td py-3 px-4">
                          {u.isSuspended ? (
                            <span
                              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 inline-flex items-center gap-1"
                              title={`Suspended: ${u.suspendedReason || 'No reason specified'}`}
                            >
                              <BanIcon size={11} />
                              <span>Suspended</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckIcon size={11} />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="admin-td py-3 px-4 text-secondary text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="admin-td py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={isBusy || u._id === user?._id}
                            onClick={() => handleToggleUserSuspension(u)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                              u.isSuspended
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                                : 'bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25'
                            }`}
                          >
                            {u.isSuspended ? 'Lift Suspension' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Moderation Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {['pending', 'investigating', 'resolved', 'dismissed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setReportStatusFilter(st)}
                className={`admin-sub-btn px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                  reportStatusFilter === st ? 'active' : ''
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="admin-card rounded-2xl p-4 shadow-xl">
            {reportsLoading ? (
              <div className="py-16 text-center text-secondary text-xs">
                <div className="spinner mx-auto mb-2" />
                <p>Loading reported incidents...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="py-12 text-center text-secondary text-xs">
                No reports found in "{reportStatusFilter}" category.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => {
                  const isBusy = actionLoadingId === r._id;
                  return (
                    <div
                      key={r._id}
                      className="admin-item-box p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                            {r.reason}
                          </span>
                          <span className="text-secondary">
                            Target: <strong className="text-main capitalize">{r.targetType}</strong>
                          </span>
                          <span className="text-muted">• {formatRelativeTime(r.createdAt)}</span>
                        </div>

                        {r.details && (
                          <p className="admin-quote-box p-2 rounded-lg italic mt-1 text-secondary">
                            "{r.details}"
                          </p>
                        )}

                        <div className="text-[11px] text-secondary flex items-center gap-2 mt-1">
                          <span>
                            Reported by: <strong className="text-main">@{r.reporter?.username || 'user'}</strong>
                          </span>
                          {r.targetPost && (
                            <span>
                              Post: <span className="text-main font-medium">"{r.targetPost.content?.slice(0, 45)}..."</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {r.targetType === 'post' && r.targetPost && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteReportedPost(r.targetPost._id || r.targetPost, r._id)}
                            className="btn btn-sm btn-outline flex items-center gap-1 text-red-400"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}
                          >
                            <TrashIcon size={12} />
                            <span>Delete Post</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleResolveReport(r._id, 'resolved', 'Reviewed and handled')}
                          className="btn btn-sm btn-primary"
                          style={{ background: '#10b981', borderColor: '#10b981' }}
                        >
                          Resolve
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleResolveReport(r._id, 'dismissed', 'Not a violation')}
                          className="btn btn-sm btn-outline"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Verification Requests */}
      {activeTab === 'verifications' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {['pending', 'approved', 'rejected'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setVerificationStatusFilter(st)}
                className={`admin-sub-btn px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                  verificationStatusFilter === st ? 'active' : ''
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="admin-card rounded-2xl p-4 shadow-xl">
            {verificationsLoading ? (
              <div className="py-16 text-center text-secondary text-xs">
                <div className="spinner mx-auto mb-2" />
                <p>Loading verification applications...</p>
              </div>
            ) : verifications.length === 0 ? (
              <div className="py-12 text-center text-secondary text-xs">
                No verification requests in "{verificationStatusFilter}" category.
              </div>
            ) : (
              <div className="space-y-4">
                {verifications.map((v) => {
                  const applicant = v.user || {};
                  const isBusy = actionLoadingId === v._id;

                  return (
                    <div
                      key={v._id}
                      className="admin-verif-item p-5 rounded-xl flex flex-col md:flex-row items-start justify-between gap-4"
                    >
                      <div className="space-y-2 text-xs flex-1">
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatarUrl(applicant)}
                            alt={applicant.fullName}
                            className="w-10 h-10 rounded-full object-cover border"
                            style={{ borderColor: 'var(--border-color)' }}
                          />
                          <div>
                            <div className="font-bold text-main text-sm flex items-center gap-1.5">
                              <span>{applicant.fullName || 'User'}</span>
                              <span className="text-secondary font-normal">@{applicant.username}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                {v.category}
                              </span>
                            </div>
                            <div className="text-muted text-[11px]">
                              Submitted {formatRelativeTime(v.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* Reason / Statement */}
                        <div className="admin-quote-box mt-2 p-3 rounded-xl">
                          <p className="font-bold text-main mb-1">Reason for request:</p>
                          <p className="text-secondary leading-relaxed">{v.reason}</p>
                        </div>

                        {/* Document links */}
                        {v.documentUrl && (
                          <div className="text-[11px] text-secondary">
                            Evidence link:{' '}
                            <a
                              href={v.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary font-semibold underline"
                            >
                              {v.documentUrl}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Approval buttons */}
                      {v.status === 'pending' && (
                        <div className="flex items-center gap-2 shrink-0 md:self-center">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleReviewVerification(v._id, 'approved')}
                            className="btn btn-sm btn-primary flex items-center gap-1.5"
                            style={{ background: '#0284c7', borderColor: '#0284c7' }}
                          >
                            <BadgeCheckIcon size={14} />
                            <span>Approve & Grant Badge</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleReviewVerification(v._id, 'rejected')}
                            className="btn btn-sm btn-outline text-red-400"
                            style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Security Audit Logs */}
      {activeTab === 'audit' && (
        <div className="admin-card rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="text-xs font-bold text-main uppercase tracking-wider">
              System Audit Trail
            </h3>
            <span className="text-[11px] text-secondary">Immutable record of security & administrative actions</span>
          </div>

          {auditLoading ? (
            <div className="py-16 text-center text-secondary text-xs">
              <div className="spinner mx-auto mb-2" />
              <p>Loading security audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-secondary text-xs">
              No audit records registered yet.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {auditLogs.map((log) => (
                <div key={log._id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-hover text-primary border" style={{ borderColor: 'var(--border-color)' }}>
                        {log.action}
                      </span>
                      <span className="text-secondary">
                        Admin: <strong className="text-main">@{log.admin?.username || 'admin'}</strong>
                      </span>
                      <span className="text-muted">• Target: {log.targetType}</span>
                    </div>
                    {log.details && (
                      <p className="text-secondary text-[11px] font-mono mt-0.5">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                      </p>
                    )}
                  </div>

                  <span className="text-[11px] text-muted shrink-0">
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
