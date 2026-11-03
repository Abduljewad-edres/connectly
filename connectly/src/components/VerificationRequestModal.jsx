import React, { useState, useEffect } from 'react';
import {
  apiGetVerificationStatus,
  apiApplyVerification
} from '../services/api';
import {
  XIcon,
  BadgeCheckIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckIcon
} from './Icons';

const CATEGORIES = [
  { id: 'creator', label: 'Content Creator / Artist' },
  { id: 'developer', label: 'Developer / Engineer' },
  { id: 'business', label: 'Business / Organization' },
  { id: 'public_figure', label: 'Public Figure' },
  { id: 'journalist', label: 'Journalist / Media' },
  { id: 'other', label: 'Other Notable Entity' }
];

const VerificationRequestModal = ({ isOpen, onClose, onVerifiedSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [category, setCategory] = useState('creator');
  const [reason, setReason] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiGetVerificationStatus();
      if (res.success) {
        setStatusData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason explaining why you are applying for verification.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await apiApplyVerification({
        category,
        reason: reason.trim(),
        documentUrl: documentUrl.trim()
      });

      if (res.success) {
        setSuccessMsg('Your verification request has been successfully submitted to the moderation team!');
        await loadStatus();
        if (onVerifiedSuccess) onVerifiedSuccess();
      }
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card verification-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-verification-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrapper flex items-center gap-2">
            <BadgeCheckIcon size={24} className="text-sky-400 shrink-0" />
            <h3 id="modal-verification-title" className="modal-title font-bold">
              Connectly Verification
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            title="Close"
            aria-label="Close"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body verification-modal-body">
          {loading ? (
            <div className="p-8 text-center text-secondary flex flex-col items-center justify-center gap-3">
              <div className="spinner mx-auto" />
              <p className="text-sm font-medium">Checking account eligibility...</p>
            </div>
          ) : (
            <div>
              {error && (
                <div className="alert alert-danger flex items-center gap-2 mb-4">
                  <XIcon size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="alert alert-success flex items-center gap-2 mb-4" style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <CheckIcon size={16} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Case 1: Already Verified */}
              {statusData?.isVerified ? (
                <div className="text-center py-6 px-4">
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem'
                    }}
                  >
                    <BadgeCheckIcon size={36} />
                  </div>
                  <h4 className="text-lg font-bold text-main mb-2">
                    Your Account is Verified!
                  </h4>
                  <p className="text-secondary text-sm max-w-sm mx-auto mb-6">
                    You have the official blue checkmark badge on Connectly. Your identity has been authenticated as a trusted creator or entity.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-primary"
                  >
                    Done
                  </button>
                </div>
              ) : statusData?.status === 'pending' ? (
                /* Case 2: Pending Application */
                <div className="text-center py-6 px-4">
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem',
                      color: '#f59e0b'
                    }}
                  >
                    <ClockIcon size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-main mb-1">
                    Application Under Review
                  </h4>
                  <p className="text-secondary text-sm max-w-sm mx-auto mb-4">
                    We have received your verification application. Our moderation team reviews applications within 24 to 48 hours.
                  </p>
                  {statusData?.request && (
                    <div
                      className="p-3 rounded-xl text-left text-xs space-y-1.5 mb-6"
                      style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                    >
                      <div>
                        <span className="text-muted">Category:</span>{' '}
                        <span className="capitalize font-semibold text-main">
                          {statusData.request.category}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted">Submitted:</span>{' '}
                        <span className="text-main">{new Date(statusData.request.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-muted">Status:</span>{' '}
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-500 border border-amber-500/40 font-bold uppercase">
                          Pending Admin Review
                        </span>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-outline"
                  >
                    Close
                  </button>
                </div>
              ) : (
                /* Case 3: Can Apply */
                <div>
                  {statusData?.status === 'rejected' && (
                    <div className="alert alert-danger mb-4">
                      <p className="font-bold mb-1">Previous Application Note:</p>
                      <p className="text-xs">
                        {statusData?.request?.reviewerNote || 'Your profile did not fulfill the criteria at the time of review. You can re-apply below with updated links.'}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-secondary mb-4 leading-relaxed">
                    The verified badge confirms authentic accounts of creators, notable brands, and public figures on Connectly. Fill out the application below to submit your profile for admin review.
                  </p>

                  <form onSubmit={handleSubmit} className="verification-form space-y-4">
                    {/* Category Selection */}
                    <div className="form-group mb-3">
                      <label className="verification-label block text-xs font-bold text-main mb-1.5">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="verification-input-control w-full px-3 py-2 rounded-xl text-sm"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Reason */}
                    <div className="form-group mb-3">
                      <label className="verification-label block text-xs font-bold text-main mb-1.5">
                        Why should your account be verified? *
                      </label>
                      <textarea
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Explain your work, public reach, projects, brand, or notable identity..."
                        className="verification-input-control w-full px-3 py-2 rounded-xl text-sm resize-none"
                        required
                      />
                    </div>

                    {/* Supporting Evidence / Links */}
                    <div className="form-group mb-3">
                      <label className="verification-label block text-xs font-bold text-main mb-1.5">
                        Evidence / Official Links (Optional)
                      </label>
                      <input
                        type="url"
                        value={documentUrl}
                        onChange={(e) => setDocumentUrl(e.target.value)}
                        placeholder="https://github.com/yourname or your website"
                        className="verification-input-control w-full px-3 py-2 rounded-xl text-sm"
                      />
                      <span className="text-[11px] text-muted mt-1 block">
                        Add a link to your public profile, portfolio, or official media coverage.
                      </span>
                    </div>

                    {/* Terms notice */}
                    <div
                      className="p-3 rounded-xl text-[11px] flex items-start gap-2 mb-4"
                      style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      <ShieldCheckIcon size={16} className="text-primary mt-0.5 shrink-0" />
                      <span>
                        Connectly reviews applications in accordance with community guidelines. Impersonation or fraudulent information leads to account suspension.
                      </span>
                    </div>

                    {/* Actions: High Contrast Cancel and Submit Buttons */}
                    <div className="modal-actions flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-outline verification-cancel-btn"
                        style={{ minWidth: '90px', fontWeight: 600 }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn btn-primary verification-submit-btn"
                        style={{ minWidth: '140px', fontWeight: 600 }}
                      >
                        {submitting ? 'Submitting...' : 'Submit Request'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationRequestModal;
