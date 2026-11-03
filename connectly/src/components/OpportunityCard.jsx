import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { apiToggleSaveOpportunity } from '../services/api';
import VerifiedBadge from './VerifiedBadge';
import {
  BriefcaseIcon,
  MapPinIcon,
  CalendarIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  BuildingIcon,
  GraduationCapIcon,
  AwardIcon,
  UsersIcon,
  ClockIcon,
  MoreVerticalIcon,
  TrashIcon,
  FlagIcon
} from './Icons';

// Category color and icon mapping
export const CATEGORY_CONFIG = {
  job: { label: 'Job', color: 'cat-job', icon: BriefcaseIcon },
  internship: { label: 'Internship', color: 'cat-internship', icon: UsersIcon },
  scholarship: { label: 'Scholarship', color: 'cat-scholarship', icon: GraduationCapIcon },
  training: { label: 'Training', color: 'cat-training', icon: AwardIcon },
  competition: { label: 'Competition', color: 'cat-competition', icon: AwardIcon },
  volunteer: { label: 'Volunteer', color: 'cat-volunteer', icon: UsersIcon },
  workshop: { label: 'Workshop & Event', color: 'cat-workshop', icon: CalendarIcon }
};

export const OpportunityCard = ({
  opportunity,
  onViewDetails,
  onDeleteOpportunity,
  onReportOpportunity
}) => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [isSaved, setIsSaved] = useState(opportunity.isSaved || false);
  const [savedCount, setSavedCount] = useState(opportunity.savedCount || 0);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isOwner = user && opportunity.publisher && (
    user._id === (opportunity.publisher._id || opportunity.publisher) ||
    user.role === 'admin'
  );

  const catConfig = CATEGORY_CONFIG[opportunity.category] || CATEGORY_CONFIG.job;
  const CategoryIcon = catConfig.icon;

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (saveLoading) return;

    const prevSaved = isSaved;
    const prevCount = savedCount;
    setIsSaved(!prevSaved);
    setSavedCount(prevSaved ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      setSaveLoading(true);
      const res = await apiToggleSaveOpportunity(opportunity._id);
      if (res.success) {
        setIsSaved(res.isSaved);
        setSavedCount(res.savedCount);
        showToast(res.message, 'info');
      }
    } catch (err) {
      setIsSaved(prevSaved);
      setSavedCount(prevCount);
      showToast(err.message || 'Failed to update saved status.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const getDeadlineBadge = () => {
    if (opportunity.isExpired) {
      return <span className="deadline-badge expired">⚠️ Expired</span>;
    }
    const days = opportunity.daysRemaining;
    if (days <= 0) {
      return <span className="deadline-badge urgent">⏱️ Closes today</span>;
    }
    if (days <= 7) {
      return <span className="deadline-badge urgent">⚡ {days} {days === 1 ? 'day' : 'days'} left</span>;
    }
    if (days <= 14) {
      return <span className="deadline-badge warning">⏳ {days} days left</span>;
    }
    return <span className="deadline-badge normal">📅 {days} days left</span>;
  };

  const getWorkTypeBadge = () => {
    const type = opportunity.workType;
    if (type === 'remote') return <span className="worktype-pill remote">🌐 Remote</span>;
    if (type === 'hybrid') return <span className="worktype-pill hybrid">🏢 Hybrid</span>;
    return <span className="worktype-pill onsite">📍 On-Site</span>;
  };

  const deadlineFormatted = new Date(opportunity.applicationDeadline).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <article
      className={`card opportunity-card ${opportunity.isFeatured ? 'featured' : ''} ${opportunity.isExpired ? 'expired-card' : ''}`}
      onClick={() => onViewDetails && onViewDetails(opportunity)}
    >
      {/* Card Header: Org Info + Badges */}
      <div className="opp-card-header">
        <div className="opp-org-info">
          {opportunity.organizationLogo ? (
            <img
              src={opportunity.organizationLogo}
              alt={opportunity.organizationName}
              className="opp-org-logo"
            />
          ) : (
            <div className="opp-org-logo-placeholder">
              <BuildingIcon size={20} />
            </div>
          )}

          <div className="opp-org-text">
            <div className="opp-org-name-row">
              <span className="opp-org-name">{opportunity.organizationName}</span>
              <VerifiedBadge
                isVerified={opportunity.publisher?.isVerified || opportunity.publisher?.role === 'admin'}
                size={14}
              />
            </div>
            <div className="opp-meta-sub">
              <span className="opp-location">
                <MapPinIcon size={12} />
                <span>{opportunity.location || 'Global'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="opp-header-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`opp-save-btn ${isSaved ? 'active' : ''}`}
            onClick={handleSaveToggle}
            title={isSaved ? 'Remove from saved' : 'Save opportunity'}
            aria-label="Save opportunity"
          >
            <BookmarkIcon size={18} filled={isSaved} />
          </button>

          <div className="relative-container">
            <button
              type="button"
              className="btn-icon opp-menu-btn"
              onClick={() => setShowMenu((prev) => !prev)}
              title="More options"
            >
              <MoreVerticalIcon size={17} />
            </button>

            {showMenu && (
              <div className="post-dropdown-menu">
                {isOwner && (
                  <button
                    className="dropdown-item text-danger"
                    onClick={() => {
                      setShowMenu(false);
                      if (onDeleteOpportunity) onDeleteOpportunity(opportunity._id);
                    }}
                  >
                    <TrashIcon size={15} />
                    <span>Delete Opportunity</span>
                  </button>
                )}
                <button
                  className="dropdown-item text-warning"
                  onClick={() => {
                    setShowMenu(false);
                    if (onReportOpportunity) onReportOpportunity(opportunity);
                  }}
                >
                  <FlagIcon size={15} />
                  <span>Report Opportunity</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Opportunity Title */}
      <h3 className="opp-title">{opportunity.title}</h3>

      {/* Tags row */}
      <div className="opp-tags-row">
        <span className={`opp-cat-pill ${catConfig.color}`}>
          <CategoryIcon size={12} />
          <span>{catConfig.label}</span>
        </span>
        {getWorkTypeBadge()}
        {getDeadlineBadge()}
      </div>

      {/* Description Snippet */}
      <p className="opp-snippet">
        {opportunity.description.slice(0, 160)}
        {opportunity.description.length > 160 ? '...' : ''}
      </p>

      {/* Benefits / Compensation Preview */}
      {opportunity.benefits && (
        <div className="opp-benefits-preview">
          <span className="benefits-label">Benefits:</span>
          <span className="benefits-text">{opportunity.benefits.slice(0, 80)}</span>
        </div>
      )}

      {/* Card Footer */}
      <div className="opp-card-footer" onClick={(e) => e.stopPropagation()}>
        <span className="opp-deadline-text">
          <ClockIcon size={13} />
          <span>Deadline: {deadlineFormatted}</span>
        </span>

        <div className="opp-footer-btns">
          <button
            type="button"
            className="btn btn-sm btn-outline opp-details-btn"
            onClick={() => onViewDetails && onViewDetails(opportunity)}
          >
            Details
          </button>

          {(opportunity.applicationLink || opportunity.contactEmail) && !opportunity.isExpired && (
            <a
              href={
                opportunity.applicationLink?.startsWith('http')
                  ? opportunity.applicationLink
                  : opportunity.contactEmail
                    ? `mailto:${opportunity.contactEmail}`
                    : '#'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-primary opp-apply-btn"
              onClick={(e) => e.stopPropagation()}
            >
              <span>Apply</span>
              <ExternalLinkIcon size={13} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

