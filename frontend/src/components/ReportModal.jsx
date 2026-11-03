import React, { useState } from 'react';
import { apiReportPost } from '../services/api';
import { useToast } from '../context/ToastContext';
import { XIcon, FlagIcon, CheckIcon } from './Icons';

export const ReportModal = ({ isOpen, post, onClose, onPostReported }) => {
  const { showToast } = useToast();

  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !post) return null;

  const reportReasons = [
    { id: 'spam', label: 'Spam or commercial advertisement', desc: 'Misleading links, scams, or repetitive promotional content' },
    { id: 'harassment', label: 'Harassment or personal attack', desc: 'Targeting an individual with hostile, bullying, or abusive content' },
    { id: 'hate_speech', label: 'Hate speech or discrimination', desc: 'Attacking protected groups, slurs, or promoting hatred' },
    { id: 'inappropriate_media', label: 'Inappropriate or adult content', desc: 'Explicit imagery, sexual content, or graphic material' },
    { id: 'violence', label: 'Violence or dangerous acts', desc: 'Threats of violence, self-harm, or dangerous activities' },
    { id: 'misinformation', label: 'Misinformation or fake news', desc: 'Demonstrably false claims intended to deceive' },
    { id: 'other', label: 'Other issue', desc: 'Something else not covered by the above categories' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiReportPost(post._id, {
        reason,
        description: description.trim()
      });

      if (res.success) {
        setSubmitted(true);
        showToast('Report submitted. We will review this post promptly.', 'info');
        setTimeout(() => {
          if (onPostReported) onPostReported(post._id);
          onClose();
        }, 1200);
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit report.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card report-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <FlagIcon size={18} className="text-danger" />
            <h3 className="modal-title">Report Post</h3>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close">
            <XIcon size={20} />
          </button>
        </div>

        {submitted ? (
          <div className="modal-body text-center py-8">
            <div className="report-success-icon">
              <CheckIcon size={36} />
            </div>
            <h4>Thank You for Your Report</h4>
            <p className="text-muted text-sm mt-2">
              Our safety and moderation team has been notified. This post has been hidden from your feed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="modal-body">
              <p className="report-intro-text">
                Why are you reporting this post by <strong>@{post.author?.username || 'user'}</strong>?
              </p>

              <div className="report-reasons-list">
                {reportReasons.map((r) => (
                  <label
                    key={r.id}
                    className={`report-reason-item ${reason === r.id ? 'active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={reason === r.id}
                      onChange={() => setReason(r.id)}
                    />
                    <div className="report-reason-meta">
                      <span className="report-reason-label">{r.label}</span>
                      <span className="report-reason-desc">{r.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="form-group mt-3">
                <label className="form-label text-sm">
                  Additional Details <span className="text-muted">(Optional)</span>
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  maxLength={500}
                  placeholder="Provide any additional context to help our moderators..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

