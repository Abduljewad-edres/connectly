import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { apiToggleSaveOpportunity } from '../services/api';
import VerifiedBadge from './VerifiedBadge';
import { CATEGORY_CONFIG } from './OpportunityCard';
import {
  XIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  BuildingIcon,
  FlagIcon,
  Share2Icon,
  GlobeIcon
} from './Icons';

export const OpportunityDetailModal = ({
  isOpen,
  opportunity,
  onClose,
  onReportClick
}) => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [isSaved, setIsSaved] = useState(opportunity?.isSaved || false);
  const [saveLoading, setSaveLoading] = useState(false);

  if (!isOpen || !opportunity) return null;

  const catConfig = CATEGORY_CONFIG[opportunity.category] || CATEGORY_CONFIG.job;
  const CategoryIcon = catConfig.icon;

  const handleSaveToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (saveLoading) return;

    try {
      setSaveLoading(true);
      const res = await apiToggleSaveOpportunity(opportunity._id);
      if (res.success) {
        setIsSaved(res.isSaved);
        showToast(res.message, 'info');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update saved status.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Opportunity link copied to clipboard! 📋', 'success');
    } catch (err) {
      showToast('Failed to copy link.', 'error');
    }
  };

  const deadlineFormatted = new Date(opportunity.applicationDeadline).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const applyUrl = opportunity.applicationLink?.startsWith('http')
    ? opportunity.applicationLink
    : opportunity.contactEmail
      ? `mailto:${opportunity.contactEmail}?subject=Application for ${encodeURIComponent(opportunity.title)}`
      : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card opp-detail-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header opp-detail-header">
          <div className="opp-detail-brand">
            {opportunity.organizationLogo ? (
              <img
                src={opportunity.organizationLogo}
                alt={opportunity.organizationName}
                className="opp-detail-logo"
              />
            ) : (
              <div className="opp-detail-logo-placeholder">
                <BuildingIcon size={26} />
              </div>
            )}
            <div className="opp-detail-titles">
              <div className="flex items-center gap-1">
                <span className="opp-detail-org">{opportunity.organizationName}</span>
                <VerifiedBadge
                  isVerified={opportunity.publisher?.isVerified || opportunity.publisher?.role === 'admin'}
                  size={15}
                />
              </div>
              <h2 className="opp-detail-title">{opportunity.title}</h2>
            </div>
          </div>

          <div className="opp-detail-header-actions">
            <button
              type="button"
              className="btn-icon"
              onClick={handleShare}
              title="Share Opportunity Link"
            >
              <Share2Icon size={18} />
            </button>
            <button
              type="button"
              className={`btn-icon ${isSaved ? 'text-primary' : ''}`}
              onClick={handleSaveToggle}
              title={isSaved ? 'Remove from Saved' : 'Save Opportunity'}
            >
              <BookmarkIcon size={18} filled={isSaved} />
            </button>
            <button
              type="button"
              className="btn-icon text-warning"
              onClick={() => onReportClick && onReportClick(opportunity)}
              title="Report suspicious opportunity"
            >
              <FlagIcon size={18} />
            </button>
            <button className="btn-icon" onClick={onClose} aria-label="Close modal">
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body opp-detail-body">
          {/* Quick Stats Grid */}
          <div className="opp-quick-stats-grid">
            <div className="opp-stat-box">
              <span className="opp-stat-label">Category</span>
              <span className="opp-stat-val text-primary">
                <CategoryIcon size={14} className="inline-icon" />
                <span>{catConfig.label}</span>
              </span>
            </div>

            <div className="opp-stat-box">
              <span className="opp-stat-label">Work Type</span>
              <span className="opp-stat-val">
                {opportunity.workType === 'remote'
                  ? '🌐 Remote'
                  : opportunity.workType === 'hybrid'
                    ? '🏢 Hybrid'
                    : '📍 On-Site'}
              </span>
            </div>

            <div className="opp-stat-box">
              <span className="opp-stat-label">Location</span>
              <span className="opp-stat-val">
                <MapPinIcon size={13} className="inline-icon text-muted" />
                <span>{opportunity.location || 'Global'}</span>
              </span>
            </div>

            <div className="opp-stat-box">
              <span className="opp-stat-label">Deadline</span>
              <span className={`opp-stat-val ${opportunity.isExpired ? 'text-danger' : 'text-warning'}`}>
                <ClockIcon size={13} className="inline-icon" />
                <span>{opportunity.isExpired ? 'Expired' : `${opportunity.daysRemaining} days left`}</span>
              </span>
            </div>
          </div>

          {/* Description Section */}
          <div className="opp-detail-section">
            <h4 className="opp-section-title">About the Opportunity</h4>
            <div className="opp-detail-text">
              {opportunity.description.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          {/* Requirements Section */}
          {opportunity.requirements && (
            <div className="opp-detail-section">
              <h4 className="opp-section-title">Requirements & Qualifications</h4>
              <div className="opp-detail-text">
                {opportunity.requirements.split('\n').map((req, i) => (
                  <p key={i}>{req}</p>
                ))}
              </div>
            </div>
          )}

          {/* Benefits Section */}
          {opportunity.benefits && (
            <div className="opp-detail-section">
              <h4 className="opp-section-title">Benefits, Compensation & Funding</h4>
              <div className="opp-detail-text">
                {opportunity.benefits.split('\n').map((ben, i) => (
                  <p key={i}>{ben}</p>
                ))}
              </div>
            </div>
          )}

          {/* Application Info Card */}
          <div className="opp-application-card">
            <div className="opp-app-card-header">
              <CalendarIcon size={18} className="text-primary" />
              <div>
                <strong>Application Deadline</strong>
                <p className="opp-app-deadline">{deadlineFormatted}</p>
              </div>
            </div>

            {opportunity.contactEmail && (
              <p className="opp-contact-line">
                <strong>Contact Email:</strong>{' '}
                <a href={`mailto:${opportunity.contactEmail}`} className="link-text">
                  {opportunity.contactEmail}
                </a>
              </p>
            )}

            {opportunity.organizationWebsite && (
              <p className="opp-contact-line">
                <strong>Website:</strong>{' '}
                <a
                  href={opportunity.organizationWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-text"
                >
                  {opportunity.organizationWebsite}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer opp-detail-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>

          {applyUrl && !opportunity.isExpired && (
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg opp-apply-cta-btn"
            >
              <span>Apply for this Opportunity</span>
              <ExternalLinkIcon size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

