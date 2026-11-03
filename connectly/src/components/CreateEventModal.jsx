import React, { useState } from 'react';
import {
  XIcon,
  CalendarIcon,
  MapPinIcon,
  ImageIcon,
  SparklesIcon,
  SendIcon
} from './Icons';

export const CreateEventModal = ({ isOpen, onClose, onEventCreated, initialLocation = {} }) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('community');
  const [organizerName, setOrganizerName] = useState('');
  const [locationType, setLocationType] = useState('in_person');
  const [country, setCountry] = useState(initialLocation.country || '');
  const [city, setCity] = useState(initialLocation.city || '');
  const [venue, setVenue] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setError('Image file exceeds 20MB limit.');
        return;
      }
      setCoverImageFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an event title.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe your event.');
      return;
    }
    if (!startDate) {
      setError('Please specify a start date and time.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('organizerName', organizerName.trim());
      formData.append('locationType', locationType);
      formData.append('startDate', new Date(startDate).toISOString());
      if (endDate) {
        formData.append('endDate', new Date(endDate).toISOString());
      }
      formData.append('description', description.trim());
      if (capacity) {
        formData.append('capacity', capacity);
      }
      if (onlineUrl) {
        formData.append('onlineUrl', onlineUrl.trim());
      }

      const locationObj = {
        country: country.trim(),
        city: city.trim(),
        venue: venue.trim()
      };
      formData.append('location', JSON.stringify(locationObj));

      if (coverImageFile) {
        formData.append('coverImage', coverImageFile);
      }

      await onEventCreated(formData);
      onClose();
    } catch (err) {
      console.error('Create event error:', err);
      setError(err.message || 'Failed to publish event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="event-modal-card">
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={20} className="text-primary" />
              Schedule a Community or Cultural Event
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Connect people in your city, diaspora, or worldwide.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-page)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Addis Tech Innovators Meetup / Cultural Music Night"
              style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', color: 'var(--text-main)', outline: 'none' }}
            />
          </div>

          {/* Category & Location Type Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', color: 'var(--text-main)', outline: 'none', textTransform: 'capitalize' }}
              >
                <option value="cultural">Cultural & Heritage</option>
                <option value="tech">Technology & Startups</option>
                <option value="academic">Academic & Science</option>
                <option value="community">Community Gathering</option>
                <option value="arts">Arts & Music</option>
                <option value="sports">Sports & Wellness</option>
                <option value="business">Business & Trade</option>
                <option value="networking">Professional Networking</option>
                <option value="other">Other Event</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Location Format
              </label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', color: 'var(--text-main)', outline: 'none' }}
              >
                <option value="in_person">In-Person Only</option>
                <option value="online">Online / Virtual</option>
                <option value="hybrid">Hybrid (Both)</option>
              </select>
            </div>
          </div>

          {/* Location Fields (if in_person or hybrid) */}
          {locationType !== 'online' && (
            <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPinIcon size={14} /> Physical Venue & City
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country (e.g. Ethiopia, UAE, USA)"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-main)', outline: 'none' }}
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City (e.g. Addis Ababa, Dubai, London)"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Venue / Landmark (e.g., Millennium Hall / Silicon Hub 3rd Floor)"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>
          )}

          {/* Online Link (if online or hybrid) */}
          {locationType !== 'in_person' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Virtual Meeting Link / Livestream URL
              </label>
              <input
                type="url"
                value={onlineUrl}
                onChange={(e) => setOnlineUrl(e.target.value)}
                placeholder="https://meet.google.com/... or Zoom link"
                style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.85rem', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>
          )}

          {/* Dates & Times */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.82rem', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                End Date & Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem', fontSize: '0.82rem', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>
          </div>

          {/* Cover Image Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Event Banner / Cover Image (Optional)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ cursor: 'pointer', padding: '0.55rem 1rem', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ImageIcon size={16} className="text-primary" /> Choose Banner
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
              {coverPreview && (
                <div style={{ position: 'relative', width: '64px', height: '40px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--primary)' }}>
                  <img src={coverPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageFile(null);
                      setCoverPreview('');
                    }}
                    style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Event Description & Agenda *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell guests what to expect, who should attend, and any preparation..."
              style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-main)', outline: 'none', lineHeight: '1.5' }}
            />
          </div>

          {/* Submit Action */}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-md"
              style={{ fontWeight: 800 }}
            >
              {loading ? 'Publishing Event...' : 'Publish Event'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

