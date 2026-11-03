import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiCreateOpportunity } from '../services/api';
import {
  XIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  MapPinIcon,
  ExternalLinkIcon,
  SparklesIcon
} from './Icons';

export const CreateOpportunityModal = ({ isOpen, onClose, onOpportunityCreated }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationWebsite, setOrganizationWebsite] = useState('');
  const [category, setCategory] = useState('job');
  const [workType, setWorkType] = useState('remote');
  const [location, setLocation] = useState('Global');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [benefits, setBenefits] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [applicationLink, setApplicationLink] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Logo file state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file for organization logo.', 'error');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Please enter an opportunity title.', 'error');
      return;
    }
    if (!organizationName.trim()) {
      showToast('Please enter the organization name.', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Please provide a description.', 'error');
      return;
    }
    if (!applicationDeadline) {
      showToast('Please set an application deadline.', 'error');
      return;
    }

    const deadlineDate = new Date(applicationDeadline);
    if (deadlineDate < new Date()) {
      showToast('Application deadline must be a future date.', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('organizationName', organizationName.trim());
      formData.append('organizationWebsite', organizationWebsite.trim());
      formData.append('category', category);
      formData.append('workType', workType);
      formData.append('location', location.trim());
      formData.append('description', description.trim());
      formData.append('requirements', requirements.trim());
      formData.append('benefits', benefits.trim());
      formData.append('applicationDeadline', applicationDeadline);
      formData.append('applicationLink', applicationLink.trim());
      formData.append('contactEmail', contactEmail.trim());
      formData.append('contactPhone', contactPhone.trim());

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const res = await apiCreateOpportunity(formData);

      if (res.success) {
        showToast(res.message, 'success');
        if (onOpportunityCreated) {
          onOpportunityCreated(res.opportunity);
        }
        onClose();
      }
    } catch (err) {
      showToast(err.message || 'Failed to publish opportunity.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isVerifiedPublisher = user?.isVerified || user?.role === 'admin' || user?.role === 'moderator';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card create-opp-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <BriefcaseIcon size={20} className="text-primary" />
            <h3 className="modal-title">Publish Opportunity</h3>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <XIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body create-opp-form">
          {/* Publisher status notice */}
          <div className="opp-publish-notice">
            <SparklesIcon size={16} className="text-primary flex-shrink-0" />
            <span>
              {isVerifiedPublisher
                ? 'Your organization status is verified. This opportunity will be published immediately to the community.'
                : 'Your submission will be reviewed and approved by Connectly administration promptly.'}
            </span>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label required">Opportunity Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Senior Full-Stack Engineer, Summer Tech Internship, Masters Scholarship"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          {/* Org details row */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label required">Organization Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Connectly, Google, African Development Bank"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                maxLength={150}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Website (Optional)</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.com"
                value={organizationWebsite}
                onChange={(e) => setOrganizationWebsite(e.target.value)}
              />
            </div>
          </div>

          {/* Category & Work Type */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label required">Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="job">💼 Job</option>
                <option value="internship">👥 Internship</option>
                <option value="scholarship">🎓 Scholarship</option>
                <option value="training">🏆 Training Program</option>
                <option value="competition">🥇 Competition / Hackathon</option>
                <option value="volunteer">🤝 Volunteer Opportunity</option>
                <option value="workshop">📅 Workshop & Event</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required">Work Type</label>
              <select
                className="form-select"
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
              >
                <option value="remote">🌐 Remote</option>
                <option value="hybrid">🏢 Hybrid</option>
                <option value="on_site">📍 On-Site</option>
              </select>
            </div>
          </div>

          {/* Location & Deadline */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Global, Addis Ababa, Nairobi, London"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Application Deadline</label>
              <input
                type="date"
                className="form-input"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label required">Description & Scope</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Provide a comprehensive summary of this opportunity..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={5000}
            />
          </div>

          {/* Requirements */}
          <div className="form-group">
            <label className="form-label">Requirements & Eligibility</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Key skills, academic requirements, experience level, eligibility criteria..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              maxLength={3000}
            />
          </div>

          {/* Benefits */}
          <div className="form-group">
            <label className="form-label">Benefits, Salary, or Funding</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. $70,000 - $90,000 / yr, Fully Funded Tuition + Monthly Stipend, Certificate"
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              maxLength={2000}
            />
          </div>

          {/* Application link & Contact Email */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Application Link URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://company.com/apply"
                value={applicationLink}
                onChange={(e) => setApplicationLink(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="careers@organization.org"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Organization Logo upload */}
          <div className="form-group">
            <label className="form-label">Organization Logo (Optional)</label>
            <div className="opp-logo-upload-box">
              {logoPreview ? (
                <div className="logo-preview-wrapper">
                  <img src={logoPreview} alt="Logo preview" className="logo-preview-img" />
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview('');
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <BuildingIcon size={16} />
                  <span>Choose Logo File</span>
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoChange}
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Publishing...' : 'Publish Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

